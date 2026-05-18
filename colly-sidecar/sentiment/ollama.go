package sentiment

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"time"

	"github.com/paksentiment/colly-sidecar/models"
	"github.com/paksentiment/colly-sidecar/perf"
)

// OllamaAnalyzer handles sentiment analysis via an Ollama LLM instance.
type OllamaAnalyzer struct {
	url    string
	model  string
	client *http.Client
}

// NewOllamaAnalyzer creates a new analyzer pointing at the Ollama server.
func NewOllamaAnalyzer(url, model string) *OllamaAnalyzer {
	return &OllamaAnalyzer{
		url:   url,
		model: model,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// ollamaRequest is the JSON body sent to Ollama /api/generate.
type ollamaRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
	Format string `json:"format,omitempty"`
}

// ollamaResponse is the JSON body returned from Ollama /api/generate.
type ollamaResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// // sentimentJSON is the expected structured output from the LLM.
// type sentimentJSON struct {
// 	Sentiment  string  `json:"sentiment"`
// 	Confidence float64 `json:"confidence"`
// 	Topic      string  `json:"topic"`
// 	Summary    string  `json:"summary"`
// }

// IsAvailable checks if the Ollama server is reachable with a quick ping.
func (o *OllamaAnalyzer) IsAvailable() bool {
	pingClient := &http.Client{Timeout: 15 * time.Second}

	endpoint := o.url + "/api/tags"
	log.Printf("[Sentiment] Pinging Ollama at %s (model: %s)", endpoint, o.model)

	resp, err := pingClient.Get(endpoint)
	if err != nil {
		log.Printf("[Sentiment] Ollama health check failed: %v", err)
		return false
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		log.Printf("[Sentiment] Ollama health check returned status %d", resp.StatusCode)
		return false
	}

	log.Printf("[Sentiment] Ollama health check OK — model %s is ready", o.model)
	return true
}

// AnalyzePages runs sentiment analysis on each PageResult using the Ollama model.
// It modifies the results in-place, filling in Sentiment/Confidence/Summary fields.
// Returns true if sentiment was successfully applied to at least one page.
func (o *OllamaAnalyzer) AnalyzePages(results []models.PageResult) bool {
	if len(results) == 0 {
		return false
	}

	anySuccess := false
	processed := 0

	for i := range results {
		// Hard limit to 3 items evaluated by the LLM per batch to avoid Cloudflare 100s execution timeouts
		if processed >= 3 {
			log.Printf("[Sentiment] Skipping Ollama sentiment for %s (batch limit of 3 reached)", results[i].URL)
			continue
		}

		if len(results[i].Text) < 50 {
			continue
		}

		perf.Log("go started sentiment analysis via Ollama")
		sentiment, confidence, topic, summary, err := o.analyzeSingle(results[i].Text)
		if err != nil {
			log.Printf("[Sentiment] Ollama failed for %s: %v", results[i].URL, err)
			continue
		}
		perf.Log("go finished sentiment analysis via Ollama")

		results[i].Sentiment = sentiment
		results[i].Confidence = confidence
		results[i].Topic = topic
		results[i].Summary = summary
		results[i].SentimentEngine = "ollama:" + o.model
		anySuccess = true
		processed++

		log.Printf("[Sentiment] %s → %s (%.2f) [%s] via %s", results[i].URL, sentiment, confidence, topic, o.model)
	}

	return anySuccess
}

// analyzeSingle sends a single text to Ollama and parses the sentiment response.
func (o *OllamaAnalyzer) analyzeSingle(text string) (string, float64, string, string, error) {
	text = TruncateToWords(text, 100)

	prompt := buildPrompt(text)

	reqBody, _ := json.Marshal(ollamaRequest{
		Model:  o.model,
		Prompt: prompt,
		Stream: false,
		Format: "json",
	})

	resp, err := o.client.Post(o.url+"/api/generate", "application/json", bytes.NewReader(reqBody))
	if err != nil {
		return "", 0, "", "", fmt.Errorf("ollama request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, "", "", fmt.Errorf("read response failed: %w", err)
	}

	if resp.StatusCode != 200 {
		return "", 0, "", "", fmt.Errorf("ollama returned status %d", resp.StatusCode)
	}

	var ollamaResp ollamaResponse
	if err := json.Unmarshal(respBody, &ollamaResp); err != nil {
		return "", 0, "", "", fmt.Errorf("JSON decode failed: %w", err)
	}

	raw := ollamaResp.Response

	return parseLLMResponse(raw)
}


