import asyncio
import gzip
import logging
import io
import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import aiohttp
import trafilatura
from warcio.archiveiterator import ArchiveIterator
from bs4 import BeautifulSoup

from .models import CommonCrawlRecord
from .base import AbstractScraperClient
from .perf_logger import log_perf

logger = logging.getLogger(__name__)

# Common Crawl constants
CC_INDEX_API_URL = "https://index.commoncrawl.org/CC-MAIN-{crawl_id}-index"
CC_BASE_URL = "https://data.commoncrawl.org/"


class CommonCrawlScraperClient(AbstractScraperClient):
    """
    A client class for fetching extracted text data from Common Crawl using CDX Index.
    """

    def __init__(self, crawl_id: Optional[str] = None):
        """
        Initializes the Common Crawl client.
        :param crawl_id: Specific crawl ID (e.g., '2025-47'). If None, uses latest.
        """
        self.crawl_id = crawl_id
        self.session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session."""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    async def _get_latest_crawl_id(self) -> str:
        """Fetches the latest Common Crawl ID dynamically."""
        session = await self._get_session()
        try:
            async with session.get("https://index.commoncrawl.org/collinfo.json") as response:
                if response.status == 200:
                    data = await response.json()
                    if data and len(data) > 0:
                        # Extract the crawl ID from the first (latest) entry
                        # Example: data[0]['id'] -> "CC-MAIN-2024-10"
                        return data[0]['id'].replace("CC-MAIN-", "")
        except Exception as e:
            logger.warning(f"Failed to fetch latest CC crawl ID: {e}")
        
        # Fallback to a known recent valid crawl ID if API fails
        return "2024-10"

    async def _search_index(
        self, domain: str, limit: int, filter_mime: str = "text/html", keyword: str | None = None
    ) -> List[Dict]:
        """
        Search the Common Crawl Index (CDX) for a domain.
        """
        if not self.crawl_id:
            self.crawl_id = await self._get_latest_crawl_id()

        index_url = CC_INDEX_API_URL.format(crawl_id=self.crawl_id)
        
        # If we need a keyword, fetch a much larger batch to ensure we have enough matches
        search_limit = limit * 20 if keyword else limit * 3
        
        params = {
            "url": f"{domain}/*",
            "output": "json",
            "limit": search_limit,
            "filter": [f"mime:{filter_mime}", "status:200"],
        }
        
        logger.info(f"Searching CDX Index: {index_url} params={params}")

        session = await self._get_session()
        try:
            async with session.get(index_url, params=params) as response:
                if response.status != 200:
                    logger.error(f"CDX Search failed: {response.status}")
                    return []

                content = await response.text()
                records = []
                for line in content.strip().split("\n"):
                    if line:
                        try:
                            records.append(json.loads(line))
                        except Exception:
                            continue
                
                # Deduplicate based on URL/filename to avoid same page versions
                unique_records = []
                seen_urls = set()
                keyword_lower = keyword.lower() if keyword else None
                
                for r in records:
                    url = r.get('url')
                    if url and url not in seen_urls:
                        # Keyword filtering: Check if the slug contains the keyword
                        if keyword_lower and keyword_lower not in url.lower():
                            continue
                            
                        # Basic heuristic: Filter out likely non-article paths if searching news
                        path = urlparse(url).path
                        if any(x in path for x in ['/category/', '/tag/', '/author/', '/page/', '/search/']):
                            continue
                        
                        # Allow more pages (including top-level categories) to ensure we get results
                        # Only skip completely empty paths if necessary
                        if not path or path == '/':
                            # Optionally allow homepage if it contains significant text, 
                            # but usually we want specific pages. Let's be a bit more permissive.
                            pass
                        
                        seen_urls.add(url)
                        unique_records.append(r)
                
                records = unique_records[:limit]
                
                logger.info(f"Found {len(records)} records in CDX Index for {domain} (filtered limit = {limit})")
                return records

        except Exception as e:
            logger.warning(f"Error searching CDX index: {e}")
            return []

    async def _fetch_warc_record(self, record: Dict) -> Optional[CommonCrawlRecord]:
        """
        Fetch a specific WARC record using range request and extract text.

        :param record: A dictionary containing CDX record details (filename, offset, length, url, timestamp).
        :return: A CommonCrawlRecord object if successful, None otherwise.
        """
        filename = record.get("filename")
        offset = int(record.get("offset", 0))
        length = int(record.get("length", 0))
        url = record.get("url")
        timestamp = record.get("timestamp")

        if not filename:
            return None

        target_url = CC_BASE_URL + filename
        headers = {"Range": f"bytes={offset}-{offset + length - 1}"}

        session = await self._get_session()
        try:
            async with session.get(target_url, headers=headers) as response:
                if response.status not in (200, 206):
                    logger.warning(f"Failed to fetch WARC record: {response.status}")
                    return None

                data = await response.read()
                
                # Parse WARC record
                with io.BytesIO(data) as stream:
                    for warc_record in ArchiveIterator(stream):
                        if warc_record.rec_type == 'response':
                            # Extract HTML content
                            content_bytes = warc_record.content_stream().read()
                            
                            # Basic charset detection or default utf-8
                            charset = 'utf-8'
                            
                            html_content = content_bytes.decode(charset, errors='replace')
                            
                            # Extract Text using Trafilatura (Smart Extraction)
                            text = trafilatura.extract(
                                html_content,
                                include_comments=False,
                                include_tables=False,
                                no_fallback=True
                            )
                            
                            # Simple cleanup
                            if not text or len(text) < 200: # Increase threshold, articles are longer
                                return None

                            return CommonCrawlRecord(
                                url=url,
                                text=text,
                                date=timestamp,
                                content_type="text/plain" # We converted to text
                            )
        except Exception as e:
            logger.error(f"Error fetching/parsing WARC record {url}: {e}")
            return None
        
        return None

    # async def fetch_wet_records(
    #     self, limit: int = 10, crawl_id: Optional[str] = None
    # ) -> List[CommonCrawlRecord]:
    #     """
    #     Wrapper to fetch by domain if provided, otherwise unsupported/legacy.
    #     This generic method is hard to implement efficiently without a domain.
    #     Exposing it for API compatibility but logging warning if logic undefined.
    #     """
    #     if crawl_id:
    #         self.crawl_id = crawl_id
    #         
    #     logger.warning("fetch_wet_records without domain is not efficiently supported by CDX. Returning empty.")
    #     return []

    async def fetch_wet_records_by_domain(
        self, domain: str, limit: int = 10, crawl_id: Optional[str] = None, keyword: Optional[str] = None
    ) -> List[CommonCrawlRecord]:
        """
        Fetch text records filtered by domain and optional keyword using CDX Index.
        """
        log_perf(f"python start fetching commoncrawl index for: {domain}")
        if crawl_id:
            self.crawl_id = crawl_id

        # 1. Search Index
        cdx_records = await self._search_index(domain, limit, keyword=keyword)
        
        if not cdx_records:
            log_perf("python finished fetching commoncrawl records (0 found in CDX)")
            return []

        # 2. Fetch records in parallel
        tasks = [self._fetch_warc_record(r) for r in cdx_records]
        results = await asyncio.gather(*tasks)
        
        # 3. Filter None results
        valid_records = [r for r in results if r is not None]
        
        log_perf(f"python finished fetching commoncrawl records ({len(valid_records)} successfully fetched)")
        return valid_records

    async def close_connection(self):
        """Close the underlying aiohttp session."""
        if self.session and not self.session.closed:
            await self.session.close()
