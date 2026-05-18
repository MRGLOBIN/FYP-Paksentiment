package sentiment

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// sentimentJSON is the expected structured output from the LLM.
type sentimentJSON struct {
	Sentiment  string  `json:"sentiment"`
	Confidence float64 `json:"confidence"`
	Topic      string  `json:"topic"`
	Summary    string  `json:"summary"`
}

// TruncateToWords safely truncates text to a maximum number of words.
func TruncateToWords(text string, maxWords int) string {
	words := strings.Fields(text)
	if len(words) <= maxWords {
		return text
	}
	return strings.Join(words[:maxWords], " ") + "..."
}

// buildPrompt creates a structured prompt for sentiment analysis with topic extraction.
func buildPrompt(text string) string {
	return fmt.Sprintf(`You are a sentiment analysis and topic classification expert. Analyze the following text and respond with ONLY a valid JSON object (no markdown, no explanation, just the JSON).

1. Classify the sentiment as one of: Positive, Negative, Neutral
2. Identify the main topic as a single word noun.
3. Give a confidence score between 0.0 and 1.0.
4. Write a very short 3-5 word summary.

Respond in this exact JSON format:
{"sentiment": "<category>", "confidence": <your confidence>, "topic": "<single word topic>", "summary": "<3-5 word summary>"}

Text to analyze:
"""%s"""

JSON response:`, text)
}

// parseLLMResponse is a common helper to extract structured data from LLM output.
func parseLLMResponse(raw string) (string, float64, string, string, error) {
	jsonRegex := regexp.MustCompile(`\{[\s\S]*?\}`)
	match := jsonRegex.FindString(raw)
	if match != "" {
		var parsed sentimentJSON
		if err := json.Unmarshal([]byte(match), &parsed); err == nil {
			confidence := parsed.Confidence
			if confidence < 0 {
				confidence = 0
			}
			if confidence > 1 {
				confidence = 1
			}
			topic := parsed.Topic
			if topic == "" {
				topic = "General"
			}
			return parsed.Sentiment, confidence, topic, parsed.Summary, nil
		}
	}

	// Fallback: keyword detection
	lower := strings.ToLower(raw)
	sentiment := "Neutral"
	confidence := 0.5
	if strings.Contains(lower, "positive") {
		sentiment = "Positive"
		confidence = 0.7
	} else if strings.Contains(lower, "negative") {
		sentiment = "Negative"
		confidence = 0.7
	}

	summary := raw
	if len(summary) > 300 {
		summary = summary[:300]
	}

	return sentiment, confidence, "General", strings.TrimSpace(summary), nil
}
