package activation

import (
	"os"
	"strings"
	"testing"
)

func TestCreateActivationOrderSelectsDefaultDomainWithAvailableMailboxFilter(t *testing.T) {
	text, err := os.ReadFile("repository.go")
	if err != nil {
		t.Fatalf("read repository.go: %v", err)
	}
	src := string(text)
	start := strings.Index(src, "if domainID == 0 {")
	if start < 0 {
		t.Fatal("default domain selection block not found")
	}
	end := strings.Index(src[start:], "\n\n\tvar offering ProjectOffering")
	if end < 0 {
		t.Fatal("default domain selection block terminator not found")
	}
	block := src[start : start+end]
	for _, needle := range []string{
		"AND EXISTS (",
		"FROM mailbox_pool m",
		"m.project_key = $2",
		"m.status = 'available'",
		"m.source_type = po.source_type",
	} {
		if !strings.Contains(block, needle) {
			t.Fatalf("expected default domain selection to contain %q", needle)
		}
	}
}
