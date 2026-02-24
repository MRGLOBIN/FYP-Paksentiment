import asyncio
import logging
import os
from dynaconf import Dynaconf

from paksentiment_scraper import RedditScraperClient, XScraperClient, YouTubeScraperClient, CommonCrawlScraperClient, ScraplingClient

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def main():
    # Load secrets using Dynaconf
    settings = Dynaconf(
        settings_files=[
            "src/paksentiment_scraper/config/settings.toml",
            "src/paksentiment_scraper/config/.secrets.toml",
        ],
        environments=True,
        envvar_prefix="PAKSENTIMENT",
    )

    x_bearer_token = settings.TWITTER_BEARER_TOKEN
    reddit_client_id = settings.REDDIT_CLIENT_ID
    reddit_client_secret = settings.REDDIT_CLIENT_SECRET
    reddit_user_agent = settings.get("REDDIT_USER_AGENT", "PakSentimentScraper")

    # # --- Twitter Example ---
    logger.info("Initializing Twitter Client...")
    twitter_client = XScraperClient(bearer_token=x_bearer_token)
    try:
        query = "python programming"
        logger.info(f"Searching Twitter for: {query}")
        tweets, includes, raw = await twitter_client.fetch_tweets(
            query, max_results=10
        )
        if tweets:
            for tweet in tweets:
                logger.info(f"Tweet: {tweet.text[:50]}...")
        else:
            logger.info("No tweets found or error occurred.")
    except Exception as e:
        logger.error(f"Twitter search failed: {e}")
    finally:
        await twitter_client.close_connection()

    # # --- Reddit Example ---
    logger.info("Initializing Reddit Client...")
    reddit_client = RedditScraperClient(
        client_id=reddit_client_id,
        client_secret=reddit_client_secret,
        user_agent=reddit_user_agent,
    )
    try:
        subreddit = "python"
        query = "asyncio"
        logger.info(f"Searching Reddit r/{subreddit} for: {query}")
        posts = await reddit_client.fetch_submissions(subreddit, query, limit=5)
        for post in posts:
            logger.info(f"Reddit Post: {post['title']} (Score: {post['score']})")
    except Exception as e:
        logger.error(f"Reddit search failed: {e}")
    finally:
        await reddit_client.close_connection()

    # --- YouTube Example ---
    youtube_api_key = settings.YOUTUBE_API_KEY
    logger.info("Initializing YouTube Client...")
    youtube_client = YouTubeScraperClient(api_key=youtube_api_key)
    try:
        query = "PTI current situation"
        logger.info(f"Searching YouTube for: {query}")
        videos = await youtube_client.fetch_videos(query, max_results=10)
        for video in videos:
            video_id = video.video_id
            logger.info(f"YouTube Video: {video.title} (Channel: {video.channel_title})")
            
            # Fetch Comments
            comments = await youtube_client.fetch_video_comments(video_id, max_results=3)
            if comments:
                logger.info(f"  > Found {len(comments)} comments. Top comment: {comments[0].text[:50]}...")
            else:
                logger.info("  > No comments found.")

            # Fetch Transcript
            transcript = await youtube_client.fetch_video_transcript(video_id)
            if transcript:
                logger.info(f"  > Transcript found. First line: {transcript[0].text}")
            else:
                logger.info("  > No transcript found.")
    except Exception as e:
        logger.error(f"YouTube search failed: {e}")
    finally:
        await youtube_client.close_connection()

    # --- Common Crawl Example ---
    # logger.info("Initializing Common Crawl Client...")
    cc_client = CommonCrawlScraperClient()
    try:
        logger.info("Fetching 5 WET records from Common Crawl...")
        records = await cc_client.fetch_wet_records(limit=5)
        for i, record in enumerate(records, 1):
            logger.info(f"Record {i}:")
            logger.info(f"  URL: {record.url}")
            logger.info(f"  Date: {record.date}")
            logger.info(f"  Text preview: {record.text[:100]}...")
        
        # Example with domain filter
        logger.info("\nFetching 3 records from .edu domains...")
        edu_records = await cc_client.fetch_wet_records_by_domain("edu", limit=3)
        for i, record in enumerate(edu_records, 1):
            logger.info(f"EDU Record {i}: {record.url}")
    except Exception as e:
        logger.error(f"Common Crawl fetch failed: {e}")
    finally:
        await cc_client.close_connection()

    # --- Scrapling Example ---
    logger.info("Initializing Scrapling Client...")
    # Use stealth mode for better undetectability
    scrapling_client = ScraplingClient(stealth=True)
    try:
        # Target a safe scraping sandbox
        url = "http://quotes.toscrape.com/"
        logger.info(f"Scraping {url} with Scrapling...")
        
        # Extract quotes and authors
        # Using CSS selectors
        selectors = {
            "quotes": ".quote .text",
            "authors": ".quote .author",
            "tags": ".quote .tags .tag"
        }
        
        # Scrapling operations are synchronous/blocking by default in the library's basic usage,
        # but our service wrapper methods can be called directly.
        # Since Scrapling's Fetcher is sync, we should ideally wrap this in asyncio.to_thread 
        # in a real async app if not using their async adaptors. 
        # For this demo, let's just call it.
        
        # Note: In our service implementation we didn't add asyncio.to_thread yet for methods,
        # but Scrapling is fast. For a robust async app, we should wrap or use their AsyncFetcher.
        # Let's use our wrapper method.
        # Scrapling uses sync Playwright, so we must run it in a thread to avoid blocking the event loop
        data = await asyncio.to_thread(scrapling_client.extract_elements, url, selectors)
        
        if data.get("quotes"):
            quotes = data["quotes"]
            authors = data["authors"]
            # data["quotes"] returns list of text since we implemented it that way
            
            # Print first 3 quotes
            for i in range(min(3, len(quotes))):
                q_text = quotes[i]
                a_text = authors[i] if i < len(authors) else "Unknown"
                logger.info(f"Quote {i+1}: {q_text} - {a_text}")
        else:
            logger.info("No quotes found.")
            
    except Exception as e:
        logger.error(f"Scrapling fetch failed: {e}")

    # --- Siasat.com Example ---
    logger.info("Initializing Siasat Scraper...")
    siasat_client = ScraplingClient(stealth=True)
    
    async def scrape_siasat_category(category_url, max_pages=2):
        """Scrape articles from a Siasat category page with pagination."""
        logger.info(f"Targeting Category: {category_url}")
        
        all_articles = []
        current_url = category_url
        
        for page in range(1, max_pages + 1):
            logger.info(f"  Scraping Page {page}: {current_url}")
            try:
                # Selectors for Siasat.com (Verified structure: h2.post-title)
                selectors = {
                    "titles": "h2.post-title a", 
                    "dates": "span.time, time", # Fallback for dates
                    "excerpts": ".entry-summary, .post-summary" 
                }
                
                # Fetch data
                # Using our extracting wrapper. 
                # Note: This returns lists of titles, dates etc. 
                # Ideally we'd iterate elements in the DOM to keep them grouped, 
                # but our simple client extracts lists. We'll zip them.
                # Scrapling uses sync Playwright, so we must run it in a thread to avoid blocking the event loop
                data = await asyncio.to_thread(siasat_client.extract_elements, current_url, selectors)
                
                titles = data.get("titles", [])
                # If titles is a single string (1 result), make it list
                if isinstance(titles, str): titles = [titles]
                
                if not titles:
                    logger.warning("    No articles found on this page. Stopping.")
                    break
                    
                logger.info(f"    Found {len(titles)} articles.")
                for t in titles[:3]: # Log first few
                    logger.info(f"      - {t}")
                    
                all_articles.extend(titles)
                
                # Pagination logic
                # Siasat typically uses /page/2/ structure
                current_url = f"{category_url}page/{page + 1}/"
                
            except Exception as e:
                logger.error(f"Error scraping {current_url}: {e}")
                break
                
        return all_articles

    try:
        # Main Topic: Pakistan News
        pakistan_news_url = "https://www.siasat.com/news/pakistan/"
        await scrape_siasat_category(pakistan_news_url, max_pages=2)
        
        # Sub-topic: Example 'Business' or similar if reachable, 
        # or just deep dive one category as requested.
        # Let's try another one if known, e.g. Business usually exists
        # business_url = "https://www.siasat.com/category/business/"
        # await asyncio.to_thread(scrape_siasat_category, business_url, max_pages=1)
        
    except Exception as e:
        logger.error(f"Siasat scraping failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())
