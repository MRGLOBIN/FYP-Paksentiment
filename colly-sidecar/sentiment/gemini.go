package sentiment

import (
	"context"
	"fmt"
	"log"

	"github.com/paksentiment/colly-sidecar/models"
	"github.com/paksentiment/colly-sidecar/perf"
	"google.golang.org/genai"
)

// GeminiAnalyzer handles sentiment analysis via Google's Gemini API.
type GeminiAnalyzer struct {
	apiKey string
}

// NewGeminiAnalyzer creates a new analyzer pointing at the Gemini API.
func NewGeminiAnalyzer(apiKey string) *GeminiAnalyzer {
	return &GeminiAnalyzer{
		apiKey: apiKey,
	}
}

func (g *GeminiAnalyzer) IsAvailable() bool {
	return g.apiKey != ""
}

func (g *GeminiAnalyzer) AnalyzePages(results []models.PageResult) bool {
	if len(results) == 0 || g.apiKey == "" {
		return false
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, &genai.ClientConfig{APIKey: g.apiKey})
	if err != nil {
		log.Printf("[Sentiment] Failed to create Gemini client: %v", err)
		return false
	}

	anySuccess := false
	processed := 0

	for i := range results {
		if processed >= 3 {
			break
		}

		if len(results[i].Text) < 50 {
			continue
		}

		perf.Log("go started sentiment analysis via Gemini")
		sentiment, confidence, topic, summary, err := g.analyzeSingle(ctx, client, results[i].Text)
		if err != nil {
			log.Printf("[Sentiment] Gemini failed for %s: %v", results[i].URL, err)
			continue
		}
		perf.Log("go finished sentiment analysis via Gemini")

		results[i].Sentiment = sentiment
		results[i].Confidence = confidence
		results[i].Topic = topic
		results[i].Summary = summary
		results[i].SentimentEngine = "gemini-3.1-flash-lite-preview"
		anySuccess = true
		processed++

		log.Printf("[Sentiment] %s → %s (%.2f) [%s] via Gemini", results[i].URL, sentiment, confidence, topic)
	}

	return anySuccess
}

func (g *GeminiAnalyzer) analyzeSingle(ctx context.Context, client *genai.Client, text string) (string, float64, string, string, error) {
	text = TruncateToWords(text, 50)

	// prompt := buildPrompt(text)

	/*
	resp, err := client.Models.GenerateContent(ctx, "gemini-3.1-flash-lite-preview", genai.Text(prompt), nil)
	if err != nil {
		return "", 0, "", "", fmt.Errorf("gemini request failed: %w", err)
	}

	raw := resp.Text()
	*/
	raw := "" // Commented out by user request
	if raw == "" {
		return "", 0, "", "", fmt.Errorf("failed to extract text from response: empty")
	}

	return parseLLMResponse(raw)
}


