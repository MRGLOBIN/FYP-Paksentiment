import aiohttp
import logging
import asyncio
from typing import List, Dict, Any, Optional

from .base import AbstractScraperClient

logger = logging.getLogger(__name__)

class RedditJSONClient(AbstractScraperClient):
    """
    A client class for fetching data from Reddit's .json endpoints.
    Allows for providing a proxy URL (e.g. Webshare) to scale and rotate IPs.
    """

    def __init__(self, user_agent: str = "PakSentiment-JSON/1.0", proxy: Optional[str] = None):
        """
        Initializes the JSON client.
        :param proxy: Optional proxy URL, e.g. "http://user:pass@proxy.webshare.io:80"
        """
        self.user_agent = user_agent
        self.proxy = proxy
        self.session = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            headers = {"User-Agent": self.user_agent}
            self.session = aiohttp.ClientSession(headers=headers)
        return self.session

    async def fetch_submissions(
        self, subreddit_name: str, query: str, limit: int = 25
    ) -> List[Dict[str, Any]]:
        """
        Fetches search results from a subreddit's .json endpoint.
        """
        url = f"https://old.reddit.com/r/{subreddit_name}/search.json"
        params = {
            "q": query,
            "restrict_sr": "on",
            "sort": "new",
            "limit": str(limit)
        }
        
        return await self._fetch_json(url, params)

    async def fetch_subreddit_hot(self, subreddit_name: str, limit: int = 25) -> List[Dict[str, Any]]:
        """
        Fetches hot posts directly from a subreddit using the JSON endpoint.
        """
        url = f"https://old.reddit.com/r/{subreddit_name}/hot.json"
        params = {"limit": str(limit)}
        return await self._fetch_json(url, params)

    async def _fetch_json(self, url: str, params: Dict[str, str]) -> List[Dict[str, Any]]:
        max_retries = 3
        retry_count = 0
        session = await self._get_session()

        while retry_count < max_retries:
            try:
                # Use proxy if configured
                kwargs = {}
                if self.proxy:
                    kwargs["proxy"] = self.proxy

                async with session.get(url, params=params, **kwargs) as response:
                    if response.status == 429:
                        retry_count += 1
                        wait_time = int(response.headers.get("Retry-After", 10))
                        logger.warning(f"Rate limited (429). Retrying in {wait_time}s... ({retry_count}/{max_retries})")
                        await asyncio.sleep(wait_time)
                        continue

                    if response.status != 200:
                        logger.error(f"Failed to fetch JSON from {url}, status code: {response.status}")
                        response.raise_for_status()

                    data = await response.json()
                    
                    results = []
                    children = data.get("data", {}).get("children", [])
                    
                    for child in children:
                        post_data = child.get("data", {})
                        
                        # Extract best available image URL
                        image_url = None
                        # 1. Check preview images (highest quality)
                        preview = post_data.get("preview", {})
                        if preview and "images" in preview and len(preview["images"]) > 0:
                            source_img = preview["images"][0].get("source", {})
                            if source_img.get("url"):
                                # Reddit HTML-encodes the URL in preview
                                image_url = source_img["url"].replace("&amp;", "&")
                        # 2. Check if the post URL itself is a direct image
                        if not image_url:
                            post_url = post_data.get("url", "")
                            if post_url and any(post_url.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                                image_url = post_url
                            elif 'i.redd.it' in post_url:
                                image_url = post_url
                        # 3. Fallback to thumbnail if it's a valid URL
                        if not image_url:
                            thumb = post_data.get("thumbnail", "")
                            if thumb and thumb.startswith("http"):
                                image_url = thumb
                        
                        results.append({
                            "post_id": post_data.get("id"),
                            "title": post_data.get("title"),
                            "text": post_data.get("selftext"),
                            "score": post_data.get("score"),
                            "upvote_ratio": post_data.get("upvote_ratio"),
                            "num_comments": post_data.get("num_comments"),
                            "author_name": post_data.get("author", "[Deleted]"),
                            "is_nsfw": post_data.get("over_18"),
                            "flair": post_data.get("link_flair_text"),
                            "created_utc": post_data.get("created_utc"),
                            "url": post_data.get("url"),
                            "permalink": post_data.get("permalink"),
                            "total_awards": post_data.get("total_awards_received"),
                            "distinguished": post_data.get("distinguished"),
                            "locked": post_data.get("locked"),
                            "thumbnail": post_data.get("thumbnail"),
                            "image_url": image_url,
                        })
                    
                    return results

            except Exception as e:
                logger.exception(f"An unexpected error occurred: {e}")
                retry_count += 1
                if retry_count >= max_retries:
                    raise
                await asyncio.sleep(2)

        return []

    async def close_connection(self) -> None:
        """Closes the underlying aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
