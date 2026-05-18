package perf

import (
	"fmt"
	"log"
	"os"
	"time"
)

// Log appends a timestamped log to the centralized perf log file
func Log(message string) {
	logPath := "/Users/mrgoblin/workspace/uni/fyp/new_current/main-server/logs/smart-search-perf.log"
	f, err := os.OpenFile(logPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		log.Printf("Failed to open perf log file: %v", err)
		return
	}
	defer f.Close()

	timestamp := time.Now().UTC().Format("2006-01-02T15:04:05.000Z")
	logEntry := fmt.Sprintf("[%s] %s\n", timestamp, message)
	if _, err := f.WriteString(logEntry); err != nil {
		log.Printf("Failed to write to perf log: %v", err)
	}
}
