import urllib.request
import json
import os
import re

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:1.5b")

def build_sentiment_prompt(text, custom_tags=None):
    categories = custom_tags if custom_tags else 'Positive, Negative, Neutral'
    return f"""You are a sentiment analysis and topic classification expert. Analyze the following text and respond with ONLY a valid JSON object (no markdown, no explanation, just JSON).

Classify the sentiment as one of: {categories}
Identify the main topic as a single word noun.
Write a concise summary of 1-2 sentences that captures the key points for a content preview.
Give a confidence score between 0.0 and 1.0.

Respond in this exact JSON format:
{{"sentiment": "<category>", "confidence": <your confidence>, "topic": "<single word topic>", "summary": "<1-2 sentence summary>"}}

Text to analyze:
\"\"\"{text}\"\"\"

JSON response:"""

def parse_llm_response(raw_text):
    print("\n--- Parsed Results ---")
    sentiment = 'Neutral'
    confidence = 0.5
    topic = 'General'
    summary = raw_text.strip()

    try:
        json_match = re.search(r'\{[\s\S]*?\}', raw_text)
        if json_match:
            parsed = json.loads(json_match.group(0))
            print(f"Matched JSON: {json.dumps(parsed, indent=2)}")
            
            # This is how the TypeScript code parses it
            sentiment = parsed.get('sentiment') or sentiment
            
            conf_val = parsed.get('confidence')
            if isinstance(conf_val, (int, float)):
                confidence = conf_val
            else:
                try:
                    confidence = float(conf_val) if conf_val is not None else confidence
                except ValueError:
                    pass
                    
            topic = parsed.get('topic') or topic
            summary = parsed.get('summary') or summary
            print("\n✅ Successfully parsed JSON fields!")
        else:
            print("\n❌ No JSON block matched the regex /\\{[\\s\\S]*?\\}/")
            raise ValueError("No JSON match")
            
    except Exception as e:
        print(f"\n⚠️ Fallback parsing triggered due to: {e}")
        lower = raw_text.lower()
        if 'positive' in lower:
            sentiment = 'Positive'
            confidence = 0.7
        elif 'negative' in lower:
            sentiment = 'Negative'
            confidence = 0.7
        summary = raw_text[:300].strip()

    print(f"Final Data -> Sentiment: {sentiment}, Confidence: {confidence}, Topic: {topic}")
    print(f"Summary: {summary}")

def main():
    # A realistic sample document
    test_text = "The new smart search algorithm is terrible. It constantly crashes the server and returns irrelevant results. We need to completely rewrite the indexing engine before the next release."
    
    prompt = build_sentiment_prompt(test_text)
    
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False
    }
    
    print(f"Connecting to local Llama server at {OLLAMA_URL} using model '{OLLAMA_MODEL}'...")
    try:
        req = urllib.request.Request(
            f"{OLLAMA_URL}/api/generate", 
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode('utf-8'))
            raw_output = data.get("response", "")
            
            print("\n" + "="*40)
            print("RAW OUTPUT FROM LOCAL LLAMA SERVER:")
            print("="*40)
            print(raw_output)
            print("="*40)
            
            parse_llm_response(raw_output)
            
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"\nFailed to connect to local Llama server: {e}")
        print(f"Error Body: {error_body}")
    except Exception as e:
        print(f"\nFailed to connect to local Llama server: {e}")
        print("Please ensure Ollama is running and accessible.")

if __name__ == "__main__":
    main()
