import urllib.request
import urllib.error
import json
import time
import os

# Configuration
SIDECAR_URL = "http://localhost:8081"
OUTPUT_FILE = "output_result.txt"

# Test queries for each service
ENDPOINTS = [
    # --- Go Colly-Sidecar Integrations (Port 8081) ---
    {"name": "Go: Hacker News", "url": f"{SIDECAR_URL}/integrations/hackernews?query=technology"},
    {"name": "Go: NewsAPI", "url": f"{SIDECAR_URL}/integrations/newsapi?query=technology"},
    {"name": "Go: NewsData.io", "url": f"{SIDECAR_URL}/integrations/newsdata?query=technology"},
    {"name": "Go: GDELT", "url": f"{SIDECAR_URL}/integrations/gdelt?query=technology"},
    {"name": "Go: Mastodon", "url": f"{SIDECAR_URL}/integrations/mastodon?query=technology"},
    {"name": "Go: Stack Overflow", "url": f"{SIDECAR_URL}/integrations/stackoverflow?query=python"},
    {"name": "Go: Google Trends", "url": f"{SIDECAR_URL}/integrations/googletrends?query=bitcoin"},
    {"name": "Go: RSS Feed", "url": f"{SIDECAR_URL}/integrations/rss?url=https://hnrss.org/frontpage"},
    
    # --- Python Data Gateway (Port 8000) ---
    {"name": "Python: Reddit Search", "url": "http://localhost:8000/reddit/search?subreddit=pakistan&query=technology&limit=2"},
    {"name": "Python: Twitter Sentiment", "url": "http://localhost:8000/twitter/sentiment?query=technology&max_results=10"},
    {"name": "Python: YouTube Search", "url": "http://localhost:8000/youtube/search?query=technology&max_results=2"},
    {"name": "Python: CommonCrawl", "url": "http://localhost:8000/commoncrawl/records?domain=medium.com&limit=2"},
    {"name": "Python: Scrapling Web", "url": "http://localhost:8000/scrapling/fetch?url=https://news.ycombinator.com&fetch_limit=1"},
]

def run_tests():
    print(f"Starting API tests against {SIDECAR_URL}...")
    
    # Ensure the directory exists
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("=== PakSentiment Integration Services Test Report ===\n")
        f.write(f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("=" * 50 + "\n\n")

        for endpoint in ENDPOINTS:
            name = endpoint["name"]
            url = endpoint["url"]
            print(f"Testing {name}...")
            
            f.write(f"--- Testing {name} ---\n")
            f.write(f"Endpoint: {url}\n")
            
            try:
                start_time = time.time()
                
                req = urllib.request.Request(url, headers={'User-Agent': 'Test-Script/1.0'})
                try:
                    with urllib.request.urlopen(req, timeout=30) as response:
                        elapsed = time.time() - start_time
                        status_code = response.getcode()
                        body = response.read().decode('utf-8')
                        
                        f.write(f"Status Code: {status_code}\n")
                        f.write(f"Response Time: {elapsed:.2f}s\n")
                        
                        data = json.loads(body)
                        results = data.get("results") or []
                        f.write(f"Results Found: {len(results)}\n")
                        
                        if results:
                            sample = results[0]
                            f.write("Sample Result [0]:\n")
                            f.write(f"  Title: {sample.get('title', 'N/A')}\n")
                            f.write(f"  Author: {sample.get('author', 'N/A')}\n")
                            f.write(f"  URL: {sample.get('url', 'N/A')}\n")
                            text = sample.get('text', '')
                            if len(text) > 150:
                                text = text[:150] + "..."
                            f.write(f"  Text Snippet: {text}\n")
                
                except urllib.error.HTTPError as e:
                    elapsed = time.time() - start_time
                    f.write(f"Status Code: {e.code}\n")
                    f.write(f"Response Time: {elapsed:.2f}s\n")
                    f.write(f"Error Response: {e.read().decode('utf-8')}\n")
                    print(f"  Failed with {e.code}")

            except Exception as e:
                f.write(f"Exception Occurred: {str(e)}\n")
                print(f"  Failed: {str(e)}")
            
            f.write("\n" + "-" * 50 + "\n\n")
            
    print(f"Tests complete. Results written to {OUTPUT_FILE}")

if __name__ == "__main__":
    run_tests()
