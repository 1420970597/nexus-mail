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

export async function getSupplierSettlementOverview() {
  const { data } = await api.get<{ wallet: WalletOverview; entries: SupplierSettlementEntry[] }>('/supplier/settlements')
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
