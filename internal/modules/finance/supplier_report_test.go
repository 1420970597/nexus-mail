package finance

import (
	"context"
	"testing"
)

func TestSupplierReportNormalizesDateRangeAndLimit(t *testing.T) {
	repo := &stubRepo{}
	service := NewService(repo)

	rows, err := service.SupplierReport(context.Background(), 12, SupplierReportInput{
		From:  " 2026-04-01 ",
		To:    "2026-04-28 ",
		Limit: 500,
	})
	if err != nil {
		t.Fatalf("SupplierReport() error = %v", err)
	}
	if len(rows) != 1 || rows[0].ProjectKey != "discord" {
		t.Fatalf("unexpected rows: %#v", rows)
	}
	if repo.userID != 12 {
		t.Fatalf("expected supplierID 12, got %d", repo.userID)
	}
	if repo.reportInput.From != "2026-04-01" || repo.reportInput.To != "2026-04-28" {
		t.Fatalf("expected trimmed date filters, got %#v", repo.reportInput)
	}
	if repo.reportInput.Limit != 200 {
		t.Fatalf("expected capped report limit 200, got %d", repo.reportInput.Limit)
	}
	if repo.reportFromDate == nil || repo.reportToDate == nil {
		t.Fatalf("expected parsed date pointers, got from=%v to=%v", repo.reportFromDate, repo.reportToDate)
	}
	if got := repo.reportFromDate.Format("2006-01-02"); got != "2026-04-01" {
		t.Fatalf("expected parsed from date 2026-04-01, got %s", got)
	}
	if got := repo.reportToDate.Format("2006-01-02"); got != "2026-04-28" {
		t.Fatalf("expected parsed to date 2026-04-28, got %s", got)
	}
}

func TestSupplierReportRejectsInvalidDateRange(t *testing.T) {
	service := NewService(&stubRepo{})
	if _, err := service.SupplierReport(context.Background(), 12, SupplierReportInput{From: "2026/04/01"}); err == nil {
		t.Fatal("expected invalid from date error")
	}
	if _, err := service.SupplierReport(context.Background(), 12, SupplierReportInput{From: "2026-04-28", To: "2026-04-01"}); err == nil {
		t.Fatal("expected from after to validation error")
	}
}

func TestSupplierReportDefaultsLimit(t *testing.T) {
	repo := &stubRepo{}
	service := NewService(repo)
	if _, err := service.SupplierReport(context.Background(), 12, SupplierReportInput{}); err != nil {
		t.Fatalf("SupplierReport() error = %v", err)
	}
	if repo.reportInput.Limit != 100 {
		t.Fatalf("expected default limit 100, got %d", repo.reportInput.Limit)
	}
}

func TestSupplierReportLimitBoundaries(t *testing.T) {
	cases := []struct {
		name      string
		limit     int
		wantLimit int
	}{
		{name: "zero uses default", limit: 0, wantLimit: 100},
		{name: "one stays one", limit: 1, wantLimit: 1},
		{name: "max stays max", limit: 200, wantLimit: 200},
		{name: "above max is capped", limit: 201, wantLimit: 200},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			repo := &stubRepo{}
			service := NewService(repo)
			if _, err := service.SupplierReport(context.Background(), 12, SupplierReportInput{Limit: tc.limit}); err != nil {
				t.Fatalf("SupplierReport() error = %v", err)
			}
			if repo.reportInput.Limit != tc.wantLimit {
				t.Fatalf("expected limit %d, got %d", tc.wantLimit, repo.reportInput.Limit)
			}
		})
	}

	service := NewService(&stubRepo{})
	if _, err := service.SupplierReport(context.Background(), 12, SupplierReportInput{Limit: -1}); err == nil {
		t.Fatal("expected negative limit validation error")
	}
}
