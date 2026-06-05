'use client'

import type { AuthService, AuthResult } from './auth-service'
import type { AuthUser } from '@/types'

const MOCK_COOKIE = 'flowmind-mock-session'

const MOCK_USER: AuthUser = {
  id: 'mock-user-001',
  email: 'ok@mock.com',
  profile: {
    id: 'mock-user-001',
    fullName: 'Usuário Mock',
    avatarUrl: null,
    plan: 'free',
    stripeCustomerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

function setMockCookie() {
  document.cookie = `${MOCK_COOKIE}=1; path=/; max-age=2592000`
}

function clearMockCookie() {
  document.cookie = `${MOCK_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

function hasMockCookie(): boolean {
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${MOCK_COOKIE}=`))
}

export const authMock: AuthService = {
  async signUpWithEmail(fullName, email, _password): Promise<AuthResult> {
    await new Promise((r) => setTimeout(r, 600))
    if (email === 'duplicado@mock.com') {
      return { user: null, error: { code: 'email_in_use', message: 'Este e-mail já está cadastrado.' } }
    }
    setMockCookie()
    return { user: { ...MOCK_USER, email, profile: { ...MOCK_USER.profile!, fullName } }, error: null }
  },

  async signInWithEmail(email, password): Promise<AuthResult> {
    await new Promise((r) => setTimeout(r, 600))
    if (password !== 'senha123' && password !== 'mock123') {
      return { user: null, error: { code: 'invalid_credentials', message: 'E-mail ou senha incorretos.' } }
    }
    setMockCookie()
    return { user: { ...MOCK_USER, email }, error: null }
  },

  async signInWithGoogle(): Promise<void> {
    await new Promise((r) => setTimeout(r, 1000))
    setMockCookie()
    window.location.href = '/dashboard'
  },

  async signOut(): Promise<void> {
    await new Promise((r) => setTimeout(r, 300))
    clearMockCookie()
  },

  async getUser(): Promise<AuthUser | null> {
    if (typeof document === 'undefined') return null
    return hasMockCookie() ? MOCK_USER : null
  },
}
