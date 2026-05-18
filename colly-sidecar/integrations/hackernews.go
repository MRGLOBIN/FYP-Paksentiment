package integrations

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"time"

	"github.com/paksentiment/colly-sidecar/models"
)

// HNSearchResponse maps the response from Algolia HN search
type HNSearchResponse struct {
	Hits []struct {
		ObjectID    string    `json:"objectID"`
		Title       string    `json:"title"`
		URL         string    `json:"url"`
		Author      string    `json:"author"`
		Points      int       `json:"points"`
		StoryText   string    `json:"story_text"`
		CreatedAt   time.Time `json:"created_at"`
		NumComments int       `json:"num_comments"`
	} `json:"hits"`
}

// FetchHackerNews searches Hacker News using the Algolia API (Free, no key)
func FetchHackerNews(query string, limit int) ([]models.PageResult, error) {
	if limit <= 0 {
		limit = 20
	}

	// HN API does not strict rate limit, so we use direct client
	client := GetDirectClient()

	apiURL := fmt.Sprintf("http://hn.algolia.com/api/v1/search?query=%s&hitsPerPage=%d", url.QueryEscape(query), limit)
	
	log.Printf("[HackerNews] Fetching %s", apiURL)
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
		return nil, fmt.Errorf("HackerNews API returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var hnResp HNSearchResponse
	if err := json.Unmarshal(body, &hnResp); err != nil {
		return nil, err
	}

	var results []models.PageResult
	for _, hit := range hnResp.Hits {
		text := hit.Title
		if hit.StoryText != "" {
			text += "\n\n" + hit.StoryText
		}

		itemURL := hit.URL
		if itemURL == "" {
			itemURL = "https://news.ycombinator.com/item?id=" + hit.ObjectID
		}

		results = append(results, models.PageResult{
			URL:         itemURL,
			Status:      200,
			Title:       hit.Title,
			Text:        text,
			Author:      hit.Author,
			PublishedAt: hit.CreatedAt,
			Engine:      "hackernews",
			ScrapedAt:   time.Now(),
			Extracted: map[string]string{
				"points":       fmt.Sprintf("%d", hit.Points),
				"num_comments": fmt.Sprintf("%d", hit.NumComments),
			},
		})
	}

	log.Printf("[HackerNews] Found %d results for '%s'", len(results), query)
	return results, nil
}
