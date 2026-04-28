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
