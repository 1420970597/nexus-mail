package mailingest

import (
	"bufio"
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestServicePersistWritesRawAndMetadata(t *testing.T) {
	tmpDir := t.TempDir()
	svc := NewService(tmpDir)
	svc.nowFn = func() time.Time {
		return time.Date(2026, 4, 13, 12, 0, 0, 123456000, time.UTC)
	}

	item, err := svc.Persist(context.Background(), Envelope{
		MailFrom: "sender@example.com",
		RcptTo:   []string{"user@example.com"},
		Helo:     "mx.test",
		RemoteIP: "127.0.0.1",
	}, []byte("Subject: test\r\n\r\nhello\r\n"))
	if err != nil {
		t.Fatalf("Persist() error = %v", err)
	}
	if item.SizeBytes == 0 {
		t.Fatal("expected stored message size")
	}
	if _, err := os.Stat(item.RawPath); err != nil {
		t.Fatalf("expected raw mail file: %v", err)
	}
	if _, err := os.Stat(item.MetadataPath); err != nil {
		t.Fatalf("expected metadata file: %v", err)
	}
	if filepath.Dir(item.RawPath) != filepath.Join(tmpDir, "2026-04-13") {
		t.Fatalf("unexpected raw path %s", item.RawPath)
	}

	payload, err := os.ReadFile(item.MetadataPath)
	if err != nil {
		t.Fatalf("read metadata: %v", err)
	}
	var decoded PersistedMessage
	if err := json.Unmarshal(payload, &decoded); err != nil {
		t.Fatalf("decode metadata: %v", err)
	}
	if decoded.MailFrom != "sender@example.com" {
		t.Fatalf("expected sender in metadata, got %q", decoded.MailFrom)
	}
}

func TestReadDataStopsAtDotTerminator(t *testing.T) {
	reader := bufioReader("Subject: hello\r\n\r\n..escaped\r\n.\r\n")
	raw, err := readData(reader)
	if err != nil {
		t.Fatalf("readData() error = %v", err)
	}
	if string(raw) != "Subject: hello\r\n\r\n.escaped\r\n" {
		t.Fatalf("unexpected raw payload %q", string(raw))
	}
}

func bufioReader(input string) *bufio.Reader {
	return bufio.NewReader(strings.NewReader(input))
}
