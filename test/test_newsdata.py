import urllib.request
import urllib.parse
import json

api_key = "pub_9344138f97cb49428baca3da9573b893"
query = "technology"
limit = 10

url = f"https://newsdata.io/api/1/news?apikey={api_key}&q={query}&size={limit}"

req = urllib.request.Request(url)
try:
    with urllib.request.urlopen(req) as response:
        body = response.read().decode('utf-8')
        print(f"Success: {body[:200]}")
except Exception as e:
    if hasattr(e, 'read'):
        print(f"Error Body: {e.read().decode('utf-8')}")
    else:
        print(f"Error: {e}")
