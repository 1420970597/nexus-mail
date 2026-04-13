import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'

export const api = axios.create({
  baseURL: '/api/v1',
})

const refreshClient = axios.create({
  baseURL: '/api/v1',
})

let refreshing: Promise<string | null> | null = null

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const requestUrl = originalRequest?.url ?? ''

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retried ||
      requestUrl.includes('/auth/refresh') ||
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/logout')
    ) {
      throw error
    }

    const { refreshToken, logout, setSession } = useAuthStore.getState()
    if (!refreshToken) {
      logout()
      throw error
    }

    if (!refreshing) {
      refreshing = refreshClient
        .post('/auth/refresh', { refresh_token: refreshToken })
        .then((response) => {
          const session = response.data as { token: string; refresh_token: string; user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']> }
          setSession(session.token, session.refresh_token, session.user)
          return session.token
        })
        .catch((refreshError) => {
          logout()
          throw refreshError
        })
        .finally(() => {
          refreshing = null
        })
    }

    const newToken = await refreshing
    if (!newToken) {
      throw error
    }

    originalRequest._retried = true
    originalRequest.headers = originalRequest.headers ?? {}
    originalRequest.headers.Authorization = `Bearer ${newToken}`
    return api(originalRequest)
  },
)
