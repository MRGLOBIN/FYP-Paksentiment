"""
Scaled Reddit endpoints with tiered access (free=RSS, paid=JSON+proxy)
and Redis caching for production-level throughput.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, Request
from models.schemas import RedditScaledSearchResponse, RedditSentimentResponse, ErrorResponse
from services.reddit_scaled_service import RedditScaledService
from dependencies import get_reddit_scaled_service

router = APIRouter(prefix="/reddit/scaled", tags=["Reddit (Scaled)"])


@router.get(
    "/search",
    response_model=RedditScaledSearchResponse,
    summary="Scaled Reddit Search",
    description=(
        "Search Reddit posts using a tiered strategy. "
        "**free** tier uses RSS feeds (no auth, highly scalable). "
        "**paid** tier uses JSON endpoints with proxy rotation (richer data). "
        "All responses are cached in Redis for fast repeated access."
    ),
    responses={
        502: {"model": ErrorResponse, "description": "All data sources failed"},
    },
)
async def reddit_scaled_search(
    subreddit: str = Query(..., description="Subreddit name (without 'r/' prefix)", example="pakistan"),
    query: str = Query(..., description="Search term", example="economy"),
    limit: int = Query(25, ge=1, le=100, description="Max posts to return"),
    tier: str = Query("free", regex="^(free|paid)$", description="Access tier: 'free' (RSS) or 'paid' (JSON+proxy)"),
    service: RedditScaledService = Depends(get_reddit_scaled_service),
) -> Dict[str, Any]:
    return await service.search_posts(subreddit, query, limit, tier)


@router.get(
    "/sentiment",
    response_model=RedditSentimentResponse,
    tags=["Reddit (Scaled)", "Sentiment Analysis"],
    summary="Scaled Reddit Sentiment Analysis",
    description=(
        "Fetch Reddit posts using the scaled tier and run sentiment analysis. "
        "Supports custom sentiment labels."
    ),
    responses={
        404: {"model": ErrorResponse, "description": "No posts found"},
        502: {"model": ErrorResponse, "description": "Analysis or source error"},
    },
)
async def reddit_scaled_sentiment(
    subreddit: str = Query(..., description="Subreddit name (without 'r/' prefix)", example="pakistan"),
    query: str = Query(..., description="Search term", example="education reform"),
    limit: int = Query(10, ge=1, le=50, description="Max posts to analyze"),
    tier: str = Query("free", regex="^(free|paid)$", description="Access tier"),
    sentiments: Optional[str] = Query(None, description="Deprecated: Use custom_sentiments"),
    custom_sentiments: Optional[str] = Query(None, description="Custom sentiment tags (comma-separated)"),
    service: RedditScaledService = Depends(get_reddit_scaled_service),
) -> Dict[str, Any]:
    return await service.analyze_sentiment(subreddit, query, limit, tier, sentiments, custom_sentiments)


@router.get(
    "/cache/stats",
    summary="Redis Cache Statistics",
    description="Returns cache hit/miss ratios and connection status.",
    tags=["Reddit (Scaled)"],
)
async def cache_stats(
    service: RedditScaledService = Depends(get_reddit_scaled_service),
) -> Dict[str, Any]:
    return await service.cache.get_stats()
