from __future__ import annotations

import asyncio
import json
from typing import Iterable, List, TypedDict, Any, Dict

from groq import AsyncGroq, RateLimitError
from fastapi import HTTPException

from config import settings


class Document(TypedDict):
    id: str
    text: str


class GroqSentimentClassifier:
    """
    Sentiment classifier using Groq's LLaMA models.
    """

    def __init__(self) -> None:
        api_key = settings.get("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY must be defined in config/.secrets.toml or env vars."
            )

        self._client = AsyncGroq(api_key=api_key)
        # Using llama-3.1-8b-instant for cost-effective analysis
        # Using llama-3.1-8b-instant for cost-effective analysis
        self._model = "llama-3.1-8b-instant"



    async def process_batch(self, documents: Iterable[Document], custom_sentiments: str | None = None, batch_size: int = 10):
        docs = list(documents)
        if not docs:
            return []

        results = []
        
        # Process in smaller batches to avoid token limits
        for i in range(0, len(docs), batch_size):
            batch = docs[i : i + batch_size]
            prompt = self._build_prompt(batch, custom_sentiments)

            try:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a content analysis expert. Respond ONLY with valid JSON arrays, no markdown formatting or explanations."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.3,
                    max_tokens=4000,
                )
                
                text = response.choices[0].message.content

                # Parsing logic moved below to handle shared fallback path

                
                # Parsing logic moved below
                    
            except RateLimitError as e:
                print(f"⚠️ Groq Rate Limit detected on batch {i // batch_size + 1}: {e}")
                # print(f"⚠️ Groq Rate Limit detected on batch {i // batch_size + 1}: {e}")
                # continue

            except Exception as exc:
                print(f"Error processing batch {i // batch_size + 1}: {exc}")
                continue
            
            # Common parsing logic for both success paths
            try:
                # Cleanup logic
                text = text.strip()
                if text.startswith("```json"):
                    text = text[7:].lstrip()
                elif text.startswith("```"):
                    text = text[3:].lstrip()
                if text.endswith("```"):
                    text = text[:-3].rstrip()
                text = text.strip()
                
                # Try to parse JSON, with recovery for truncated responses
                try:
                    parsed = json.loads(text)
                except json.JSONDecodeError:
                    # Attempt to fix truncated JSON array
                    if text.startswith("[") and not text.endswith("]"):
                        # Find last complete object
                        last_brace = text.rfind("}")
                        if last_brace > 0:
                            text = text[:last_brace + 1] + "]"
                            try:
                                parsed = json.loads(text)
                                print(f"Recovered truncated JSON for batch {i // batch_size + 1}")
                            except json.JSONDecodeError:
                                print(f"Failed to recover JSON for batch {i // batch_size + 1}")
                                continue
                        else:
                            continue
                    else:
                        continue
                
                if isinstance(parsed, list):
                    results.extend(parsed)
                elif isinstance(parsed, dict) and "sentiment" in parsed:
                    results.append(parsed)
            except Exception as parse_exc:
                print(f"Error parsing response: {parse_exc}")
                continue

        return results

    def _build_prompt(self, documents: List[Document], custom_sentiments: str | None = None) -> str:
        dataset = json.dumps(documents, ensure_ascii=False)
        
        # We are hijacking the 'sentiment' field to return Context/Topic as requested by user.
        # "give it one word context on what it is actually about"
        
        if custom_sentiments:
             instructions = (
                f"You are a content analyzer. Classify the content into one of these categories: **{custom_sentiments}**.\n"
                "Respond with ONLY a JSON array. "
                "Each element must have exactly these fields: "
                '{"id": "<original id>", "sentiment": "<One word Category>", '
                '"confidence": <number between 0 and 1>, '
                '"summary": "<one sentence summary>"}.\n\n'
                "Rules:\n"
                f"1. 'sentiment' field must be one of: {custom_sentiments}.\n"
                "2. Base the classification solely on the provided text.\n"
                "3. Return ONLY the JSON array, nothing else.\n\n"
                f"Documents:\n{dataset}\n\n"
            )
        else:
            instructions = (
                "You are a content analyzer. For each document, determine the **Context/Topic** "
                "that best describes what the content is actually about (e.g., Politics, Sports, Economy, Technology, Crime, Entertainment, Health, Education, etc.). "
                "Respond with ONLY a JSON array. "
                "Each element must have exactly these fields: "
                '{"id": "<original id>", "sentiment": "<One word Topic/Context>", '
                '"confidence": <number between 0 and 1>, '
                '"summary": "<one sentence summary>"}.\n\n'
                "Rules:\n"
                "1. 'sentiment' field must contain the ONE WORD Topic (e.g. 'Politics').\n"
                "2. Base the topic solely on the provided text.\n"
                "3. Return ONLY the JSON array, nothing else.\n\n"
                f"Documents:\n{dataset}\n\n"
            )
        return instructions


classifier: GroqSentimentClassifier | None = None


def get_classifier() -> GroqSentimentClassifier:
    global classifier
    if classifier is None:
        classifier = GroqSentimentClassifier()
    return classifier

