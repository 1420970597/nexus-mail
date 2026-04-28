package mailingest

import (
	"bufio"
	"context"
	"io"
	"log"
	"net"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestServerHandleConnPersistsMail(t *testing.T) {
	tmpDir := t.TempDir()
	svc := NewService(tmpDir)
	svc.nowFn = func() time.Time {
		return time.Date(2026, 4, 13, 13, 0, 0, 0, time.UTC)
	}
	server := NewServer(svc, nil, NopObjectStorage{}, NopPublisher{}, log.New(io.Discard, "", 0))
	client, backend := net.Pipe()
	defer client.Close()
	go server.HandleConn(backend)

	reader := bufio.NewReader(client)
	mustReadContains(t, reader, "220 nexus-mail mail-ingest ready")
	mustWrite(t, client, "EHLO test.local\r\n")
	mustReadContains(t, reader, "250-nexus-mail")
	mustReadContains(t, reader, "250 PIPELINING")
	mustWrite(t, client, "MAIL FROM:<sender@example.com>\r\n")
	mustReadContains(t, reader, "250 OK")
	mustWrite(t, client, "RCPT TO:<receiver@example.com>\r\n")
	mustReadContains(t, reader, "250 OK")
	mustWrite(t, client, "DATA\r\n")
	mustReadContains(t, reader, "354 End data")
	mustWrite(t, client, "Subject: hello\r\n\r\nbody\r\n.\r\n")
	mustReadContains(t, reader, "250 Queued")
	mustWrite(t, client, "QUIT\r\n")
	mustReadContains(t, reader, "221 Bye")

	matches, err := filepath.Glob(filepath.Join(tmpDir, "2026-04-13", "*.eml"))
	if err != nil {
		t.Fatalf("glob raw mail: %v", err)
	}
	if len(matches) != 1 {
		t.Fatalf("expected 1 raw mail file, got %d", len(matches))
	}
}

func mustWrite(t *testing.T, conn net.Conn, value string) {
	t.Helper()
	if _, err := conn.Write([]byte(value)); err != nil {
		t.Fatalf("write %q: %v", value, err)
	}
}

func mustReadContains(t *testing.T, reader *bufio.Reader, want string) {
	t.Helper()
	line, err := reader.ReadString('\n')
	if err != nil {
		t.Fatalf("read line: %v", err)
	}
	if !strings.Contains(line, want) {
		t.Fatalf("expected %q in %q", want, line)
	}
}

type stubSenderRiskEvaluator struct {
	matched bool
	reason  string
	senders []string
}

func (s *stubSenderRiskEvaluator) EvaluateSender(_ context.Context, sender string) (bool, string, error) {
	s.senders = append(s.senders, sender)
	return s.matched, s.reason, nil
}

func TestServerHandleConnRejectsBlacklistedSenderBeforeData(t *testing.T) {
	tmpDir := t.TempDir()
	svc := NewService(tmpDir)
	evaluator := &stubSenderRiskEvaluator{matched: true, reason: "email:bad@example.test"}
	server := NewServerWithRiskEvaluator(svc, nil, NopObjectStorage{}, NopPublisher{}, evaluator, log.New(io.Discard, "", 0))
	client, backend := net.Pipe()
	defer client.Close()
	go server.HandleConn(backend)

	reader := bufio.NewReader(client)
	mustReadContains(t, reader, "220 nexus-mail mail-ingest ready")
	mustWrite(t, client, "EHLO test.local\r\n")
	mustReadContains(t, reader, "250-nexus-mail")
	mustReadContains(t, reader, "250 PIPELINING")
	mustWrite(t, client, "MAIL FROM:<bad@example.test>\r\n")
	mustReadContains(t, reader, "250 OK")
	mustWrite(t, client, "RCPT TO:<receiver@example.com>\r\n")
	mustReadContains(t, reader, "250 OK")
	mustWrite(t, client, "DATA\r\n")
	mustReadContains(t, reader, "554 Sender blocked by policy")
	if len(evaluator.senders) != 1 || evaluator.senders[0] != "bad@example.test" {
		t.Fatalf("expected blacklist evaluator to inspect sender, got %#v", evaluator.senders)
	}
	matches, err := filepath.Glob(filepath.Join(tmpDir, "*", "*.eml"))
	if err != nil {
		t.Fatalf("glob raw mail: %v", err)
	}
	if len(matches) != 0 {
		t.Fatalf("expected no persisted mail for blocked sender, got %v", matches)
	}
}

func TestSMTPAddressParsesPathBeforeParameters(t *testing.T) {
	cases := map[string]string{
		"<bad@example.test> SIZE=123":       "bad@example.test",
		" <Bad@Example.Test> BODY=8BITMIME": "Bad@Example.Test",
		"plain@example.test SIZE=123":       "plain@example.test",
	}
	for raw, want := range cases {
		if got := smtpAddress(raw); got != want {
			t.Fatalf("smtpAddress(%q) = %q, want %q", raw, got, want)
		}
	}
}

func TestServerHandleConnRejectsBlacklistedSenderWithMailFromParameters(t *testing.T) {
	tmpDir := t.TempDir()
	svc := NewService(tmpDir)
	evaluator := &stubSenderRiskEvaluator{matched: true, reason: "email:bad@example.test"}
	server := NewServerWithRiskEvaluator(svc, nil, NopObjectStorage{}, NopPublisher{}, evaluator, log.New(io.Discard, "", 0))
	client, backend := net.Pipe()
	defer client.Close()
	go server.HandleConn(backend)

	reader := bufio.NewReader(client)
	mustReadContains(t, reader, "220 nexus-mail mail-ingest ready")
	mustWrite(t, client, "EHLO test.local\r\n")
	mustReadContains(t, reader, "250-nexus-mail")
	mustReadContains(t, reader, "250 PIPELINING")
	mustWrite(t, client, "MAIL FROM:<bad@example.test> SIZE=123\r\n")
	mustReadContains(t, reader, "250 OK")
	mustWrite(t, client, "RCPT TO:<receiver@example.com>\r\n")
	mustReadContains(t, reader, "250 OK")
	mustWrite(t, client, "DATA\r\n")
	mustReadContains(t, reader, "554 Sender blocked by policy")
	if len(evaluator.senders) != 1 || evaluator.senders[0] != "bad@example.test" {
		t.Fatalf("expected normalized sender before MAIL FROM parameters, got %#v", evaluator.senders)
	}
}
