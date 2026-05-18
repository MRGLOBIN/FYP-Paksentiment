package integrations

import (
	"crypto/tls"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"
)

// GetDirectClient returns a standard HTTP client with a timeout
func GetDirectClient() *http.Client {
	return &http.Client{
		Timeout: 15 * time.Second,
	}
}

// GetProxyClient returns an HTTP client that uses the PROXY_URL from env if available
func GetProxyClient() *http.Client {
	proxyStr := os.Getenv("PROXY_URL")
	
	if proxyStr == "" {
		// Fallback to direct if no proxy configured
		return GetDirectClient()
	}

	proxyURL, err := url.Parse(proxyStr)
	if err != nil {
		log.Printf("[Integrations] Failed to parse PROXY_URL: %v. Falling back to direct client.", err)
		return GetDirectClient()
	}

	transport := &http.Transport{
		Proxy: http.ProxyURL(proxyURL),
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true}, // Helpful for some proxies
	}

	log.Printf("[Integrations] Initialized client with proxy: %s", proxyURL.Host)

	return &http.Client{
		Transport: transport,
		Timeout:   30 * time.Second, // Proxies can be slower
	}
}
