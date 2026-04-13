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

type TopUpInput struct {
	Amount int64  `json:"amount"`
	Note   string `json:"note"`
}

type AdminAdjustmentInput struct {
	UserID int64  `json:"user_id"`
	Amount int64  `json:"amount"`
	Reason string `json:"reason"`
}
