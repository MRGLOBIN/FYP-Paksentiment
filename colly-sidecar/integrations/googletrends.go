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

type GoogleTrendsResponse struct {
	Success   bool   `json:"success"`
	Keyword   string `json:"keyword"`
	Timeframe string `json:"timeframe"`
	Results   []struct {
		Date     string `json:"date"`
		Interest int    `json:"interest"`
	} `json:"results"`
}

// FetchGoogleTrends queries the Python FastAPI gateway which runs pytrends.
func FetchGoogleTrends(query string, timeframe string) ([]models.PageResult, error) {
	if timeframe == "" {
		timeframe = "today 1-m"
	}

	fastAPIBase := os.Getenv("FASTAPI_URL")
	if fastAPIBase == "" {
		fastAPIBase = "http://localhost:8000"
	}

	apiURL := fmt.Sprintf("%s/trends/interest?query=%s&timeframe=%s", fastAPIBase, url.QueryEscape(query), url.QueryEscape(timeframe))
	
	log.Printf("[GoogleTrends] Fetching %s", apiURL)
	client := GetDirectClient() // Local communication, no proxy needed
	
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
		return nil, fmt.Errorf("FastAPI Google Trends returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var trendsResp GoogleTrendsResponse
	if err := json.Unmarshal(body, &trendsResp); err != nil {
		return nil, err
	}

	var results []models.PageResult
	for _, trend := range trendsResp.Results {
		
		pubDate := time.Now()
		// parse ISO format returned by Python
		if t, err := time.Parse(time.RFC3339, trend.Date); err == nil {
			pubDate = t
		} else if t, err := time.Parse("2006-01-02T15:04:05", trend.Date); err == nil {
			pubDate = t
		}

		results = append(results, models.PageResult{
			URL:         fmt.Sprintf("https://trends.google.com/trends/explore?q=%s&date=%s", url.QueryEscape(query), url.QueryEscape(timeframe)),
			Status:      200,
			Title:       fmt.Sprintf("Google Trends: %s", query),
			Text:        fmt.Sprintf("Interest over time for '%s': %d", query, trend.Interest),
			Author:      "Google Trends",
			PublishedAt: pubDate,
			Engine:      "googletrends",
			ScrapedAt:   time.Now(),
			Confidence:  float64(trend.Interest) / 100.0, // Treat interest 0-100 as confidence 0.0-1.0
			Extracted: map[string]string{
				"interest":  fmt.Sprintf("%d", trend.Interest),
				"timeframe": timeframe,
			},
		})
	}

	log.Printf("[GoogleTrends] Mapped %d data points for '%s'", len(results), query)
	return results, nil
}
