package finance

import "time"

type WalletOverview struct {
	UserID            int64     `json:"user_id"`
	Email             string    `json:"email"`
	AvailableBalance  int64     `json:"available_balance"`
	FrozenBalance     int64     `json:"frozen_balance"`
	PendingSettlement int64     `json:"pending_settlement,omitempty"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type WalletTransaction struct {
	ID          int64     `json:"id"`
	UserID      int64     `json:"user_id"`
	OrderID     int64     `json:"order_id,omitempty"`
	Type        string    `json:"type"`
	Direction   string    `json:"direction"`
	Amount      int64     `json:"amount"`
	BalanceType string    `json:"balance_type"`
	Note        string    `json:"note"`
	CreatedAt   time.Time `json:"created_at"`
}

type SupplierSettlementEntry struct {
	ID         int64     `json:"id"`
	SupplierID int64     `json:"supplier_id"`
	OrderID    int64     `json:"order_id"`
	Amount     int64     `json:"amount"`
	Status     string    `json:"status"`
	Note       string    `json:"note"`
	CreatedAt  time.Time `json:"created_at"`
}

type SupplierSettlementPayout struct {
	SupplierID     int64     `json:"supplier_id"`
	SettledAmount  int64     `json:"settled_amount"`
	PendingBalance int64     `json:"pending_balance"`
	SettledBalance int64     `json:"settled_balance"`
	EntryCount     int64     `json:"entry_count"`
	Reason         string    `json:"reason"`
	SettledAt      time.Time `json:"settled_at"`
}

type SupplierCostProfile struct {
	ID             int64     `json:"id"`
	SupplierID     int64     `json:"supplier_id"`
	ProjectKey     string    `json:"project_key"`
	CostPerSuccess int64     `json:"cost_per_success"`
	CostPerTimeout int64     `json:"cost_per_timeout"`
	Currency       string    `json:"currency"`
	Status         string    `json:"status"`
	Notes          string    `json:"notes"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type SupplierReportRow struct {
	ProjectKey        string `json:"project_key"`
	TotalOrders       int64  `json:"total_orders"`
	FinishedOrders    int64  `json:"finished_orders"`
	TimeoutOrders     int64  `json:"timeout_orders"`
	DisputedOrders    int64  `json:"disputed_orders"`
	GrossRevenue      int64  `json:"gross_revenue"`
	ModeledCost       int64  `json:"modeled_cost"`
	EstimatedGrossPnL int64  `json:"estimated_gross_pnl"`
}

type SupplierReportInput struct {
	From  string `json:"from"`
	To    string `json:"to"`
	Limit int    `json:"limit"`
}

type OrderDispute struct {
	ID             int64      `json:"id"`
	OrderID        int64      `json:"order_id"`
	ProjectKey     string     `json:"project_key"`
	SupplierID     int64      `json:"supplier_id"`
	UserID         int64      `json:"user_id"`
	Status         string     `json:"status"`
	Reason         string     `json:"reason"`
	ResolutionType string     `json:"resolution_type"`
	ResolutionNote string     `json:"resolution_note"`
	RefundAmount   int64      `json:"refund_amount"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
	ResolvedAt     *time.Time `json:"resolved_at,omitempty"`
}

type TopUpInput struct {
	Amount int64  `json:"amount"`
	Note   string `json:"note"`
}

type AdminAdjustmentInput struct {
	UserID int64  `json:"user_id"`
	Amount int64  `json:"amount"`
	Reason string `json:"reason"`
}

type SettleSupplierPendingInput struct {
	SupplierID int64  `json:"supplier_id"`
	Reason     string `json:"reason"`
}

type UpsertSupplierCostProfileInput struct {
	ProjectKey     string `json:"project_key"`
	CostPerSuccess int64  `json:"cost_per_success"`
	CostPerTimeout int64  `json:"cost_per_timeout"`
	Currency       string `json:"currency"`
	Status         string `json:"status"`
	Notes          string `json:"notes"`
}

type CreateOrderDisputeInput struct {
	Reason string `json:"reason"`
}

type ResolveOrderDisputeInput struct {
	Status         string `json:"status"`
	ResolutionType string `json:"resolution_type"`
	ResolutionNote string `json:"resolution_note"`
	RefundAmount   int64  `json:"refund_amount"`
}
