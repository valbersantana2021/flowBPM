import type { AuthUser } from '@/types'

export type AuthErrorCode =
  | 'email_in_use'
  | 'invalid_credentials'
  | 'weak_password'
  | 'google_unavailable'
  | 'unknown'

export interface AuthError {
  code: AuthErrorCode
  message: string
}

export interface AuthResult {
  user: AuthUser | null
  error: AuthError | null
}

export interface AuthService {
  signUpWithEmail(fullName: string, email: string, password: string): Promise<AuthResult>
  signInWithEmail(email: string, password: string): Promise<AuthResult>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  getUser(): Promise<AuthUser | null>
}
