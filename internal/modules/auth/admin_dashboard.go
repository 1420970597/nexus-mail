package auth

import (
	"context"
	"fmt"
	"sort"
	"strings"
)

type DashboardSummary struct {
	Users struct {
		Total int `json:"total"`
	} `json:"users"`
	Orders struct {
		Total        int `json:"total"`
		WaitingEmail int `json:"waiting_email"`
		Ready        int `json:"ready"`
		Finished     int `json:"finished"`
		Canceled     int `json:"canceled"`
		Timeout      int `json:"timeout"`
	} `json:"orders"`
	Disputes struct {
		Total    int `json:"total"`
		Open     int `json:"open"`
		Resolved int `json:"resolved"`
		Rejected int `json:"rejected"`
	} `json:"disputes"`
	Projects struct {
		Total    int `json:"total"`
		Active   int `json:"active"`
		Inactive int `json:"inactive"`
	} `json:"projects"`
	Suppliers struct {
		Total int `json:"total"`
	} `json:"suppliers"`
	Audit struct {
		Total           int `json:"total"`
		Create          int `json:"create"`
		Revoke          int `json:"revoke"`
		Success         int `json:"success"`
		DeniedInvalid   int `json:"denied_invalid"`
		DeniedScope     int `json:"denied_scope"`
		DeniedWhitelist int `json:"denied_whitelist"`
		DeniedRateLimit int `json:"denied_rate_limit"`
	} `json:"audit"`
	SupplierSettlements struct {
		PendingAmount int64 `json:"pending_amount"`
	} `json:"supplier_settlements"`
}

type RiskSignal struct {
	Category string `json:"category"`
	Severity string `json:"severity"`
	Count    int    `json:"count"`
	Title    string `json:"title"`
	Detail   string `json:"detail"`
}

type RiskSummary struct {
	OpenDisputes          int `json:"open_disputes"`
	DeniedWhitelist       int `json:"denied_whitelist"`
	DeniedScope           int `json:"denied_scope"`
	DeniedInvalid         int `json:"denied_invalid"`
	DeniedRateLimit       int `json:"denied_rate_limit"`
	TimeoutOrders         int `json:"timeout_orders"`
	CanceledOrders        int `json:"canceled_orders"`
	HighRiskSignalCount   int `json:"high_risk_signal_count"`
	MediumRiskSignalCount int `json:"medium_risk_signal_count"`
}

type DashboardProject struct {
	ID       int64
	Key      string
	Name     string
	IsActive bool
}

type DashboardOrder struct {
	ID         int64
	UserID     int64
	SupplierID int64
	Status     string
}

type DashboardWalletUser struct {
	UserID            int64
	Email             string
	Role              string
	PendingSettlement int64
}

type DashboardDispute struct {
	ID     int64
	Status string
}

func BuildDashboardSummary(
	ctx context.Context,
	projects []DashboardProject,
	orders []DashboardOrder,
	walletUsers []DashboardWalletUser,
	disputes []DashboardDispute,
	audit []APIKeyAuditEntry,
) DashboardSummary {
	var summary DashboardSummary
	summary.Users.Total = len(walletUsers)
	summary.Orders.Total = len(orders)
	summary.Disputes.Total = len(disputes)
	summary.Projects.Total = len(projects)

	supplierSeen := map[int64]struct{}{}
	for _, project := range projects {
		if project.IsActive {
			summary.Projects.Active++
		} else {
			summary.Projects.Inactive++
		}
	}
	for _, order := range orders {
		switch strings.ToUpper(strings.TrimSpace(order.Status)) {
		case "WAITING_EMAIL":
			summary.Orders.WaitingEmail++
		case "READY":
			summary.Orders.Ready++
		case "FINISHED":
			summary.Orders.Finished++
		case "CANCELED":
			summary.Orders.Canceled++
		case "TIMEOUT":
			summary.Orders.Timeout++
		}
		if order.SupplierID > 0 {
			supplierSeen[order.SupplierID] = struct{}{}
		}
	}
	for _, wallet := range walletUsers {
		if wallet.PendingSettlement > 0 {
			summary.SupplierSettlements.PendingAmount += wallet.PendingSettlement
		}
		if wallet.Role == string(RoleSupplier) || wallet.Role == string(RoleAdmin) {
			supplierSeen[wallet.UserID] = struct{}{}
		}
	}
	for _, dispute := range disputes {
		switch strings.ToLower(strings.TrimSpace(dispute.Status)) {
		case "open":
			summary.Disputes.Open++
		case "resolved":
			summary.Disputes.Resolved++
		case "rejected":
			summary.Disputes.Rejected++
		}
	}
	for _, item := range audit {
		switch strings.ToLower(strings.TrimSpace(item.Action)) {
		case "create":
			summary.Audit.Create++
		case "revoke":
			summary.Audit.Revoke++
		case "success":
			summary.Audit.Success++
		case "denied_invalid":
			summary.Audit.DeniedInvalid++
		case "denied_scope":
			summary.Audit.DeniedScope++
		case "denied_whitelist":
			summary.Audit.DeniedWhitelist++
		case "denied_rate_limit":
			summary.Audit.DeniedRateLimit++
		}
	}
	summary.Audit.Total = len(audit)
	summary.Suppliers.Total = len(supplierSeen)
	_ = ctx
	return summary
}

