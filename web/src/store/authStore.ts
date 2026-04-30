import { create } from 'zustand'

export type Role = 'user' | 'supplier' | 'admin'

export interface CurrentUser {
  id: number
  email: string
  role: Role
}

export interface MenuItem {
  key: string
  label: string
  path: string
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: CurrentUser | null
  menu: MenuItem[]
  setSession: (token: string, refreshToken: string, user: CurrentUser) => void
  setUser: (user: CurrentUser | null) => void
  setMenu: (menu: MenuItem[]) => void
  logout: () => void
}

const tokenKey = 'nexus-mail-token'
const userKey = 'nexus-mail-user'
const menuKey = 'nexus-mail-menu'

function readSessionValue(key: string) {
  if (typeof window === 'undefined') {
    return null
  }
  return window.sessionStorage.getItem(key)
}

const initialToken = readSessionValue(tokenKey)
const initialUser = readSessionValue(userKey)
const initialMenu = readSessionValue(menuKey)

export const useAuthStore = create<AuthState>((set) => ({
  token: initialToken,
  refreshToken: null,
  user: initialUser ? (JSON.parse(initialUser) as CurrentUser) : null,
  menu: initialMenu ? (JSON.parse(initialMenu) as MenuItem[]) : [],
  setSession: (token, refreshToken, user) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(tokenKey, token)
      window.sessionStorage.setItem(userKey, JSON.stringify(user))
      window.sessionStorage.removeItem(menuKey)
      window.sessionStorage.removeItem('nexus-mail-refresh-token')
    }
    set({ token, refreshToken, user, menu: [] })
  },
  setUser: (user) => {
    if (typeof window !== 'undefined') {
      if (user) {
        window.sessionStorage.setItem(userKey, JSON.stringify(user))
      } else {
        window.sessionStorage.removeItem(userKey)
      }
    }
    set({ user })
  },
  setMenu: (menu) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(menuKey, JSON.stringify(menu))
    }
    set({ menu })
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(tokenKey)
      window.sessionStorage.removeItem('nexus-mail-refresh-token')
      window.sessionStorage.removeItem(userKey)
      window.sessionStorage.removeItem(menuKey)
    }
    set({ token: null, refreshToken: null, user: null, menu: [] })
  },
}))
