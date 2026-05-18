package integrations

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/paksentiment/colly-sidecar/models"
)

type StackOverflowResponse struct {
	Items []struct {
		Tags  []string `json:"tags"`
		Owner struct {
			DisplayName string `json:"display_name"`
		} `json:"owner"`
		AnswerCount  int    `json:"answer_count"`
		Score        int    `json:"score"`
		CreationDate int64  `json:"creation_date"`
		Link         string `json:"link"`
		Title        string `json:"title"`
	} `json:"items"`
}

// FetchStackOverflow searches StackOverflow (Free. Rate limit 300/day per IP). Uses Proxy to avoid IP blocks.
func FetchStackOverflow(query string, limit int) ([]models.PageResult, error) {
	if limit <= 0 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}

	// Unauthenticated requests are limited to 300 per IP per day. Use proxy.
	client := GetProxyClient()

	apiURL := fmt.Sprintf("https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=activity&q=%s&site=stackoverflow&pagesize=%d", url.QueryEscape(query), limit)
	
	log.Printf("[StackOverflow] Fetching %s", apiURL)
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
		return nil, fmt.Errorf("StackOverflow API returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var soResp StackOverflowResponse
	if err := json.Unmarshal(body, &soResp); err != nil {
		return nil, err
	}

	var results []models.PageResult
	for _, item := range soResp.Items {
		
		pubDate := time.Unix(item.CreationDate, 0)
		
		// The search API doesn't return the body of the question by default unless using a custom filter.
		// We'll construct a text representation combining title and tags.
		text := item.Title
		if len(item.Tags) > 0 {
			text += "\n\nTags: " + strings.Join(item.Tags, ", ")
		}

		results = append(results, models.PageResult{
			URL:         item.Link,
			Status:      200,
			Title:       item.Title,
			Text:        text,
			Author:      item.Owner.DisplayName,
			PublishedAt: pubDate,
			Engine:      "stackoverflow",
			ScrapedAt:   time.Now(),
			Extracted: map[string]string{
				"score":        fmt.Sprintf("%d", item.Score),
				"answer_count": fmt.Sprintf("%d", item.AnswerCount),
				"tags":         strings.Join(item.Tags, ","),
			},
		})
	}

	log.Printf("[StackOverflow] Found %d results for '%s'", len(results), query)
	return results, nil
}
