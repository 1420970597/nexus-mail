import { api } from './api'

export interface WebhookEndpointRecord {
  id: number
  user_id: number
  url: string
  events: string[]
  status: string
  secret_preview: string
  signing_secret?: string
  created_at: string
  updated_at: string
}

export interface WebhookDeliveryRecord {
  id: number
  endpoint_id: number
  user_id: number
  event_type: string
  payload: string
  status: string
  attempt_count: number
  next_attempt_at?: string
  last_error?: string
  locked_at?: string
  delivered_at?: string
  created_at: string
  updated_at: string
}

export async function getWebhookEndpoints() {
  const { data } = await api.get<{ items: WebhookEndpointRecord[] }>('/webhooks/endpoints')
  return data
}

export async function createWebhookEndpoint(payload: { url: string; events: string[] }) {
  const { data } = await api.post<{ endpoint: WebhookEndpointRecord }>('/webhooks/endpoints', payload)
  return data
}

export async function createWebhookTestDelivery(id: number) {
  const { data } = await api.post<{ delivery: WebhookDeliveryRecord }>(`/webhooks/endpoints/${id}/test-delivery`)
  return data
}

export async function getWebhookDeliveries(id: number) {
  const { data } = await api.get<{ items: WebhookDeliveryRecord[] }>(`/webhooks/endpoints/${id}/deliveries`)
  return data
}
