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
		Total                     int   `json:"total"`
		WaitingEmail              int   `json:"waiting_email"`
		Ready                     int   `json:"ready"`
		Finished                  int   `json:"finished"`
		Canceled                  int   `json:"canceled"`
		Timeout                   int   `json:"timeout"`
		CompletionRateBps         int   `json:"completion_rate_bps"`
		TimeoutRateBps            int   `json:"timeout_rate_bps"`
		CancelRateBps             int   `json:"cancel_rate_bps"`
		GrossRevenue              int64 `json:"gross_revenue"`
		AverageFinishedOrderValue int64 `json:"average_finished_order_value"`
	} `json:"orders"`
	Disputes struct {
		Total          int `json:"total"`
		Open           int `json:"open"`
		Resolved       int `json:"resolved"`
		Rejected       int `json:"rejected"`
		DisputeRateBps int `json:"dispute_rate_bps"`
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
		DeniedTotal     int `json:"denied_total"`
		DeniedRateBps   int `json:"denied_rate_bps"`
	} `json:"audit"`
	SupplierSettlements struct {
		PendingAmount int64 `json:"pending_amount"`
	} `json:"supplier_settlements"`
}

type RiskRuleConfig struct {
	Key       string
	Enabled   bool
	Threshold int
	Severity  string
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
	SenderBlacklistHits   int `json:"sender_blacklist_hits"`
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
	FinalPrice int64
}

type DashboardWalletUser struct {
	UserID            int64
	Email             string
	Role              string
	PendingSettlement int64
}

type AdminSupplierSummary struct {
	UserID            int64  `json:"user_id"`
	Email             string `json:"email"`
	Role              string `json:"role"`
	PendingSettlement int64  `json:"pending_settlement"`
	OrderTotal        int    `json:"order_total"`
	FinishedOrders    int    `json:"finished_orders"`
	TimeoutOrders     int    `json:"timeout_orders"`
	CanceledOrders    int    `json:"canceled_orders"`
	GrossRevenue      int64  `json:"gross_revenue"`
	CompletionRateBps int    `json:"completion_rate_bps"`
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
			summary.Orders.GrossRevenue += order.FinalPrice
		case "CANCELED":
			summary.Orders.Canceled++
		case "TIMEOUT":
			summary.Orders.Timeout++
		}
		if order.SupplierID > 0 {
			supplierSeen[order.SupplierID] = struct{}{}
		}
	}
	summary.Orders.CompletionRateBps = rateBps(summary.Orders.Finished, summary.Orders.Total)
	summary.Orders.TimeoutRateBps = rateBps(summary.Orders.Timeout, summary.Orders.Total)
	summary.Orders.CancelRateBps = rateBps(summary.Orders.Canceled, summary.Orders.Total)
	if summary.Orders.Finished > 0 {
		summary.Orders.AverageFinishedOrderValue = summary.Orders.GrossRevenue / int64(summary.Orders.Finished)
	}
	summary.Disputes.DisputeRateBps = rateBps(summary.Disputes.Total, summary.Orders.Total)
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
	summary.Audit.DeniedTotal = summary.Audit.DeniedInvalid + summary.Audit.DeniedScope + summary.Audit.DeniedWhitelist + summary.Audit.DeniedRateLimit
	summary.Audit.DeniedRateBps = rateBps(summary.Audit.DeniedTotal, summary.Audit.Total)
	summary.Suppliers.Total = len(supplierSeen)
	_ = ctx
	return summary
}

func rateBps(numerator, denominator int) int {
	if denominator <= 0 || numerator <= 0 {
		return 0
	}
	return int(int64(numerator) * 10000 / int64(denominator))
}

func BuildSupplierOperationalMetrics(orders []DashboardOrder) []AdminSupplierSummary {
	bySupplier := make(map[int64]*AdminSupplierSummary)
	for _, order := range orders {
		if order.SupplierID <= 0 {
			continue
		}
		item := bySupplier[order.SupplierID]
		if item == nil {
			item = &AdminSupplierSummary{UserID: order.SupplierID}
			bySupplier[order.SupplierID] = item
		}
		item.OrderTotal++
		switch strings.ToUpper(strings.TrimSpace(order.Status)) {
		case "FINISHED":
			item.FinishedOrders++
			item.GrossRevenue += order.FinalPrice
		case "TIMEOUT":
			item.TimeoutOrders++
		case "CANCELED":
			item.CanceledOrders++
		}
	}
	items := make([]AdminSupplierSummary, 0, len(bySupplier))
	for _, item := range bySupplier {
		item.CompletionRateBps = rateBps(item.FinishedOrders, item.OrderTotal)
		items = append(items, *item)
	}
	sort.SliceStable(items, func(i, j int) bool { return items[i].UserID < items[j].UserID })
	return items
}

