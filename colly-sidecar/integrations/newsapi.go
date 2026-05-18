package integrations

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/paksentiment/colly-sidecar/models"
)

type NewsAPIResponse struct {
	Status       string `json:"status"`
	TotalResults int    `json:"totalResults"`
	Articles     []struct {
		Source struct {
			Name string `json:"name"`
		} `json:"source"`
		Author      string    `json:"author"`
		Title       string    `json:"title"`
		Description string    `json:"description"`
		URL         string    `json:"url"`
		URLToImage  string    `json:"urlToImage"`
		Content     string    `json:"content"`
		PublishedAt time.Time `json:"publishedAt"`
	} `json:"articles"`
}

// FetchNewsAPI searches NewsAPI.org (Requires API Key, rate limit 100/day on free)
func FetchNewsAPI(query string, limit int) ([]models.PageResult, error) {
	apiKey := os.Getenv("NEWSAPI")
	if apiKey == "" {
		return nil, fmt.Errorf("NEWSAPI is not configured in .env")
	}

	if limit <= 0 {
		limit = 20
	} else if limit > 100 {
		limit = 100 // Max allowed per page on free tier
	}

	// NewsAPI rate limits by Key, proxy doesn't help. Use direct client.
	client := GetDirectClient()

	apiURL := fmt.Sprintf("https://newsapi.org/v2/everything?q=%s&pageSize=%d", url.QueryEscape(query), limit)
	
	log.Printf("[NewsAPI] Fetching %s", apiURL)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("X-Api-Key", apiKey)

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("NewsAPI returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var newsResp NewsAPIResponse
	if err := json.Unmarshal(body, &newsResp); err != nil {
		return nil, err
	}

	var results []models.PageResult
	for _, article := range newsResp.Articles {
		text := article.Description
		if article.Content != "" {
			text += "\n\n" + article.Content
		}

		results = append(results, models.PageResult{
			URL:         article.URL,
			Status:      200,
			Title:       article.Title,
			Text:        text,
			Author:      article.Author,
			PublishedAt: article.PublishedAt,
			Engine:      "newsapi",
			ImageURL:    article.URLToImage,
			ScrapedAt:   time.Now(),
			Extracted: map[string]string{
				"source": article.Source.Name,
			},
		})
	}

	log.Printf("[NewsAPI] Found %d results for '%s'", len(results), query)
	return results, nil
}
