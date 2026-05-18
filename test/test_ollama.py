import json
import urllib.request
import os

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5")

def build_sentiment_prompt(text, custom_tags=None):
    categories = custom_tags if custom_tags else 'Positive, Negative, Neutral'
    return f"""You are a sentiment analysis and topic classification expert. Analyze the following text and respond with ONLY a valid JSON object (no markdown, no explanation, just JSON).

Classify the sentiment as one of: {categories}
Identify the main topic as a single word noun (e.g. Economics, Politics, Technology, Health, Education, Sports, Science, Culture, Environment, Law, Society).
Write a concise summary of 1-2 sentences that captures the key points for a content preview.
Give a confidence score between 0.0 and 1.0 (e.g. 0.85).

Respond in this exact JSON format:
{{"sentiment": "<category>", "confidence": 0.85, "topic": "<single word topic>", "summary": "<1-2 sentence summary>"}}

Text to analyze:
\"\"\"{text}\"\"\"

JSON response:"""

def test_ollama():
    test_text = "The new electric vehicle policy announced by the government is absolutely fantastic. It provides massive subsidies for EV buyers and will significantly reduce our carbon footprint over the next decade. I am so excited to buy my first electric car next month!"
    
    prompt = build_sentiment_prompt(test_text)
    print(f"--- Prompt ---\n{prompt}\n--------------\n")
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    
    print(f"Sending request to {OLLAMA_URL}/api/generate with model {OLLAMA_MODEL}...")
    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/generate", 
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode('utf-8'))
            raw_output = data.get("response", "")
            print("\n--- Raw Output from Ollama ---")
            print(raw_output)
            print("------------------------------")
            
            # Test the parsing logic
            import re
            json_match = re.search(r'\{[\s\S]*?\}', raw_output)
            if json_match:
                print("\nMatched JSON string:")
                print(json_match.group(0))
                try:
                    parsed = json.loads(json_match.group(0))
                    print("\nSuccessfully parsed JSON:")
                    print(json.dumps(parsed, indent=2))
                except Exception as e:
                    print(f"\nFailed to parse JSON: {e}")
            else:
                print("\nNo JSON match found in output.")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_ollama()