func BuildRiskSignals(
	ctx context.Context,
	orders []DashboardOrder,
	disputes []DashboardDispute,
	audit []APIKeyAuditEntry,
) (RiskSummary, []RiskSignal) {
	var summary RiskSummary
	orderCountByUser := map[int64]int{}
	timeoutCountByUser := map[int64]int{}
	cancelCountByUser := map[int64]int{}

	for _, order := range orders {
		orderCountByUser[order.UserID]++
		switch strings.ToUpper(strings.TrimSpace(order.Status)) {
		case "TIMEOUT":
			summary.TimeoutOrders++
			timeoutCountByUser[order.UserID]++
		case "CANCELED":
			summary.CanceledOrders++
			cancelCountByUser[order.UserID]++
		}
	}

	for _, dispute := range disputes {
		if strings.EqualFold(strings.TrimSpace(dispute.Status), "open") {
			summary.OpenDisputes++
		}
	}

	for _, item := range audit {
		switch strings.ToLower(strings.TrimSpace(item.Action)) {
		case "denied_whitelist":
			summary.DeniedWhitelist++
		case "denied_scope":
			summary.DeniedScope++
		case "denied_invalid":
			summary.DeniedInvalid++
		case "denied_rate_limit":
			summary.DeniedRateLimit++
		}
	}

	signals := make([]RiskSignal, 0, 8)
	appendSignal := func(category, severity string, count int, title, detail string) {
		if count <= 0 {
			return
		}
		signals = append(signals, RiskSignal{Category: category, Severity: severity, Count: count, Title: title, Detail: detail})
		if severity == "high" {
			summary.HighRiskSignalCount++
		} else if severity == "medium" {
			summary.MediumRiskSignalCount++
		}
	}

	appendSignal("dispute", "high", summary.OpenDisputes, "存在未处理争议单", fmt.Sprintf("当前共有 %d 笔 open 争议单待管理员处理", summary.OpenDisputes))
	appendSignal("auth", "high", summary.DeniedWhitelist, "API Key 白名单拦截频繁", fmt.Sprintf("最近审计中检测到 %d 次 denied_whitelist 事件", summary.DeniedWhitelist))
	appendSignal("auth", "high", summary.DeniedRateLimit, "API Key 触发限流", fmt.Sprintf("最近审计中检测到 %d 次 denied_rate_limit 事件，可能存在异常高频访问或客户端重试风暴", summary.DeniedRateLimit))
	appendSignal("auth", "medium", summary.DeniedScope, "API Key 权限越权尝试", fmt.Sprintf("最近审计中检测到 %d 次 denied_scope 事件", summary.DeniedScope))
	appendSignal("auth", "medium", summary.DeniedInvalid, "存在无效 API Key 请求", fmt.Sprintf("最近审计中检测到 %d 次 denied_invalid 事件", summary.DeniedInvalid))
	appendSignal("order", "medium", summary.TimeoutOrders, "超时订单需要关注", fmt.Sprintf("当前共有 %d 笔 TIMEOUT 订单", summary.TimeoutOrders))
	appendSignal("order", "medium", summary.CanceledOrders, "取消订单偏多", fmt.Sprintf("当前共有 %d 笔 CANCELED 订单", summary.CanceledOrders))

	for userID, total := range orderCountByUser {
		if total < 3 {
			continue
		}
		if timeoutCountByUser[userID]*2 >= total {
			appendSignal("behavior", "high", timeoutCountByUser[userID], "单用户高超时占比", fmt.Sprintf("user_id=%d 在 %d 笔订单中有 %d 笔 TIMEOUT", userID, total, timeoutCountByUser[userID]))
		}
		if cancelCountByUser[userID]*2 >= total {
			appendSignal("behavior", "medium", cancelCountByUser[userID], "单用户高取消占比", fmt.Sprintf("user_id=%d 在 %d 笔订单中有 %d 笔 CANCELED", userID, total, cancelCountByUser[userID]))
		}
	}

	sort.SliceStable(signals, func(i, j int) bool {
		severityRank := func(severity string) int {
			switch severity {
			case "high":
				return 0
			case "medium":
				return 1
			default:
				return 2
			}
		}
		li, lj := severityRank(signals[i].Severity), severityRank(signals[j].Severity)
		if li != lj {
			return li < lj
		}
		if signals[i].Count != signals[j].Count {
			return signals[i].Count > signals[j].Count
		}
		return signals[i].Category < signals[j].Category
	})
	_ = ctx
	return summary, signals
}

func latestAuditEntries(items []APIKeyAuditEntry, limit int) []APIKeyAuditEntry {
	if limit <= 0 || len(items) <= limit {
		copied := make([]APIKeyAuditEntry, len(items))
		copy(copied, items)
		return copied
	}
	copied := make([]APIKeyAuditEntry, limit)
	copy(copied, items[:limit])
	return copied
}

func normalizeAuditEntries(items []APIKeyAuditEntry) []APIKeyAuditEntry {
	copied := make([]APIKeyAuditEntry, 0, len(items))
	for _, item := range items {
		item.Action = strings.ToLower(strings.TrimSpace(item.Action))
		item.ActorType = strings.ToLower(strings.TrimSpace(item.ActorType))
		copied = append(copied, item)
	}
	return copied
}
