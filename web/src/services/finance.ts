import { api } from './api'

export interface WalletOverview {
  user_id: number
  email: string
  available_balance: number
  frozen_balance: number
  pending_settlement?: number
  updated_at: string
}

export interface WalletTransaction {
  id: number
  user_id: number
  order_id: number
  type: string
  direction: string
  amount: number
  balance_type: string
  note: string
  created_at: string
}

export interface SupplierSettlementEntry {
  id: number
  supplier_id: number
  order_id: number
  amount: number
  status: string
  note: string
  created_at: string
}

export interface SupplierCostProfile {
  id: number
  supplier_id: number
  project_key: string
  cost_per_success: number
  cost_per_timeout: number
  currency: string
  status: string
  notes: string
  updated_at: string
}

export interface SupplierReportRow {
  project_key: string
  total_orders: number
  finished_orders: number
  timeout_orders: number
  disputed_orders: number
  gross_revenue: number
  modeled_cost: number
  estimated_gross_pnl: number
}

export interface OrderDispute {
  id: number
  order_id: number
  project_key: string
  supplier_id: number
  user_id: number
  status: string
  reason: string
  resolution_type: string
  resolution_note: string
  refund_amount: number
  created_at: string
  updated_at: string
  resolved_at?: string
}

export async function getWalletOverview() {
  const { data } = await api.get<{ wallet: WalletOverview }>('/wallet/overview')
  return data
}

export async function getWalletTransactions() {
  const { data } = await api.get<{ items: WalletTransaction[] }>('/wallet/transactions')
  return data
}

export async function topupWallet(amount: number, note?: string) {
  const { data } = await api.post<{ wallet: WalletOverview }>('/wallet/topups', { amount, note })
  return data
}

export async function createUserOrderDispute(orderId: number, reason: string) {
  const { data } = await api.post<{ dispute: OrderDispute }>(`/wallet/disputes/${orderId}`, { reason })
  return data
}

export async function getSupplierSettlementOverview() {
  const { data } = await api.get<{ wallet: WalletOverview; entries: SupplierSettlementEntry[] }>('/supplier/settlements')
  return data
}

export async function getSupplierCostProfiles() {
  const { data } = await api.get<{ items: SupplierCostProfile[] }>('/supplier/cost-profiles')
  return data
}

export async function saveSupplierCostProfile(payload: {
  project_key: string
  cost_per_success: number
  cost_per_timeout: number
  currency?: string
  status?: string
  notes?: string
}) {
  const { data } = await api.post<{ profile: SupplierCostProfile }>('/supplier/cost-profiles', payload)
  return data
}

export async function getSupplierReports() {
  const { data } = await api.get<{ items: SupplierReportRow[] }>('/supplier/reports')
  return data
}

export async function getSupplierDisputes() {
  const { data } = await api.get<{ items: OrderDispute[] }>('/supplier/disputes')
  return data
}

export async function createSupplierDispute(orderId: number, reason: string) {
  const { data } = await api.post<{ dispute: OrderDispute }>(`/supplier/disputes/${orderId}`, { reason })
  return data
}

export async function getAdminWalletUsers() {
  const { data } = await api.get<{ items: WalletOverview[] }>('/admin/wallet-users')
  return data
}

export async function adminAdjustWallet(userId: number, amount: number, reason: string) {
  const { data } = await api.post<{ wallet: WalletOverview }>('/admin/wallet-adjustments', { user_id: userId, amount, reason })
  return data
}

export async function getAdminDisputes() {
  const { data } = await api.get<{ items: OrderDispute[] }>('/admin/disputes')
  return data
}

export async function resolveAdminDispute(
  disputeId: number,
  payload: { status: 'resolved' | 'rejected'; resolution_type?: string; resolution_note?: string; refund_amount?: number },
) {
  const { data } = await api.post<{ dispute: OrderDispute }>(`/admin/disputes/${disputeId}/resolve`, payload)
  return data
}
