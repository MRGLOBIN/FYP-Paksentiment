
import sys
import os

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

# Mock missing dependencies
from unittest.mock import MagicMock
sys.modules['asyncpraw'] = MagicMock()
sys.modules['asyncpraw.exceptions'] = MagicMock()
sys.modules['tweepy'] = MagicMock()
sys.modules['tweepy.asynchronous'] = MagicMock()
sys.modules['tweepy.errors'] = MagicMock()
sys.modules['scrapling'] = MagicMock()
sys.modules['trafilatura'] = MagicMock()
sys.modules['warcio'] = MagicMock()
sys.modules['warcio.archiveiterator'] = MagicMock()
sys.modules['googleapiclient'] = MagicMock()
sys.modules['googleapiclient.discovery'] = MagicMock()
sys.modules['googleapiclient.errors'] = MagicMock()
sys.modules['youtube_transcript_api'] = MagicMock()
sys.modules['bs4'] = MagicMock()
sys.modules['aiohttp'] = MagicMock()
# msgspec might be needed if models use it heavily, but let's try without mocking it if it's there, or mock it too.
# The user env seemed to have msgspec earlier? If not, mock it.
sys.modules['msgspec'] = MagicMock() 

# Since models.py uses msgspec.Struct, if we mock msgspec, we need msgspec.Struct to be a class we can inherit from.
class MockStruct:
    pass
sys.modules['msgspec'].Struct = MockStruct

try:
    from paksentiment_scraper.base import AbstractScraperClient
    print("✅ Successfully imported AbstractScraperClient")
except ImportError as e:
    print(f"❌ Failed to import AbstractScraperClient: {e}")
    sys.exit(1)

try:
    from paksentiment_scraper.reddit_service import RedditScraperClient
    print("✅ Successfully imported RedditScraperClient")
except ImportError as e:
    print(f"❌ Failed to import RedditScraperClient: {e}")
    sys.exit(1)

try:
    from paksentiment_scraper.twitter_service import XScraperClient
    print("✅ Successfully imported XScraperClient")
except ImportError as e:
    print(f"❌ Failed to import XScraperClient: {e}")
    sys.exit(1)
    
try:
    from paksentiment_scraper.youtube_service import YouTubeScraperClient
    print("✅ Successfully imported YouTubeScraperClient")
except ImportError as e:
    print(f"❌ Failed to import YouTubeScraperClient: {e}")
    sys.exit(1)

try:
    from paksentiment_scraper.commoncrawl_service import CommonCrawlScraperClient
    print("✅ Successfully imported CommonCrawlScraperClient")
except ImportError as e:
    print(f"❌ Failed to import CommonCrawlScraperClient: {e}")
    sys.exit(1)

try:
    from paksentiment_scraper.scrapling_service import ScraplingClient
    print("✅ Successfully imported ScraplingClient")
except ImportError as e:
    print(f"❌ Failed to import ScraplingClient: {e}")
    sys.exit(1)

# Check Inheritance
def check_inheritance(cls, name):
    if issubclass(cls, AbstractScraperClient):
        print(f"✅ {name} inherits from AbstractScraperClient")
    else:
        print(f"❌ {name} DOES NOT inherit from AbstractScraperClient")

check_inheritance(RedditScraperClient, "RedditScraperClient")
check_inheritance(XScraperClient, "XScraperClient")
check_inheritance(YouTubeScraperClient, "YouTubeScraperClient")
check_inheritance(CommonCrawlScraperClient, "CommonCrawlScraperClient")
check_inheritance(ScraplingClient, "ScraplingClient")