func BuildAdminSupplierSummaries(users []User, walletUsers []DashboardWalletUser, metrics []AdminSupplierSummary) []AdminSupplierSummary {
	pendingByUser := make(map[int64]int64, len(walletUsers))
	for _, wallet := range walletUsers {
		pendingByUser[wallet.UserID] = wallet.PendingSettlement
	}
	supplierMetrics := make(map[int64]AdminSupplierSummary, len(metrics))
	for _, item := range metrics {
		if item.UserID <= 0 {
			continue
		}
		supplierMetrics[item.UserID] = item
	}
	items := make([]AdminSupplierSummary, 0)
	for _, user := range users {
		if user.Role != RoleSupplier {
			continue
		}
		item := AdminSupplierSummary{
			UserID:            user.ID,
			Email:             user.Email,
			Role:              string(user.Role),
			PendingSettlement: pendingByUser[user.ID],
		}
		if metrics, ok := supplierMetrics[user.ID]; ok {
			item.OrderTotal = metrics.OrderTotal
			item.FinishedOrders = metrics.FinishedOrders
			item.TimeoutOrders = metrics.TimeoutOrders
			item.CanceledOrders = metrics.CanceledOrders
			item.GrossRevenue = metrics.GrossRevenue
			item.CompletionRateBps = metrics.CompletionRateBps
		}
		items = append(items, item)
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].PendingSettlement == items[j].PendingSettlement {
			return items[i].UserID < items[j].UserID
		}
		return items[i].PendingSettlement > items[j].PendingSettlement
	})
	return items
}

func BuildRiskSignals(
	ctx context.Context,
	orders []DashboardOrder,
	disputes []DashboardDispute,
	audit []APIKeyAuditEntry,
) (RiskSummary, []RiskSignal) {
	return BuildRiskSignalsWithRules(ctx, orders, disputes, audit, nil)
}

func BuildRiskSignalsWithRules(
	ctx context.Context,
	orders []DashboardOrder,
	disputes []DashboardDispute,
	audit []APIKeyAuditEntry,
	rules []RiskRuleConfig,
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
		case "sender_blacklist_hit":
			summary.SenderBlacklistHits++
		}
	}

	signalRule := func(key, defaultSeverity string, defaultThreshold int) (bool, string, int) {
		for _, rule := range rules {
			if strings.EqualFold(strings.TrimSpace(rule.Key), key) {
				if !rule.Enabled {
					return false, "", 0
				}
				severity := strings.ToLower(strings.TrimSpace(rule.Severity))
				if severity == "" {
					severity = defaultSeverity
				}
				threshold := rule.Threshold
				if threshold <= 0 {
					threshold = defaultThreshold
				}
				return true, severity, threshold
			}
		}
		return true, defaultSeverity, defaultThreshold
	}

	signals := make([]RiskSignal, 0, 8)
	appendStaticSignal := func(category, severity string, count int, title, detail string) {
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
	appendRuleSignal := func(ruleKey, category, defaultSeverity string, defaultThreshold int, count int, title, detail string) {
		enabled, severity, threshold := signalRule(ruleKey, defaultSeverity, defaultThreshold)
		if !enabled || count < threshold {
			return
		}
		appendStaticSignal(category, severity, count, title, detail)
	}

	appendStaticSignal("dispute", "high", summary.OpenDisputes, "存在未处理争议单", fmt.Sprintf("当前共有 %d 笔 open 争议单待管理员处理", summary.OpenDisputes))
	appendStaticSignal("auth", "high", summary.DeniedWhitelist, "API Key 白名单拦截频繁", fmt.Sprintf("最近审计中检测到 %d 次 denied_whitelist 事件", summary.DeniedWhitelist))
	appendRuleSignal("api_denied_rate", "auth", "high", 1, summary.DeniedRateLimit, "API Key 触发限流", fmt.Sprintf("最近审计中检测到 %d 次 denied_rate_limit 事件，可能存在异常高频访问或客户端重试风暴", summary.DeniedRateLimit))
	appendStaticSignal("auth", "medium", summary.DeniedScope, "API Key 权限越权尝试", fmt.Sprintf("最近审计中检测到 %d 次 denied_scope 事件", summary.DeniedScope))
	appendStaticSignal("auth", "medium", summary.DeniedInvalid, "存在无效 API Key 请求", fmt.Sprintf("最近审计中检测到 %d 次 denied_invalid 事件", summary.DeniedInvalid))
	appendRuleSignal("high_timeout", "order", "medium", 1, summary.TimeoutOrders, "超时订单需要关注", fmt.Sprintf("当前共有 %d 笔 TIMEOUT 订单", summary.TimeoutOrders))
	appendRuleSignal("high_cancel", "order", "medium", 1, summary.CanceledOrders, "取消订单偏多", fmt.Sprintf("当前共有 %d 笔 CANCELED 订单", summary.CanceledOrders))
	appendRuleSignal("sender_blacklist", "mail", "high", 1, summary.SenderBlacklistHits, "发件人黑名单命中", fmt.Sprintf("最近审计中检测到 %d 次 sender_blacklist_hit 事件，请检查入站邮件来源与黑名单策略", summary.SenderBlacklistHits))

	for userID, total := range orderCountByUser {
		if total < 3 {
			continue
		}
		if timeoutCountByUser[userID]*2 >= total {
			appendRuleSignal("high_timeout", "behavior", "high", 1, timeoutCountByUser[userID], "单用户高超时占比", fmt.Sprintf("user_id=%d 在 %d 笔订单中有 %d 笔 TIMEOUT", userID, total, timeoutCountByUser[userID]))
		}
		if cancelCountByUser[userID]*2 >= total {
			appendRuleSignal("high_cancel", "behavior", "medium", 1, cancelCountByUser[userID], "单用户高取消占比", fmt.Sprintf("user_id=%d 在 %d 笔订单中有 %d 笔 CANCELED", userID, total, cancelCountByUser[userID]))
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
