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

type NewsDataResponse struct {
	Status       string `json:"status"`
	TotalResults int    `json:"totalResults"`
	Results      []struct {
		Title       string   `json:"title"`
		Link        string   `json:"link"`
		Creator     []string `json:"creator"`
		Description string   `json:"description"`
		Content     string   `json:"content"`
		PubDate     string   `json:"pubDate"`
		SourceID    string   `json:"source_id"`
		ImageURL    string   `json:"image_url"`
	} `json:"results"`
}

// FetchNewsData searches NewsData.io (Requires API Key, rate limit 200/day on free)
func FetchNewsData(query string, limit int) ([]models.PageResult, error) {
	apiKey := os.Getenv("NEWSDATA_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("NEWSDATA_API_KEY is not configured in .env")
	}

	if limit <= 0 {
		limit = 10
	} else if limit > 10 {
		limit = 10 // NewsData free tier allows up to 10 results per page, requesting >10 returns 422
	}

	// Rate limit is on the key, so proxy doesn't help. Use direct client.
	client := GetDirectClient()

	apiURL := fmt.Sprintf("https://newsdata.io/api/1/news?apikey=%s&q=%s&size=%d", apiKey, url.QueryEscape(query), limit)
	
	log.Printf("[NewsData] Fetching %s", apiURL)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("NewsData API returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var newsResp NewsDataResponse
	if err := json.Unmarshal(body, &newsResp); err != nil {
		return nil, err
	}

	var results []models.PageResult
	for _, article := range newsResp.Results {
		text := article.Description
		if article.Content != "" {
			text += "\n\n" + article.Content
		}

		author := ""
		if len(article.Creator) > 0 && article.Creator[0] != "" {
			author = article.Creator[0]
		} else {
			author = article.SourceID
		}

		// NewsData pubDate format is typically "YYYY-MM-DD HH:MM:SS"
		pubDate := time.Now()
		if t, err := time.Parse("2006-01-02 15:04:05", article.PubDate); err == nil {
			pubDate = t
		}

		results = append(results, models.PageResult{
			URL:         article.Link,
			Status:      200,
			Title:       article.Title,
			Text:        text,
			Author:      author,
			PublishedAt: pubDate,
			Engine:      "newsdata",
			ImageURL:    article.ImageURL,
			ScrapedAt:   time.Now(),
			Extracted: map[string]string{
				"source": article.SourceID,
			},
		})
	}

	log.Printf("[NewsData] Found %d results for '%s'", len(results), query)
	return results, nil
}
