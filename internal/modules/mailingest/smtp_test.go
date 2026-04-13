package mailingest

import (
	"bufio"
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
	server := NewServer(svc, nil, NopPublisher{}, log.New(io.Discard, "", 0))
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
