package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/1420970597/nexus-mail/internal/platform/config"
	httpx "github.com/1420970597/nexus-mail/internal/platform/http"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal(err)
	}
	if cfg.AppEnv != "development" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := httpx.NewRouter()

	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.AppPort),
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}

	log.Printf("nexus-mail api listening on :%s", cfg.AppPort)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
