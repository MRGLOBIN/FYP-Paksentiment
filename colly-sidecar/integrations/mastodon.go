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

type MastodonSearchResponse struct {
	Statuses []struct {
		ID        string    `json:"id"`
		URL       string    `json:"url"`
		CreatedAt time.Time `json:"created_at"`
		Content   string    `json:"content"`
		Account   struct {
			Username    string `json:"username"`
			DisplayName string `json:"display_name"`
		} `json:"account"`
		RepliesCount  int `json:"replies_count"`
		ReblogsCount  int `json:"reblogs_count"`
		FavouritesCount int `json:"favourites_count"`
	} `json:"statuses"`
}

// FetchMastodon searches mastodon.social (Free, no key). Uses Proxy to avoid IP blocks.
func FetchMastodon(query string, limit int) ([]models.PageResult, error) {
	if limit <= 0 {
		limit = 20
	} else if limit > 40 {
		limit = 40
	}

	// Public search endpoints can easily block datacenters. Use proxy.
	client := GetProxyClient()

	apiURL := fmt.Sprintf("https://mastodon.social/api/v2/search?q=%s&type=statuses&limit=%d", url.QueryEscape(query), limit)
	
	log.Printf("[Mastodon] Fetching %s", apiURL)
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		return nil, err
	}
	// Mastodon requires a user agent
	req.Header.Set("User-Agent", "PakSentiment-Crawler/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("Mastodon API returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var mastoResp MastodonSearchResponse
	if err := json.Unmarshal(body, &mastoResp); err != nil {
		return nil, err
	}

	var results []models.PageResult
	for _, status := range mastoResp.Statuses {
		// Mastodon returns HTML in the content field. For basic sentiment we can just pass it,
		// or ideally strip HTML tags. For now, we leave it since Ollama can handle HTML fragments.
		
		author := status.Account.DisplayName
		if author == "" {
			author = status.Account.Username
		}

		// Use the start of the content as a pseudo-title
		title := status.Content
		if len(title) > 50 {
			title = title[:47] + "..."
		}
		
		// Clean up common HTML paragraphs if needed, but strings.ReplaceAll is quick
		cleanContent := strings.ReplaceAll(status.Content, "<p>", "")
		cleanContent = strings.ReplaceAll(cleanContent, "</p>", "\n")
		cleanContent = strings.ReplaceAll(cleanContent, "<br />", "\n")

		results = append(results, models.PageResult{
			URL:         status.URL,
			Status:      200,
			Title:       title,
			Text:        cleanContent,
			Author:      author,
			PublishedAt: status.CreatedAt,
			Engine:      "mastodon",
			ScrapedAt:   time.Now(),
			Extracted: map[string]string{
				"favorites": fmt.Sprintf("%d", status.FavouritesCount),
				"reblogs":   fmt.Sprintf("%d", status.ReblogsCount),
				"replies":   fmt.Sprintf("%d", status.RepliesCount),
			},
		})
	}

	log.Printf("[Mastodon] Found %d results for '%s'", len(results), query)
	return results, nil
}
