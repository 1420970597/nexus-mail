package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.Println("nexus-mail worker booted")
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	for {
		select {
		case <-ticker.C:
			log.Println("worker heartbeat")
		case sig := <-sigCh:
			log.Printf("worker shutting down: %s", sig.String())
			return
		}
	}
}
