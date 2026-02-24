# PakSentiment Scraper

A robust, multi-platform data scraping library designed for the PakSentiment project. It provides unified, asynchronous interfaces for scraping data from:
- **YouTube** (Videos, Comments, Transcripts)
- **Common Crawl** (WET Text Records)
- **Twitter/X** (Tweets via API)
- **Reddit** (Submissions via API)
- **General Web** (Stealthy scraping via Scrapling)

## Installation

```bash
pip install paksentiment-scraper
```

## Features

- **Asynchronous Design**: All clients are designed to work seamlessly with `asyncio`.
- **Typed Responses**: Returns strict `msgspec` structs (e.g., `YouTubeVideo`, `CommonCrawlRecord`) for type safety.
- **Stealth Mode**: Integrated `Scrapling` support for undetectable web scraping.
- **Robust Error Handling**: Consistent logging and exception handling across all services.

## Usage

### Configuration
The library uses `Dynaconf` for configuration. You can provide API keys via environment variables or a `.secrets.toml` file.

### Example: YouTube Scraping

```python
import asyncio
from paksentiment_scraper import YouTubeScraperClient

async def main():
    client = YouTubeScraperClient(api_key="YOUR_API_KEY")
    videos = await client.fetch_videos("Pakistani Politics")
    
    for video in videos:
        print(f"{video.title} ({video.video_id})")
        
    await client.close_connection()

if __name__ == "__main__":
    asyncio.run(main())
```

### Example: General Web Scraping (Siasat.com)

```python
from paksentiment_scraper import ScraplingClient

client = ScraplingClient(stealth=True)
response = client.fetch_page("https://www.siasat.com/")
print(response.title)
```

## License
MIT
