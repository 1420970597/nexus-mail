package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	log.Println("nexus-mail scheduler booted")
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	for {
		select {
		case <-ticker.C:
			log.Println("scheduler heartbeat")
		case sig := <-sigCh:
			log.Printf("scheduler shutting down: %s", sig.String())
			return
		}
	}
}