class AnalysisModelSentimentClassifier:
    """
    Local sentiment classifier using Ollama (qwen2.5:1.5b).
    Offloads inference to the highly optimized Ollama daemon running on the host,
    enabling sub-second CPU inference speeds via C++/Metal/Accelerate.
    """
    def __init__(self):
        import httpx
        self._model_name = "llama3.2:1b"
        self._url = "http://localhost:11434/api/generate"
        # We initialize the client per-request or globally in process_batch to avoid unclosed sessions
        print(f"✅ Analysis Model routing configured to Ollama: {self._model_name}")

    def _truncate_text(self, text: str, max_words: int = 100) -> str:
        words = text.split()
        if len(words) <= max_words:
            return text
        return " ".join(words[:max_words]) + "..."

    def _build_batch_prompt(self, docs: List[Document], custom_sentiments: str | None = None) -> str:
        # Prepare the dataset
        truncated_docs = []
        for d in docs:
            truncated_docs.append({
                "id": d["id"],
                "text": self._truncate_text(d["text"], 100)
            })
            
        dataset = json.dumps(truncated_docs, ensure_ascii=False, indent=2)

        topic_inst = f'- "topic" (one word from: {custom_sentiments})' if custom_sentiments else '- "topic" (one word, e.g. Politics, Sports, Economy, Technology)'
        
        return (
            f'You are an expert data extractor. Analyze the following list of documents. '
            f'Extract the topic, sentiment, emotion, keywords, language, relevance, and summary for EACH document and format your response STRICTLY as a JSON array of objects.\n\n'
            f'Required Fields for EACH object:\n'
            f'- "id" (must EXACTLY match the input document id)\n'
            f'{topic_inst}\n'
            f'- "sentiment" (exactly "Positive", "Negative", or "Neutral")\n'
            f'- "confidence" (number between 0.0 and 1.0)\n'
            f'- "emotion" (exactly one of: "Joy", "Anger", "Fear", "Surprise", "Sadness", "Disgust", "Trust", "Anticipation")\n'
            f'- "keywords" (array of 3 to 5 key terms from the text)\n'
            f'- "language" (ISO 639-1 code of the source text, e.g. "en", "ur", "ar")\n'
            f'- "relevance" (how relevant this document is to the overall topic, 0.0 to 1.0)\n'
            f'- "summary" (one short sentence summary)\n\n'
            f'Documents to analyze:\n{dataset}'
        )

    async def process_batch(self, documents: Iterable[Document], custom_sentiments: str | None = None) -> List[Dict[str, Any]]:
        """
        Process a batch of documents using Ollama in a SINGLE prompt.
        This dramatically improves response time by eliminating HTTP queue overhead.
        """
        import httpx
        docs = list(documents)
        if not docs:
            return []

        prompt = self._build_batch_prompt(docs, custom_sentiments)
        
        # Enforce strict JSON Schema for an ARRAY of objects
        schema = {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "topic": {"type": "string"},
                    "sentiment": {"type": "string", "enum": ["Positive", "Negative", "Neutral"]},
                    "confidence": {"type": "number"},
                    "emotion": {"type": "string", "enum": ["Joy", "Anger", "Fear", "Surprise", "Sadness", "Disgust", "Trust", "Anticipation"]},
                    "keywords": {"type": "array", "items": {"type": "string"}},
                    "language": {"type": "string"},
                    "relevance": {"type": "number"},
                    "summary": {"type": "string"}
                },
                "required": ["id", "topic", "sentiment", "confidence", "emotion", "keywords", "language", "relevance", "summary"]
            }
        }
        
        payload = {
            "model": self._model_name,
            "prompt": prompt,
            "format": schema,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_ctx": 8192,     # Double the context window to prevent prompt truncation
                "num_predict": 4000  # Increased to accommodate keywords array + new fields per document
            }
        }
        
        valid_results = []
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self._url, json=payload, timeout=300.0)
                response.raise_for_status()
                
                data = response.json()
                response_text = data.get("response", "[]")
                
                # Ollama JSON Schema enforcement guarantees this is a valid JSON array
                parsed_array = json.loads(response_text)
                
                if isinstance(parsed_array, list):
                    # Create a lookup for validation
                    doc_ids = {str(d["id"]) for d in docs}
                    
                    for item in parsed_array:
                        item_id = str(item.get("id"))
                        if item_id in doc_ids:
                            try:
                                conf = float(item.get("confidence", 0.7))
                                item["confidence"] = max(0.0, min(1.0, conf))
                            except (ValueError, TypeError):
                                item["confidence"] = 0.7
                            valid_results.append(item)
                            doc_ids.remove(item_id)
                    
                    # Handle any missing documents that the model skipped
                    for missing_id in doc_ids:
                        print(f"Model skipped document {missing_id}")
                        valid_results.append({
                            "id": missing_id,
                            "topic": "Unknown",
                            "sentiment": "Unknown",
                            "confidence": 0.0,
                            "summary": "Analysis failed due to model skipping"
                        })
                else:
                    raise ValueError("Model did not return a JSON array")
                    
        except Exception as e:
            print(f"Batched Ollama request failed: {e}")
            # Fallback for all documents if the entire request fails
            for doc in docs:
                valid_results.append({
                    "id": doc["id"],
                    "topic": "Unknown",
                    "sentiment": "Unknown",
                    "confidence": 0.0,
                    "summary": "Analysis failed due to an error"
                })
                
        return valid_results

analysis_model_instance: AnalysisModelSentimentClassifier | None = None

def get_analysis_model() -> AnalysisModelSentimentClassifier:
    global analysis_model_instance
    if analysis_model_instance is None:
        analysis_model_instance = AnalysisModelSentimentClassifier()
    return analysis_model_instance


