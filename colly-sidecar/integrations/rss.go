package integrations

import (
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"

	"github.com/paksentiment/colly-sidecar/models"
)

type RSS struct {
	Channel struct {
		Title string `xml:"title"`
		Items []struct {
			Title       string `xml:"title"`
			Link        string `xml:"link"`
			Description string `xml:"description"`
			PubDate     string `xml:"pubDate"`
			Creator     string `xml:"creator"` // Sometimes author is in dc:creator
		} `xml:"item"`
	} `xml:"channel"`
}

// FetchRSS parses an arbitrary RSS feed URL (Uses proxy to avoid datacenter blocks)
func FetchRSS(feedURL string, limit int) ([]models.PageResult, error) {
	if limit <= 0 {
		limit = 20
	}

	// RSS requests hit random servers, use proxy if available
	client := GetProxyClient()

	log.Printf("[RSS] Fetching %s", feedURL)
	req, err := http.NewRequest("GET", feedURL, nil)
	if err != nil {
		return nil, err
	}
	
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("RSS feed returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var feed RSS
	if err := xml.Unmarshal(body, &feed); err != nil {
		return nil, fmt.Errorf("failed to parse RSS XML: %v", err)
	}

	var results []models.PageResult
	for i, item := range feed.Channel.Items {
		if i >= limit {
			break
		}

		// Basic date parsing attempt
		pubDate := time.Now()
		if t, err := time.Parse(time.RFC1123Z, item.PubDate); err == nil {
			pubDate = t
		} else if t, err := time.Parse(time.RFC1123, item.PubDate); err == nil {
			pubDate = t
		}

		author := item.Creator
		if author == "" {
			author = feed.Channel.Title
		}

		results = append(results, models.PageResult{
			URL:         item.Link,
			Status:      200,
			Title:       item.Title,
			Text:        item.Description,
			Author:      author,
			PublishedAt: pubDate,
			Engine:      "rss",
			ScrapedAt:   time.Now(),
			Extracted: map[string]string{
				"feed_title": feed.Channel.Title,
			},
		})
	}

	log.Printf("[RSS] Found %d items in feed %s", len(results), feedURL)
	return results, nil
}
