from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from services.trends_service import trends_service
import logging

logger = logging.getLogger("uvicorn")
router = APIRouter(prefix="/trends", tags=["Google Trends"])

@router.get("/interest")
async def get_trend_interest(
    query: str = Query(..., description="The keyword to search for"),
    timeframe: str = Query("today 1-m", description="Timeframe for the trend (e.g., 'today 1-m', 'now 7-d', 'today 5-y')")
):
    """
    Fetches interest over time for a keyword using Google Trends (via pytrends).
    Returns a list of dictionaries containing date and interest score.
    """
    try:
        logger.info(f"Fetching Google Trends for '{query}' with timeframe '{timeframe}'")
        results = await trends_service.get_interest_over_time(query, timeframe)
        
        return {
            "success": True,
            "keyword": query,
            "timeframe": timeframe,
            "results": results
        }
    except Exception as e:
        logger.error(f"Google Trends fetch failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
