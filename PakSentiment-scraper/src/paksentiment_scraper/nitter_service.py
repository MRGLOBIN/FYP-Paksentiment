import logging
import os
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import quote, urljoin

from .scrapling_service import ScraplingClient

logger = logging.getLogger(__name__)

class NitterScraperClient:
    """
    A client for scraping Twitter directly using authenticated cookies (bypassing API).
    """

    def __init__(self, instance_url: str = "https://twitter.com", stealth: bool = False, cookies: Optional[Dict] = None):
        self.base_url = instance_url
        self.client = ScraplingClient(stealth=stealth)
        self.cookies = cookies or {}
        logger.info(f"Initialized TwitterScraperClient. Authenticated: {bool(self.cookies)}")

    async def fetch_tweets(
        self,
        query: str,
        max_results: int = 10,
        tweet_fields: Optional[List[str]] = None,
        expansions: Optional[List[str]] = None,
        user_fields: Optional[List[str]] = None,
        media_fields: Optional[List[str]] = None,
    ) -> Tuple[Optional[List[Dict[str, Any]]], Optional[Dict], Optional[Any]]:
        """
        Scrapes Twitter Search results using authenticated session.
        """
        if not self.cookies:
            logger.error("Authentication cookies missing! Cannot scrape Twitter.")
            return [], {}, None

        # Twitter/X Search URL (Default to Top tweets for stability)
        encoded_query = quote(query)
        search_url = f"https://x.com/search?q={encoded_query}&src=typed_query"
        
        logger.info(f"Scraping X (Auth): {search_url}")
        
        try:
            import asyncio
            
            # Prepare cookies for Playwright (list of dicts)
            formatted_cookies = []
            if self.cookies:
                for k, v in self.cookies.items():
                    # Add for twitter.com
                    formatted_cookies.append({
                        "name": k,
                        "value": v,
                        "domain": ".twitter.com",
                        "path": "/"
                    })
                    # Add for x.com
                    formatted_cookies.append({
                        "name": k,
                        "value": v,
                        "domain": ".x.com",
                        "path": "/"
                    })
            
            # Pass wait_selector to ensure tweets are loaded
            response = await asyncio.to_thread(
                self.client.fetch_page, 
                search_url, 
                cookies=formatted_cookies,
                wait_selector='article[role="article"]',
                wait_timeout=20000 
            )
            
            if response.status != 200:
                logger.error(f"Twitter returned status {response.status}")
                return [], {}, None

            from parsel import Selector
            selector = Selector(text=response.body)
            
            tweets_data = []
            
            # Twitter React/Redux HTML structure is complex.
            # We look for role="article" which corresponds to a tweet.
            articles = selector.css('article[role="article"]')
            
            if not articles:
                 logger.warning("No tweets found (React render might have failed or no results or sign-in wall).")
                 
                 # Debug: Save HTML
                 with open("debug_twitter.html", "w", encoding="utf-8") as f:
                     f.write(response.text)
                 logger.info("Saved debug_twitter.html")
                 
                 if "Sign in" in response.text:
                     logger.error("Hit Sign-in wall. Cookies might be invalid.")
                 return [], {}, None

            for article in articles:
                if len(tweets_data) >= max_results:
                    break
                
                # Extract text
                # Text is usually in div[lang]
                text = "".join(article.css('div[lang]::text').getall()).strip()
                if not text:
                    text = "[Media Tweet]"

                # Extract User
                # User info is in links with User-Name
                user_names = article.css('div[dir="ltr"] span::text').getall()
                username = "unknown"
                name = "Unknown"
                
                for u in user_names:
                    if u.startswith("@"):
                        username = u[1:] # remove @
                        break
                
                # ID is in the anchor href to the status
                links = article.css('a::attr(href)').getall()
                tweet_id = "0"
                tweet_url = ""
                
                for l in links:
                    if "/status/" in l:
                        tweet_url = f"https://twitter.com{l}" if l.startswith("/") else l
                        tweet_id = l.split("/status/")[-1].split("/")[0]
                        break
                
                tweet = {
                    "id": tweet_id,
                    "text": text,
                    "author_id": username,
                    "created_at": None, 
                    "public_metrics": {"like_count": 0, "retweet_count": 0}, 
                    "username": username,
                    "name": name,
                    "url": tweet_url
                }
                tweets_data.append(tweet)
            
            logger.info(f"Found {len(tweets_data)} tweets via Auth Twitter.")
            return tweets_data, {}, None

        except Exception as e:
            logger.exception(f"Error scraping Twitter: {e}")
            return [], {}, None

    async def close_connection(self):
        pass
