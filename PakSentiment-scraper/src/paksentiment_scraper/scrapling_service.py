import logging
from typing import Any, Dict, List, Optional

from scrapling import Fetcher, StealthyFetcher
from .models import ScraplingResponse
from .base import AbstractScraperClient

logger = logging.getLogger(__name__)


class ScraplingClient(AbstractScraperClient):
    """
    A client class for fetching web pages using the Scrapling library.
    Supports undetectable scraping and adaptive element extraction.
    """

    def __init__(self, stealth: bool = True):
        """
        Initializes the Scrapling client.
        :param stealth: Whether to use StealthyFetcher (True) or standard Fetcher (False).
        """
        self.stealth = stealth
        # We'll instantiate the fetcher on demand or keep it if it's reusable.
        # Scrapling fetchers seem designed for reusability.
        if self.stealth:
            self.fetcher = StealthyFetcher()
        else:
            self.fetcher = Fetcher()

    def fetch_page(self, url: str, **kwargs) -> ScraplingResponse:
        """
        Fetches a web page.
        :param url: The URL to fetch.
        :param kwargs: Additional arguments for the fetcher (e.g. cookies, headers).
        :return: A ScraplingResponse object containing status code and content.
        """
        logger.info(f"Fetching page: {url} (Stealth: {self.stealth})")
        try:
            response = self.fetcher.fetch(url, **kwargs)
            
            body = response.body
            if isinstance(body, bytes):
                raw_html = body.decode("utf-8", errors="ignore")
            else:
                raw_html = body
            
            # Use trafilatura to extract main text
            import trafilatura
            
            text = trafilatura.extract(raw_html, include_comments=False, include_tables=True, no_fallback=False) or ""
            
            # Extract links
            links = []
            try:
                # Scrapling response object has .css method? 
                # Scrapling Fetcher returns a Response object which usually wraps parsel/lxml
                # Let's use the .css selector if available, or .xpath
                hrefs = response.css("a::attr(href)")
                if hrefs:
                    for href in hrefs:
                        # Resolve relative URLs
                        from urllib.parse import urljoin
                        # Explicitly cast to str to avoid TextHandler objects
                        full_url = urljoin(str(url), str(href))
                        if full_url.startswith("http"):
                            links.append(str(full_url))
                # Deduplicate
                links = list(set(links))
            except Exception as e:
                logger.warning(f"Failed to extract links from {url}: {e}")

            return ScraplingResponse(
                status=response.status,
                text=text,
                body=raw_html,
                url=response.url,
                links=links
            )
        except Exception as e:
            logger.exception(f"Error fetching page {url}: {e}")
            raise

    def extract_elements(
        self, url: str, selectors: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Fetches a page and extracts elements based on CSS selectors.
        Uses Scrapling's adaptive matching if available.
        :param url: The URL to fetch.
        :param selectors: Dictionary mapping keys (e.g. 'title') to CSS selectors.
        :return: Dictionary with extracted data.
        """
        logger.info(f"Extracting elements from {url} with selectors: {selectors}")
        try:
            response = self.fetcher.fetch(url)
            
            results = {}
            for key, selector in selectors.items():
                # Scrapling adaptors usually return a list or single element
                # simplistic extraction for now:
                elements = response.css(selector)
                if elements:
                    # Depending on what we want, maybe text of first match or all matches
                    # Let's get text of first match for simplicity, or list if multiple
                    if len(elements) == 1:
                        results[key] = elements[0].text.strip()
                    else:
                        results[key] = [el.text.strip() for el in elements]
                else:
                    results[key] = None
                    
            return results

        except Exception as e:
            logger.exception(f"Error extracting elements from {url}: {e}")
            raise

    async def close_connection(self) -> None:
        """
        Closes the underlying fetcher if necessary.
        Scrapling Fetchers might not require explicit closing if not running a persistent browser context,
        but we define it for interface consistency.
        """
        # If fetcher has a close method (e.g. if it wraps a browser), call it.
        # Currently Scrapling Fetcher is often stateless or manages itself, but let's be safe.
        if hasattr(self.fetcher, "close"):
             try:
                 self.fetcher.close()
             except Exception:
                 pass
