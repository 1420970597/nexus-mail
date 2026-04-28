import { api } from './api'

export interface APIKeyRecord {
  id: number
  name: string
  key_preview: string
  scopes: string[]
  whitelist: string[]
  status: string
  last_used_at?: string
  created_at: string
  updated_at: string
}

export interface APIKeyAuditEntry {
  id: number
  action: string
  actor_type: string
  note: string
  created_at: string
}

export async function getAPIKeys() {
  const { data } = await api.get<{ items: APIKeyRecord[] }>('/api-keys')
  return data
}

export async function createAPIKey(payload: {
  name: string
  scopes: string[]
  whitelist: string[]
}) {
  const { data } = await api.post<{ api_key: APIKeyRecord; plaintext_key: string }>('/api-keys', payload)
  return data
}

export async function revokeAPIKey(id: number) {
  const { data } = await api.post<{ api_key: APIKeyRecord }>(`/api-keys/${id}/revoke`)
  return data
}

export async function getAPIKeyAudit() {
  const { data } = await api.get<{ items: APIKeyAuditEntry[] }>('/api-keys/audit')
  return data
}
