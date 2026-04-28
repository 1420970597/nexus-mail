package activation

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

func TestCreateActivationOrderMailboxClaimQueryUsesMailboxColumnsOnly(t *testing.T) {
	text, err := os.ReadFile("repository.go")
	if err != nil {
		t.Fatalf("read repository.go: %v", err)
	}
	src := string(text)
	start := strings.Index(src, "WITH candidate AS (")
	if start < 0 {
		t.Fatal("candidate CTE not found")
	}
	end := strings.Index(src[start:], "`, offering.ProjectKey")
	if end < 0 {
		t.Fatal("mailbox claim query terminator not found")
	}
	query := src[start : start+end]
	if !strings.Contains(query, "RETURNING m.id, m.domain_id, COALESCE(m.account_id, 0) AS account_id") {
		t.Fatal("expected claimed CTE to return mailbox account_id column")
	}
	if regexp.MustCompile(`(?m)^\s*SELECT\s+id,\s*domain_id,\s*account_id,\s*local_part,\s*address,\s*source_type,\s*status,\s*project_key,\s*created_at`).FindString(query) == "" {
		t.Fatal("expected final select to project account_id from claimed CTE")
	}
	if strings.Contains(query, "candidate.account_id") {
		t.Fatal("query should not depend on candidate.account_id in final projection")
	}
}
