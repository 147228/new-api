package router

import (
	"fmt"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/middleware"
	"github.com/QuantumNous/new-api/model"

	"github.com/gin-gonic/gin"
)

func SetWriterRouter(router *gin.Engine) {
	writerAPIURL := os.Getenv("WRITER_API_URL")
	if writerAPIURL == "" {
		writerAPIURL = "http://writer-api:8100"
	}

	target, err := url.Parse(writerAPIURL)
	if err != nil {
		fmt.Printf("Invalid WRITER_API_URL: %s\n", writerAPIURL)
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(target)
	// Rewrite redirect Location headers so they go through the proxy
	proxy.ModifyResponse = func(resp *http.Response) error {
		if loc := resp.Header.Get("Location"); loc != "" {
			targetPrefix := target.String()
			if strings.HasPrefix(loc, targetPrefix) {
				resp.Header.Set("Location", "/writer-api"+loc[len(targetPrefix):])
			} else if strings.HasPrefix(loc, "/") {
				resp.Header.Set("Location", "/writer-api"+loc)
			}
		}
		return nil
	}

	writerGroup := router.Group("/writer-api")
	writerGroup.Use(writerAuth())
	writerGroup.Any("/*path", func(c *gin.Context) {
		// 注入用户信息到请求 header（内网通信，Python 端直接信任）
		userId, exists := c.Get("id")
		if exists {
			c.Request.Header.Set("X-User-Id", fmt.Sprintf("%v", userId))
		}
		group, exists := c.Get("group")
		if exists && group != nil {
			c.Request.Header.Set("X-User-Group", fmt.Sprintf("%v", group))
		}

		// 查询用户额度
		if userId != nil {
			var uid int
			switch v := userId.(type) {
			case int:
				uid = v
			case float64:
				uid = int(v)
			default:
				uidStr := fmt.Sprintf("%v", v)
				uid, _ = strconv.Atoi(uidStr)
			}
			if uid > 0 {
				quota, err := model.GetUserQuota(uid, false)
				if err == nil {
					c.Request.Header.Set("X-User-Quota", strconv.FormatInt(int64(quota), 10))
				}
			}
		}

		// 修改请求路径：去掉 /writer-api 前缀
		c.Request.URL.Path = c.Param("path")
		c.Request.Host = target.Host

		proxy.ServeHTTP(c.Writer, c.Request)
	})
}

// writerAuth 是一个简化的认证中间件，兼容 session 和 access token
// 但不要求 New-Api-User header（因为 writer 前端可能不传此 header）
func writerAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 优先尝试标准 UserAuth
		middleware.UserAuth()(c)
	}
}
