import { api } from './api'

export interface ProjectItem {
  id: number
  key: string
  name: string
  description: string
  default_price: number
  success_rate: number
  timeout_seconds: number
}

export interface InventoryItem {
  id: number
  project_id: number
  project_key: string
  project_name: string
  domain_id: number
  domain_name: string
  supplier_id: number
  price: number
  stock: number
  success_rate: number
  priority: number
  source_type: string
  protocol_mode?: string
}

export interface ActivationOrder {
  id: number
  order_no: string
  project_key: string
  project_name: string
  domain_name: string
  email_address: string
  status: string
  quoted_price: number
  final_price: number
  extraction_type: string
  extraction_value: string
  created_at: string
  updated_at: string
  expires_at: string
}

export async function getProjects() {
  const { data } = await api.get<{ items: ProjectItem[] }>('/projects')
  return data
}

export async function getInventory() {
  const { data } = await api.get<{ items: InventoryItem[] }>('/projects/inventory')
  return data
}

export async function createActivationOrder(projectKey: string, domainId?: number) {
  const { data } = await api.post<{ order: ActivationOrder }>('/orders/activations', {
    project_key: projectKey,
    domain_id: domainId ?? 0,
  })
  return data
}

export async function getActivationOrders() {
  const { data } = await api.get<{ items: ActivationOrder[] }>('/orders/activations')
  return data
}

export async function getActivationResult(orderId: number) {
  const { data } = await api.get<{ result: { status: string; extraction_type: string; extraction_value: string } }>(`/orders/activations/${orderId}/result`)
  return data
}

export async function cancelActivationOrder(orderId: number) {
  const { data } = await api.post<{ order: ActivationOrder }>(`/orders/activations/${orderId}/cancel`)
  return data
}

export async function getSupplierResourcesOverview() {
  const { data } = await api.get('/supplier/resources/overview')
  return data as {
    domains: Array<{ id: number; name: string; region: string; status: string; catch_all: boolean }>
    mailboxes: Array<{ id: number; address: string; source_type: string; status: string; project_key: string; provider: string }>
    accounts: Array<{ id: number; provider: string; source_type: string; auth_mode: string; protocol_mode: string; identifier: string; status: string }>
  }
}

export async function getAdminProjectOfferings() {
  const { data } = await api.get<{ items: InventoryItem[] }>('/admin/projects/offerings')
  return data
}
