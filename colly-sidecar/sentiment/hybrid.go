package sentiment

import (
	"log"

	"github.com/paksentiment/colly-sidecar/models"
)

// Analyzer is the common interface for all sentiment analysis engines.
type Analyzer interface {
	AnalyzePages(results []models.PageResult) bool
	IsAvailable() bool
}

// HybridAnalyzer coordinates between multiple LLM backends with fallbacks.
type HybridAnalyzer struct {
	Primary   Analyzer
	Secondary Analyzer
}

// NewHybridAnalyzer creates a fallback-enabled analyzer.
func NewHybridAnalyzer(primary, secondary Analyzer) *HybridAnalyzer {
	return &HybridAnalyzer{
		Primary:   primary,
		Secondary: secondary,
	}
}

func (h *HybridAnalyzer) IsAvailable() bool {
	return h.Primary.IsAvailable() || h.Secondary.IsAvailable()
}

func (h *HybridAnalyzer) AnalyzePages(results []models.PageResult) bool {
	if h.Primary.IsAvailable() {
		log.Println("[Sentiment] Attempting primary sentiment engine...")
		success := h.Primary.AnalyzePages(results)
		if success {
			return true
		}
		log.Println("[Sentiment] Primary engine failed or returned no results, falling back...")
	}

	if h.Secondary.IsAvailable() {
		log.Println("[Sentiment] Attempting secondary sentiment engine...")
		return h.Secondary.AnalyzePages(results)
	}

	return false
}
