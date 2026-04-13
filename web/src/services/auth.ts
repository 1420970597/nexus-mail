import { api } from './api'
import { CurrentUser, MenuItem } from '../store/authStore'

export interface SessionResponse {
  token: string
  refresh_token: string
  user: CurrentUser
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
  const { data } = await api.get('/dashboard/overview')
  return data
}
