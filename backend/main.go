package main

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// Message payload structure
type Message struct {
	Username string `json:"username"`
	Text     string `json:"text"`
}

var (
	// In-memory storage for MVP (To be migrated to PostgreSQL)
	messages []Message
	// Mutex to prevent race conditions during concurrent API requests
	mu sync.Mutex
)

func main() {
	// Initialize local storage directory for media uploads
	os.MkdirAll("./uploads", os.ModePerm)

	// Init Gin router with default middleware (logger and recovery)
	r := gin.Default()

	// API Routing Group (Isolating API from static file serving)
	api := r.Group("/api")
	{
		// GET /api/messages: Fetch chat history (Polling approach for MVP)
		api.GET("/messages", func(c *gin.Context) {
			mu.Lock()
			defer mu.Unlock()
			c.JSON(http.StatusOK, messages)
		})

		// POST /api/messages: Handle incoming text payloads
		api.POST("/messages", func(c *gin.Context) {
			var newMsg Message
			if err := c.ShouldBindJSON(&newMsg); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}

			mu.Lock()
			messages = append(messages, newMsg)
			// Truncate history to prevent memory leaks in MVP
			if len(messages) > 50 {
				messages = messages[1:]
			}
			mu.Unlock()

			c.JSON(http.StatusOK, gin.H{"status": "ok"})
		})

		// POST /api/upload: Handle multipart/form-data media uploads
		api.POST("/upload", func(c *gin.Context) {
			file, err := c.FormFile("file")
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "File upload failed"})
				return
			}

			// Sanitize filename: extract base and replace spaces with underscores
			originalName := filepath.Base(file.Filename)
			cleanName := strings.ReplaceAll(originalName, " ", "_")

			// Generate unique identifier using UNIX timestamp to prevent overwrites
			filename := fmt.Sprintf("%d_%s", time.Now().Unix(), cleanName)
			savePath := filepath.Join("uploads", filename)

			// Persist file to local disk
			if err := c.SaveUploadedFile(file, savePath); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
				return
			}

			// Return relative URL for frontend rendering
			c.JSON(http.StatusOK, gin.H{"url": "/uploads/" + filename})
		})
	}

	// Serve uploaded media files directly
	r.Static("/uploads", "./uploads")

	// Serve React Vite build assets
	r.Static("/assets", "../frontend/dist/assets")
	r.StaticFile("/", "../frontend/dist/index.html")
	r.StaticFile("/vite.svg", "../frontend/dist/vite.svg")

	// SPA Catch-all routing: redirect unknown routes to index.html for React Router compatibility
	r.NoRoute(func(c *gin.Context) {
		c.File("../frontend/dist/index.html")
	})

	// Boot up the HTTP server
	r.Run(":8080")
}
