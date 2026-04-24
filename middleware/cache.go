package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

const cacheVersion = "20260424-desktop-model-config-v2"

func Cache() func(c *gin.Context) {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		if strings.HasPrefix(path, "/api/") {
			c.Header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
		} else if c.Request.Method == http.MethodGet && (path == "/" || !strings.Contains(path, ".")) {
			c.Header("Cache-Control", "no-cache, no-store, must-revalidate")
			c.Header("Pragma", "no-cache")
			c.Header("Expires", "0")
		} else {
			c.Header("Cache-Control", "public, max-age=604800, immutable") // one week
		}
		c.Header("Cache-Version", cacheVersion)
		c.Next()
	}
}
