"""
Redis-backed caching layer for Reddit data.
Provides tiered TTL and fuzzy query matching for similar queries.
Designed for thousands of concurrent users sharing cache across tiers.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

# TTL values in seconds
FREE_TIER_TTL = 600   # 10 minutes — RSS data refreshes slowly
PAID_TIER_TTL = 600   # 10 minutes — keeping parity, user requested 10 min


class RedditCacheService:
    """
    Wraps an async Redis connection pool to cache Reddit API responses.
    Supports fuzzy/similar query matching so "pakistan economy" and
    "economy in pakistan" share the same cache entry.
    """

    def __init__(self, redis_client: aioredis.Redis):
        self.redis = redis_client

    @staticmethod
    def normalize_query(query: str) -> str:
        """
        Normalizes a query for cache key generation.
        - Lowercases
        - Strips extra whitespace
        - Removes common stop words
        - Sorts remaining tokens alphabetically

        This ensures "pakistan economy 2026" and "economy pakistan"
        produce the same cache key, maximizing hit rate.
        """
        stop_words = {
            "the", "a", "an", "in", "on", "at", "of", "for", "to",
            "and", "or", "is", "are", "was", "were", "what", "how",
            "about", "with", "from", "by", "do", "does", "did",
            "people", "think", "say", "saying", "right", "now",
        }
        # Lowercase, strip, and split on non-alphanumeric
        tokens = re.split(r'\W+', query.strip().lower())
        # Remove stop words and empty tokens
        meaningful = [t for t in tokens if t and t not in stop_words]
        # Sort for order-independent matching
        meaningful.sort()
        return ":".join(meaningful) if meaningful else query.strip().lower()

    @staticmethod
    def build_cache_key(subreddit: str, query: str, tier: str, sort: str = "new") -> str:
        """
        Builds a deterministic, normalized cache key.
        Fuzzy queries produce the same key for similar searches.
        """
        subreddit = subreddit.strip().lower()
        normalized_query = RedditCacheService.normalize_query(query)
        tier = tier.strip().lower()
        sort = sort.strip().lower()
        return f"reddit:{tier}:{subreddit}:{sort}:{normalized_query}"

    async def get_cached(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached data by key. Returns None on miss.
        The cached value is a full response dict (posts + metadata).
        """
        try:
            raw = await self.redis.get(key)
            if raw is None:
                logger.debug(f"Cache MISS: {key}")
                return None
            logger.info(f"Cache HIT: {key}")
            return json.loads(raw)
        except Exception as e:
            logger.warning(f"Redis GET error for {key}: {e}")
            return None

    async def set_cached(self, key: str, data: Dict[str, Any], tier: str) -> None:
        """
        Store data in cache with tier-appropriate TTL.
        Stores the full response (posts + sentiment if available).
        """
        ttl = FREE_TIER_TTL if tier == "free" else PAID_TIER_TTL
        try:
            await self.redis.set(key, json.dumps(data, default=str), ex=ttl)
            logger.info(f"Cache SET: {key} (TTL={ttl}s)")
        except Exception as e:
            logger.warning(f"Redis SET error for {key}: {e}")

    async def find_similar(self, subreddit: str, query: str, tier: str) -> Optional[Dict[str, Any]]:
        """
        Attempt to find a cached entry that matches a similar query.
        Uses the normalized query key approach — if the normalized form
        of this query matches an existing key, we get a hit.

        This is already handled by normalize_query() in build_cache_key(),
        but this method also scans for partial matches in the same subreddit.
        """
        # First try exact normalized match
        primary_key = self.build_cache_key(subreddit, query, tier)
        result = await self.get_cached(primary_key)
        if result is not None:
            return result

        # Scan for partial matches in the same subreddit+tier namespace
        # This catches cases where one query is a subset of another
        pattern = f"reddit:{tier}:{subreddit.strip().lower()}:*"
        try:
            normalized = self.normalize_query(query)
            normalized_tokens = set(normalized.split(":"))

            async for key in self.redis.scan_iter(match=pattern, count=50):
                # Extract the query portion from the key
                # Key format: reddit:{tier}:{subreddit}:{sort}:{normalized_query}
                parts = key.split(":", 4)
                if len(parts) < 5:
                    continue
                cached_query_tokens = set(parts[4].split(":"))

                # If 60%+ of tokens overlap, it's a similar query
                if not normalized_tokens or not cached_query_tokens:
                    continue
                overlap = normalized_tokens & cached_query_tokens
                similarity = len(overlap) / max(len(normalized_tokens), len(cached_query_tokens))

                if similarity >= 0.6:
                    logger.info(f"Cache FUZZY HIT: {key} (similarity={similarity:.0%})")
                    cached = await self.get_cached(key)
                    if cached is not None:
                        return cached
        except Exception as e:
            logger.warning(f"Redis SCAN error: {e}")

        return None

    async def invalidate(self, key: str) -> None:
        """Manually invalidate a cache entry."""
        try:
            await self.redis.delete(key)
        except Exception as e:
            logger.warning(f"Redis DEL error for {key}: {e}")

    async def get_stats(self) -> Dict[str, Any]:
        """Return basic Redis info for health checks."""
        try:
            info = await self.redis.info(section="stats")
            return {
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "connected": True,
                "ttl_free": FREE_TIER_TTL,
                "ttl_paid": PAID_TIER_TTL,
            }
        except Exception as e:
            return {"connected": False, "error": str(e)}
