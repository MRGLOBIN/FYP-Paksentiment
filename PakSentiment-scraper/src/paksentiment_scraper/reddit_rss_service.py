import aiohttp
import feedparser
import logging
import re
from typing import List, Dict, Any, Optional

from .base import AbstractScraperClient

logger = logging.getLogger(__name__)

class RedditRSSClient(AbstractScraperClient):
    """
    A client class for fetching data from Reddit's public RSS feeds.
    This does not require an API key or authentication and serves as a highly scalable tier.
    """

    def __init__(self, user_agent: str = "PakSentiment-RSS/1.0"):
        """
        Initializes the Reddit RSS client.
        :param user_agent: Descriptive user agent string.
        """
        self.user_agent = user_agent
        self.session = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self.session is None or self.session.closed:
            headers = {"User-Agent": self.user_agent}
            self.session = aiohttp.ClientSession(headers=headers)
        return self.session

    async def fetch_subreddit_new(self, subreddit_name: str) -> List[Dict[str, Any]]:
        """
        Fetches the newest posts from a subreddit using its RSS feed.
        """
        url = f"https://www.reddit.com/r/{subreddit_name}/new/.rss"
        return await self._fetch_and_parse(url)

    async def fetch_search_results(self, query: str, subreddit_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Fetches search results from an RSS feed.
        """
        if subreddit_name:
            url = f"https://www.reddit.com/r/{subreddit_name}/search.rss?q={query}&restrict_sr=on&sort=new"
        else:
            url = f"https://www.reddit.com/search.rss?q={query}&sort=new"
            
        return await self._fetch_and_parse(url)

    async def _fetch_and_parse(self, url: str) -> List[Dict[str, Any]]:
        session = await self._get_session()
        
        try:
            async with session.get(url) as response:
                if response.status != 200:
                    logger.error(f"Failed to fetch RSS from {url}, status code: {response.status}")
                    return []
                
                content = await response.text()
                
                # Parse the raw XML content with feedparser
                feed = feedparser.parse(content)
                
                results = []
                for entry in feed.entries:
                    # Safely extract HTML content or summary
                    text_content = ""
                    if "content" in entry and len(entry.content) > 0:
                        text_content = entry.content[0].value
                    elif "summary" in entry:
                        text_content = entry.summary

                    # Extract image URL from RSS HTML content
                    image_url = None
                    if text_content:
                        img_match = re.search(r'<img[^>]+src="([^"]+)"', text_content)
                        if img_match:
                            img_src = img_match.group(1)
                            # Decode HTML entities (e.g. &amp; -> &)
                            img_src = img_src.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
                            # Filter out Reddit tracking pixels and tiny icons
                            if 'preview.redd.it' in img_src or 'i.redd.it' in img_src or 'imgur.com' in img_src:
                                # Strip width/height params to get a better resolution image
                                # e.g. ?width=140&height=84&auto=webp&s=... -> just keep auto=webp
                                if 'preview.redd.it' in img_src and '?' in img_src:
                                    base_url = img_src.split('?')[0]
                                    # Extract the signature (s= param) — required by Reddit CDN
                                    sig_match = re.search(r'[&?]s=([a-f0-9]+)', img_src)
                                    sig = f"&s={sig_match.group(1)}" if sig_match else ""
                                    img_src = f"{base_url}?auto=webp{sig}"
                                image_url = img_src
                    # Also check if the post link itself is a direct image
                    if not image_url:
                        link = entry.get("link", "")
                        if link and any(link.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']):
                            image_url = link
                        elif 'i.redd.it' in link:
                            image_url = link

                    # Use standard field names matching the standard scraper where possible
                    results.append({
                        "post_id": entry.get("id", ""),
                        "title": entry.get("title", ""),
                        "text": text_content,
                        "author_name": entry.get("author", ""),
                        "created_utc": entry.get("published", ""),  # String representation
                        "url": entry.get("link", ""),
                        "category": entry.get("category", ""),
                        "image_url": image_url,
                    })
                
                return results

        except Exception as e:
            logger.exception(f"An error occurred fetching RSS feed {url}: {e}")
            raise

    async def close_connection(self) -> None:
        """Closes the underlying aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
