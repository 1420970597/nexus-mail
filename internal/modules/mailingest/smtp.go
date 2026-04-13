package mailingest

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"strings"
)

type Server struct {
	service   *Service
	repo      *Repository
	publisher Publisher
	logger    *log.Logger
}

func NewServer(service *Service, repo *Repository, publisher Publisher, logger *log.Logger) *Server {
	if logger == nil {
		logger = log.Default()
	}
	if publisher == nil {
		publisher = NopPublisher{}
	}
	return &Server{service: service, repo: repo, publisher: publisher, logger: logger}
}

func (s *Server) HandleConn(conn net.Conn) {
	defer conn.Close()
	reader := bufio.NewReader(conn)
	_, _ = fmt.Fprint(conn, "220 nexus-mail mail-ingest ready\r\n")

	remoteIP := remoteAddr(conn.RemoteAddr())
	var env Envelope
	resetEnvelope := func() {
		env = Envelope{RemoteIP: remoteIP}
	}
	resetEnvelope()

	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if err != io.EOF {
				s.logger.Printf("smtp read error: %v", err)
			}
			return
		}
		cmd := strings.TrimSpace(line)
		upper := strings.ToUpper(cmd)
		switch {
		case strings.HasPrefix(upper, "EHLO "), strings.HasPrefix(upper, "HELO "):
			env.Helo = strings.TrimSpace(cmd[5:])
			_, _ = fmt.Fprint(conn, "250-nexus-mail\r\n250 PIPELINING\r\n")
		case strings.HasPrefix(upper, "MAIL FROM:"):
			env.MailFrom = smtpAddress(cmd[len("MAIL FROM:"):])
			env.RcptTo = nil
			_, _ = fmt.Fprint(conn, "250 OK\r\n")
		case strings.HasPrefix(upper, "RCPT TO:"):
			env.RcptTo = append(env.RcptTo, smtpAddress(cmd[len("RCPT TO:"):]))
			_, _ = fmt.Fprint(conn, "250 OK\r\n")
		case upper == "RSET":
			resetEnvelope()
			_, _ = fmt.Fprint(conn, "250 OK\r\n")
		case upper == "NOOP":
			_, _ = fmt.Fprint(conn, "250 OK\r\n")
		case upper == "DATA":
			if env.MailFrom == "" || len(env.RcptTo) == 0 {
				_, _ = fmt.Fprint(conn, "554 Missing MAIL FROM or RCPT TO\r\n")
				continue
			}
			_, _ = fmt.Fprint(conn, "354 End data with <CR><LF>.<CR><LF>\r\n")
			raw, err := readData(reader)
			if err != nil {
				s.logger.Printf("smtp data read error: %v", err)
				_, _ = fmt.Fprint(conn, "451 Requested action aborted: local error in processing\r\n")
				return
			}
			item, err := s.service.Persist(context.Background(), env, raw)
			if err != nil {
				s.logger.Printf("persist mail error: %v", err)
				_, _ = fmt.Fprint(conn, "451 Requested action aborted: local error in processing\r\n")
				continue
			}
			if err := s.repo.SaveMessage(context.Background(), item); err != nil {
				s.logger.Printf("save inbound message metadata error: %v", err)
				_, _ = fmt.Fprint(conn, "451 Requested action aborted: local error in processing\r\n")
				continue
			}
			if err := s.publisher.PublishParseJob(context.Background(), item); err != nil {
				s.logger.Printf("publish parse job error: %v", err)
				_, _ = fmt.Fprint(conn, "451 Requested action aborted: local error in processing\r\n")
				continue
			}
			s.logger.Printf("stored mail id=%s from=%s rcpt=%d bytes=%d raw=%s", item.ID, item.MailFrom, len(item.RcptTo), item.SizeBytes, item.RawPath)
			_, _ = fmt.Fprint(conn, "250 Queued\r\n")
			resetEnvelope()
		case upper == "QUIT":
			_, _ = fmt.Fprint(conn, "221 Bye\r\n")
			return
		default:
			_, _ = fmt.Fprint(conn, "250 OK\r\n")
		}
	}
}

func readData(reader *bufio.Reader) ([]byte, error) {
	var buf bytes.Buffer
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return nil, err
		}
		trimmed := strings.TrimRight(line, "\r\n")
		if trimmed == "." {
			break
		}
		if strings.HasPrefix(trimmed, "..") {
			trimmed = trimmed[1:]
		}
		buf.WriteString(trimmed)
		buf.WriteString("\r\n")
	}
	return buf.Bytes(), nil
}

func smtpAddress(raw string) string {
	value := strings.TrimSpace(raw)
	value = strings.Trim(value, "<>")
	return strings.TrimSpace(value)
}

func remoteAddr(addr net.Addr) string {
	if addr == nil {
		return ""
	}
	host, _, err := net.SplitHostPort(addr.String())
	if err == nil {
		return host
	}
	return addr.String()
}
