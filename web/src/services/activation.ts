import { api } from './api'

export interface ProjectItem {
  id: number
  key: string
  name: string
  description: string
  default_price: number
  success_rate: number
  timeout_seconds: number
  is_active?: boolean
  created_at?: string
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

export interface ActivationResultPayload {
  status: string
  extraction_type: string
  extraction_value: string
  is_terminal: boolean
  expires_in_seconds: number
  next_poll_after_seconds: number
}

export interface SupplierDomain {
  id: number
  name: string
  region: string
  status: string
  catch_all: boolean
}

export interface SupplierAccount {
  id: number
  provider: string
  source_type: string
  auth_mode: string
  protocol_mode: string
  identifier: string
  status: string
  host?: string
  port?: number
  health_status?: string
  health_reason?: string
  bridge_endpoint?: string
  bridge_label?: string
}

export interface SupplierMailbox {
  id: number
  address: string
  source_type: string
  status: string
  project_key: string
  provider: string
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
  const { data } = await api.get<{ result: ActivationResultPayload }>(`/orders/activations/${orderId}/result`)
  return data
}

export async function finishActivationOrder(orderId: number) {
  const { data } = await api.post<{ order: ActivationOrder }>(`/orders/activations/${orderId}/finish`)
  return data
}

export async function cancelActivationOrder(orderId: number) {
  const { data } = await api.post<{ order: ActivationOrder }>(`/orders/activations/${orderId}/cancel`)
  return data
}

export async function getSupplierResourcesOverview() {
  const { data } = await api.get('/supplier/resources/overview')
  return data as {
    domains: SupplierDomain[]
    mailboxes: SupplierMailbox[]
    accounts: SupplierAccount[]
  }
}

export async function createSupplierDomain(payload: { name: string; region?: string; catch_all: boolean; status?: string }) {
  const { data } = await api.post<{ domain: SupplierDomain }>('/supplier/resources/domains', payload)
  return data
}

export async function createSupplierAccount(payload: {
  provider: string
  source_type?: string
  auth_mode?: string
  protocol_mode?: string
  identifier: string
  status?: string
  host?: string
  port?: number
  access_token?: string
  refresh_token?: string
  bridge_endpoint?: string
  bridge_label?: string
}) {
  const { data } = await api.post<{ account: SupplierAccount }>('/supplier/resources/accounts', payload)
  return data
}

export async function createSupplierMailbox(payload: {
  domain_id?: number
  account_id?: number
  local_part?: string
  address?: string
  source_type?: string
  project_key: string
  status?: string
}) {
  const { data } = await api.post<{ mailbox: SupplierMailbox }>('/supplier/resources/mailboxes', payload)
  return data
}

export async function submitSupplierActivationResult(
  orderId: number,
  payload: { extraction_type?: string; extraction_value: string; finalize?: boolean },
) {
  const { data } = await api.post<{ order: ActivationOrder }>(`/supplier/orders/activations/${orderId}/result`, payload)
  return data
}

export async function getAdminProjects() {
  const { data } = await api.get<{ items: ProjectItem[] }>('/admin/projects')
  return data
}

export async function updateAdminProject(
  projectId: number,
  payload: {
    name: string
    description: string
    default_price: number
    success_rate: number
    timeout_seconds: number
    is_active: boolean
  },
) {
  const { data } = await api.patch<{ project: ProjectItem }>(`/admin/projects/${projectId}`, payload)
  return data
}

export async function getAdminProjectOfferings() {
  const { data } = await api.get<{ items: InventoryItem[] }>('/admin/projects/offerings')
  return data
}
