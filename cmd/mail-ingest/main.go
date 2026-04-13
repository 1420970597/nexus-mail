package main

import (
	"bufio"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
)

func main() {
	port := os.Getenv("MAIL_INGEST_PORT")
	if port == "" {
		port = "2525"
	}
	ln, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatal(err)
	}
	defer ln.Close()
	log.Printf("mail-ingest listening on :%s", port)
	for {
		conn, err := ln.Accept()
		if err != nil {
			log.Printf("accept error: %v", err)
			continue
		}
		go handleConn(conn)
	}
}

func handleConn(conn net.Conn) {
	defer conn.Close()
	reader := bufio.NewReader(conn)
	_, _ = fmt.Fprint(conn, "220 nexus-mail mail-ingest ready\r\n")
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return
		}
		cmd := strings.ToUpper(strings.TrimSpace(line))
		switch {
		case strings.HasPrefix(cmd, "EHLO"), strings.HasPrefix(cmd, "HELO"):
			_, _ = fmt.Fprint(conn, "250-nexus-mail\r\n250 PIPELINING\r\n")
		case strings.HasPrefix(cmd, "MAIL FROM:"), strings.HasPrefix(cmd, "RCPT TO:"):
			_, _ = fmt.Fprint(conn, "250 OK\r\n")
		case cmd == "DATA":
			_, _ = fmt.Fprint(conn, "354 End data with <CR><LF>.<CR><LF>\r\n")
			for {
				dataLine, err := reader.ReadString('\n')
				if err != nil {
					return
				}
				if strings.TrimSpace(dataLine) == "." {
					break
				}
			}
			_, _ = fmt.Fprint(conn, "250 Queued\r\n")
		case cmd == "QUIT":
			_, _ = fmt.Fprint(conn, "221 Bye\r\n")
			return
		default:
			_, _ = fmt.Fprint(conn, "250 OK\r\n")
		}
	}
}
