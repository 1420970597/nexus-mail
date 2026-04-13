package main

import (
	"log"
	"net"
	"os"

	"github.com/1420970597/nexus-mail/internal/modules/mailingest"
	"github.com/1420970597/nexus-mail/internal/platform/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	service := mailingest.NewService(cfg.MailIngestSpoolDir)
	server := mailingest.NewServer(service, log.Default())
	ln, err := net.Listen("tcp", ":"+cfg.MailIngestPort)
	if err != nil {
		log.Fatal(err)
	}
	defer ln.Close()

	if err := os.MkdirAll(cfg.MailIngestSpoolDir, 0o755); err != nil {
		log.Fatalf("prepare spool dir: %v", err)
	}
	log.Printf("mail-ingest listening on :%s, spool=%s", cfg.MailIngestPort, cfg.MailIngestSpoolDir)
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("accept error: %v", err)
			continue
		}
		go server.HandleConn(conn)
	}
}
