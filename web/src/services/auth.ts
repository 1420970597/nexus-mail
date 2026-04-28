import { api } from './api'
import { CurrentUser, MenuItem } from '../store/authStore'

export interface SessionResponse {
  token: string
  refresh_token: string
  user: CurrentUser
}

export interface DashboardOverviewResponse {
  message?: string
  role?: string
  stats?: {
    orders?: number
    projects?: number
    suppliers?: number
  }
}

export interface AdminDashboardSummary {
  users: { total: number }
  orders: { total: number; waiting_email: number; ready: number; finished: number; canceled: number; timeout: number; completion_rate_bps: number; timeout_rate_bps: number; cancel_rate_bps: number; gross_revenue: number; average_finished_order_value: number }
  disputes: { total: number; open: number; resolved: number; rejected: number; dispute_rate_bps: number }
  projects: { total: number; active: number; inactive: number }
  suppliers: { total: number }
  audit: { total: number; create: number; revoke: number; success: number; denied_invalid: number; denied_scope: number; denied_whitelist: number; denied_rate_limit: number; denied_total: number; denied_rate_bps: number }
  supplier_settlements: { pending_amount: number }
}

export interface AdminAuditEntry {
  id: number
  user_id: number
  api_key_id: number
  action: string
  actor_type: string
  note: string
  created_at: string
}

export interface AdminSupplierSummary {
  user_id: number
  email: string
  role: string
  pending_settlement: number
  order_total: number
  finished_orders: number
  timeout_orders: number
  canceled_orders: number
  gross_revenue: number
  completion_rate_bps: number
}

export interface AdminOverviewResponse {
  generated_at: string
  summary: AdminDashboardSummary
  suppliers: AdminSupplierSummary[]
  recent_audit: AdminAuditEntry[]
}

export interface AdminRiskSignal {
  category: string
  severity: string
  count: number
  title: string
  detail: string
}

export interface AdminRiskSummary {
  open_disputes: number
  denied_whitelist: number
  denied_scope: number
  denied_invalid: number
  denied_rate_limit: number
  timeout_orders: number
  canceled_orders: number
  high_risk_signal_count: number
  medium_risk_signal_count: number
}

export interface AdminRiskResponse {
  generated_at: string
  summary: AdminRiskSummary
  signals: AdminRiskSignal[]
}

export async function login(email: string, password: string) {
  const { data } = await api.post<SessionResponse>('/auth/login', { email, password })
  return data
}

export async function register(email: string, password: string) {
  const { data } = await api.post<SessionResponse>('/auth/register', { email, password })
  return data
}

export async function refreshSession(refreshToken: string) {
  const { data } = await api.post<SessionResponse>('/auth/refresh', { refresh_token: refreshToken })
  return data
}

export async function logoutSession(refreshToken: string) {
  const { data } = await api.post<{ message: string }>('/auth/logout', { refresh_token: refreshToken })
  return data
}

export async function getCurrentUser() {
  const { data } = await api.get<{ user: CurrentUser }>('/auth/me')
  return data
}

export async function getMenu() {
  const { data } = await api.get<{ items: MenuItem[]; role: string }>('/auth/menu')
  return data
}

export async function getDashboardOverview() {
  const { data } = await api.get<DashboardOverviewResponse>('/dashboard/overview')
  return data
}

export async function getAdminOverview() {
  const { data } = await api.get<AdminOverviewResponse>('/admin/overview')
  return data
}

export async function getAdminRisk() {
  const { data } = await api.get<AdminRiskResponse>('/admin/risk')
  return data
}

export interface RiskRule {
  key: string
  enabled: boolean
  threshold: number
  window_minutes: number
  severity: string
  description: string
  updated_at: string
}

export async function getAdminRiskRules() {
  const { data } = await api.get<{ items: RiskRule[] }>('/admin/risk/rules')
  return data
}

export async function updateAdminRiskRules(items: RiskRule[]) {
  const { data } = await api.put<{ items: RiskRule[] }>('/admin/risk/rules', { items })
  return data
}

export async function getAdminAudit(params?: { user_id?: number; api_key_id?: number; actor_type?: string; action?: string; limit?: number }) {
  const { data } = await api.get<{ items: AdminAuditEntry[] }>('/admin/audit', { params })
  return data
}
