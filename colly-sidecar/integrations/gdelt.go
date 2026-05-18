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

type GDELTResponse struct {
	Articles []struct {
		URL           string `json:"url"`
		Title         string `json:"title"`
		SeenDate      string `json:"seendate"`
		Domain        string `json:"domain"`
		Language      string `json:"language"`
		SourceCountry string `json:"sourcecountry"`
	} `json:"articles"`
}

// FetchGDELT searches the GDELT Doc 2.0 API (Free, no key). Uses Proxy to avoid IP blocks.
func FetchGDELT(query string, limit int) ([]models.PageResult, error) {
	if limit <= 0 {
		limit = 20
	} else if limit > 250 {
		limit = 250
	}

	// GDELT might rate limit by IP, so use proxy if available
	client := GetProxyClient()

	apiURL := fmt.Sprintf("https://api.gdeltproject.org/api/v2/doc/doc?query=%s&mode=artlist&maxrecords=%d&format=json", url.QueryEscape(query), limit)
	
	log.Printf("[GDELT] Fetching %s", apiURL)
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
		return nil, fmt.Errorf("GDELT API returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var gdeltResp GDELTResponse
	if err := json.Unmarshal(body, &gdeltResp); err != nil {
		return nil, err
	}

	var results []models.PageResult
	for _, article := range gdeltResp.Articles {
		
		// Parse GDELT seendate format: YYYYMMDDTHHMMSSZ
		var pubDate time.Time
		if parsedTime, err := time.Parse("20060102T150405Z", article.SeenDate); err == nil {
			pubDate = parsedTime
		}

		results = append(results, models.PageResult{
			URL:         article.URL,
			Status:      200,
			Title:       article.Title,
			Text:        article.Title, // GDELT only gives titles in artlist mode
			Author:      article.Domain, // Using domain as author
			PublishedAt: pubDate,
			Engine:      "gdelt",
			ScrapedAt:   time.Now(),
			Extracted: map[string]string{
				"domain":         article.Domain,
				"language":       article.Language,
				"source_country": article.SourceCountry,
			},
		})
	}

	log.Printf("[GDELT] Found %d results for '%s'", len(results), query)
	return results, nil
}
