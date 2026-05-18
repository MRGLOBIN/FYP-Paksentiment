import asyncio
import logging
import os
from dynaconf import Dynaconf
from paksentiment_scraper import RedditRSSClient, RedditJSONClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def run_test():
    # 1. Load settings (using the same pattern as demo.py)
    # We assume we are running from the PakSentiment-scraper directory
    settings = Dynaconf(
        settings_files=[
            "src/paksentiment_scraper/config/settings.toml",
            "src/paksentiment_scraper/config/.secrets.toml",
        ],
        environments=True,
        envvar_prefix="PAKSENTIMENT",
    )

    results_file = "tests/test_results.txt"
    
    with open(results_file, "w") as f:
        f.write("=== REDDIT SCALING TEST RESULTS ===\n\n")

        # --- Test RSS Client (Free Tier) ---
        logger.info("Testing RedditRSSClient...")
        rss_client = RedditRSSClient()
        try:
            subreddit = "pakistan"
            f.write(f"--- RSS Test: r/{subreddit} ---\n")
            posts = await rss_client.fetch_subreddit_new(subreddit)
            f.write(f"Status: SUCCESS\n")
            f.write(f"Posts found: {len(posts)}\n")
            if posts:
                f.write(f"Sample Post: {posts[0]['title']}\n")
            f.write("\n")
            logger.info(f"RSS: Found {len(posts)} posts.")
        except Exception as e:
            f.write(f"Status: FAILED\n")
            f.write(f"Error: {str(e)}\n\n")
            logger.error(f"RSS Test failed: {e}")
        finally:
            await rss_client.close_connection()

        # --- Test JSON Client (Paid Tier with Proxies) ---
        proxy_url = settings.get("WEBSHARE_PROXY_URL")
        logger.info(f"Testing RedditJSONClient with proxy: {'REDACTED' if proxy_url else 'None'}")
        
        if not proxy_url:
            f.write("--- JSON Test: SKIPPED (No proxy URL found in settings) ---\n\n")
            logger.warning("No proxy URL found in settings. Skipping JSON test.")
        else:
            json_client = RedditJSONClient(proxy=proxy_url)
            try:
                subreddit = "pakistan"
                f.write(f"--- JSON Test: r/{subreddit} with Proxy ---\n")
                posts = await json_client.fetch_subreddit_hot(subreddit, limit=5)
                f.write(f"Status: SUCCESS\n")
                f.write(f"Posts found: {len(posts)}\n")
                for post in posts:
                    f.write(f"- {post['title']} (Score: {post['score']})\n")
                f.write("\n")
                logger.info(f"JSON: Found {len(posts)} posts using proxy.")
            except Exception as e:
                f.write(f"Status: FAILED\n")
                f.write(f"Error: {str(e)}\n\n")
                logger.error(f"JSON Test failed: {e}")
            finally:
                await json_client.close_connection()

    logger.info(f"Test complete. Results saved to {results_file}")

if __name__ == "__main__":
    # Ensure we are in the right directory to find src/
    asyncio.run(run_test())
