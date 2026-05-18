"""
Tiered Reddit data service with Redis caching and graceful fallback.

Tier routing:
  - free  → RedditRSSClient (no auth, no proxy, lightweight)
  - paid  → RedditJSONClient (with Webshare proxy, full metadata)
  - fallback → original RedditScraperClient (asyncpraw, rate-limited)

All tiers are fronted by a Redis cache (10 min TTL) with fuzzy query matching.
Similar queries like "economy in pakistan" and "pakistan economy" share cache entries.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import HTTPException

from paksentiment_scraper import RedditRSSClient, RedditJSONClient, RedditScraperClient
from paksentiment_scraper.perf_logger import log_perf
from .reddit_cache import RedditCacheService
from .sentiment_classifier import Document, AnalysisModelSentimentClassifier

logger = logging.getLogger(__name__)


class RedditScaledService:
    """
    Production-grade Reddit service supporting free/paid tiers with
    Redis caching, fuzzy query matching, and a multi-source fallback chain.
    """

    def __init__(
        self,
        rss_client: RedditRSSClient,
        json_client: RedditJSONClient,
        api_client: RedditScraperClient,
        cache: RedditCacheService,
        classifier: AnalysisModelSentimentClassifier,
    ):
        self.rss_client = rss_client
        self.json_client = json_client
        self.api_client = api_client
        self.cache = cache
        self.classifier = classifier

    async def search_posts(
        self,
        subreddit: str,
        query: str,
        limit: int = 25,
        tier: str = "free",
    ) -> Dict[str, Any]:
        """
        Fetch Reddit posts using the appropriate tier, with caching.
        Returns a dict with posts, metadata, and cache status.

        Free tier users are ALWAYS routed to RSS, regardless of what
        the caller requests. This enforces the business model.
        """
        # --- Enforce tier restrictions ---
        effective_tier = self._enforce_tier(tier)
        subreddit = subreddit.strip().lower()
        cache_key = RedditCacheService.build_cache_key(subreddit, query, effective_tier)

        # 1. Check cache (exact normalized match first, then fuzzy scan)
        cached = await self.cache.find_similar(subreddit, query, effective_tier)
        if cached is not None:
            # Cached entry is a full response dict
            cached["cached"] = True
            cached["cache_key"] = cache_key
            # Respect the requested limit
            if "posts" in cached:
                cached["posts"] = cached["posts"][:limit]
                cached["count"] = len(cached["posts"])
            return cached

        # 2. Fetch from appropriate source with fallback
        posts = await self._fetch_with_fallback(subreddit, query, limit, effective_tier)

        response = {
            "source": f"reddit_{effective_tier}",
            "tier": effective_tier,
            "cached": False,
            "cache_key": cache_key,
            "count": len(posts),
            "posts": posts,
        }

        # 3. Store in cache (full response for reuse)
        await self.cache.set_cached(cache_key, response, effective_tier)

        return response

    async def _fetch_with_fallback(
        self,
        subreddit: str,
        query: str,
        limit: int,
        tier: str,
    ) -> List[Dict[str, Any]]:
        """
        Attempts to fetch data from the primary source for the tier,
        falling back through the chain on failure.
        """
        errors = []

        # --- Primary: tier-specific source ---
        if tier == "paid":
            try:
                logger.info(f"[Paid] Fetching via JSON endpoint: r/{subreddit} q={query}")
                posts = await self.json_client.fetch_submissions(subreddit, query, limit)
                if posts:
                    return posts
            except Exception as e:
                errors.append(f"JSON: {e}")
                logger.warning(f"JSON endpoint failed, falling back: {e}")

        if tier == "free" or (tier == "paid" and errors):
            try:
                logger.info(f"[{'Free' if tier == 'free' else 'Fallback'}] Fetching via RSS: r/{subreddit}")
                posts = await self.rss_client.fetch_search_results(query, subreddit)
                if posts:
                    return posts[:limit]
            except Exception as e:
                errors.append(f"RSS: {e}")
                logger.warning(f"RSS feed failed, falling back: {e}")

        # --- Last resort: official API (rate-limited) ---
        try:
            logger.info(f"[Fallback] Fetching via asyncpraw: r/{subreddit} q={query}")
            posts = await self.api_client.fetch_submissions(subreddit, query, limit)
            if posts:
                return posts
        except Exception as e:
            errors.append(f"API: {e}")
            logger.error(f"All sources failed: {errors}")

        if errors:
            raise HTTPException(
                status_code=502,
                detail=f"All Reddit sources failed: {'; '.join(errors)}",
            )

        return []

    async def analyze_sentiment(
        self,
        subreddit: str,
        query: str,
        limit: int = 10,
        tier: str = "free",
        sentiments: Optional[str] = None,
        custom_sentiments: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetch posts using tiered scaling, then run sentiment analysis.
        Caches the full response (posts + sentiment) for 10 minutes.
        """
        effective_tier = self._enforce_tier(tier)
        subreddit = subreddit.strip().lower()
        sentiment_cache_key = f"sentiment:{RedditCacheService.build_cache_key(subreddit, query, effective_tier)}"

        # 1. Check if we already have a cached sentiment response
        cached = await self.cache.get_cached(sentiment_cache_key)
        if cached is not None:
            cached["cached"] = True
            cached["cache_key"] = sentiment_cache_key
            if "posts" in cached:
                cached["posts"] = cached["posts"][:limit]
                cached["count"] = len(cached["posts"])
            return cached

        # 2. Fetch posts (this itself is cached too)
        log_perf(f"python starting data fetch for r/{subreddit} q='{query}'")
        result = await self.search_posts(subreddit, query, limit, effective_tier)
        posts = result["posts"]
        log_perf(f"python finished data fetch for r/{subreddit} ({len(posts)} posts)")

        if not posts:
            raise HTTPException(status_code=404, detail="No Reddit posts found to analyze.")

        # 3. Build documents for classifier
        documents: List[Document] = []
        for post in posts:
            text_parts = [
                str(post.get("title") or ""),
                str(post.get("text") or ""),
            ]
            content = "\n".join(part for part in text_parts if part).strip()
            if not content:
                continue
            documents.append({
                "id": str(post.get("post_id") or post.get("id") or len(documents)),
                "text": content,
            })

        if not documents:
            raise HTTPException(status_code=404, detail="No analyzable content in fetched posts.")

        try:
            logger.info(f"Running sentiment analysis on {len(documents)} documents...")
            log_perf(f"python starting sentiment analysis on {len(documents)} docs")
            tags = custom_sentiments if custom_sentiments else sentiments
            sentiment = await self.classifier.process_batch(documents, custom_sentiments=tags)
            log_perf(f"python finished sentiment analysis on {len(documents)} docs")

            sentiment_response = {
                **result,
                "translations": [],
                "sentiment": sentiment,
            }

            # 4. Cache the full sentiment response
            await self.cache.set_cached(sentiment_cache_key, sentiment_response, effective_tier)

            return sentiment_response
        except HTTPException:
            raise
        except Exception as exc:
            logger.exception(f"Sentiment analysis error: {exc}")
            raise HTTPException(status_code=502, detail=f"Analysis error: {str(exc)}") from exc

    @staticmethod
    def _enforce_tier(tier: str) -> str:
        """
        Enforces tier restrictions.
        Only 'free' and 'paid' are valid. Anything else defaults to 'free'.
        """
        tier = tier.strip().lower()
        if tier not in ("free", "paid"):
            return "free"
        return tier
