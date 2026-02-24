from typing import Any, Dict, List, Optional
import msgspec

class YouTubeVideo(msgspec.Struct):
    """Represents a YouTube video search result."""
    video_id: str
    title: str
    description: str
    channel_title: str
    channel_id: str
    published_at: str
    url: str
    thumbnail_url: Optional[str] = None

class YouTubeComment(msgspec.Struct):
    """Represents a top-level YouTube comment."""
    comment_id: str
    author: str
    text: str
    like_count: int
    published_at: str

class YouTubeTranscriptSnippet(msgspec.Struct):
    """Represents a single segment of a YouTube transcript."""
    text: str
    start: float
    duration: float

class CommonCrawlRecord(msgspec.Struct):
    """Represents a text record extracted from Common Crawl WET file."""
    url: str
    text: str
    date: str
    content_type: str

class ScraplingResponse(msgspec.Struct):
    """Represents a generic response from Scrapling."""
    status: int
    text: str
    url: str
    links: List[str] = []
    body: str = ""

class ScraplingExtractedData(msgspec.Struct):
    """
    Represents data extracted via selectors. 
    Since structure is dynamic based on selectors, we use a flexible dict wrapper 
    or just rely on the fact that msgspec handles dicts well. 
    However, for strict typing in a library, a dict is often best for dynamic data.
    """
    data: Dict[str, Any]
