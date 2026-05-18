import asyncio
import logging
from typing import List, Dict, Any
from pytrends.request import TrendReq

logger = logging.getLogger("uvicorn")

class GoogleTrendsService:
    def __init__(self):
        # Initialize pytrends
        # timezone 360 = US Central Time
        self.pytrends = TrendReq(hl='en-US', tz=360, retries=3, backoff_factor=0.5)

    def _fetch_interest_sync(self, keyword: str, timeframe: str = 'today 1-m') -> List[Dict[str, Any]]:
        """
        Synchronously fetches interest over time from Google Trends.
        This must be run in a thread pool to avoid blocking the event loop.
        """
        try:
            self.pytrends.build_payload(kw_list=[keyword], timeframe=timeframe)
            df = self.pytrends.interest_over_time()
            
            if df.empty:
                return []
                
            # 'isPartial' is a boolean column returned by pytrends, drop it for clean output
            if 'isPartial' in df.columns:
                df = df.drop(columns=['isPartial'])
            
            # The index is the Date. Reset index to turn it into a column.
            df = df.reset_index()
            
            results = []
            for _, row in df.iterrows():
                results.append({
                    "date": row['date'].isoformat(),
                    "interest": int(row[keyword])
                })
            
            return results
        except Exception as e:
            logger.error(f"Error fetching Google Trends for '{keyword}': {e}")
            raise e

    async def get_interest_over_time(self, keyword: str, timeframe: str = 'today 1-m') -> List[Dict[str, Any]]:
        """
        Asynchronously fetches interest over time.
        Timeframe options: 'today 1-m', 'today 3-m', 'now 7-d', 'today 5-y', etc.
        """
        # Run the synchronous pandas/requests code in a thread pool
        results = await asyncio.to_thread(self._fetch_interest_sync, keyword, timeframe)
        return results

trends_service = GoogleTrendsService()
