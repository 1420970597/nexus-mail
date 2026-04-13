package mailingest

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Service struct {
	spoolDir string
	nowFn    func() time.Time
}

func NewService(spoolDir string) *Service {
	if strings.TrimSpace(spoolDir) == "" {
		spoolDir = filepath.Join(os.TempDir(), "nexus-mail-ingest")
	}
	return &Service{spoolDir: spoolDir, nowFn: time.Now}
}

func (s *Service) Persist(_ context.Context, env Envelope, raw []byte) (PersistedMessage, error) {
	now := s.nowFn().UTC()
	msgID := now.Format("20060102T150405.000000000")
	dayDir := filepath.Join(s.spoolDir, now.Format("2006-01-02"))
	if err := os.MkdirAll(dayDir, 0o755); err != nil {
		return PersistedMessage{}, fmt.Errorf("create spool dir: %w", err)
	}

	rawPath := filepath.Join(dayDir, msgID+".eml")
	metaPath := filepath.Join(dayDir, msgID+".json")
	if err := os.WriteFile(rawPath, raw, 0o644); err != nil {
		return PersistedMessage{}, fmt.Errorf("write raw mime: %w", err)
	}

	item := PersistedMessage{
		ID:           msgID,
		MailFrom:     env.MailFrom,
		RcptTo:       append([]string(nil), env.RcptTo...),
		Helo:         env.Helo,
		RemoteIP:     env.RemoteIP,
		StoredAt:     now,
		RawPath:      rawPath,
		MetadataPath: metaPath,
		SizeBytes:    len(raw),
	}
	payload, err := json.MarshalIndent(item, "", "  ")
	if err != nil {
		return PersistedMessage{}, fmt.Errorf("encode metadata: %w", err)
	}
	if err := os.WriteFile(metaPath, payload, 0o644); err != nil {
		return PersistedMessage{}, fmt.Errorf("write metadata: %w", err)
	}
	return item, nil
}
