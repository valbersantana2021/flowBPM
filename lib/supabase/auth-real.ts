/**
 * STUB — Phase 7 placeholder.
 *
 * This file will be replaced in Phase 7 with the real Supabase AuthService
 * implementation. It exists now only so that the Webpack bundler can resolve
 * the import in hooks/useAuth.ts without crashing the build.
 *
 * DO NOT use authRealStub directly; it will throw at runtime.
 */
import type { AuthService } from './auth-service'

export const authReal: AuthService = {
  async signUpWithEmail() {
    throw new Error('[auth-real] Not implemented yet — see Phase 7 (T024).')
  },
  async signInWithEmail() {
    throw new Error('[auth-real] Not implemented yet — see Phase 7 (T024).')
  },
  async signInWithGoogle() {
    throw new Error('[auth-real] Not implemented yet — see Phase 7 (T024).')
  },
  async signOut() {
    throw new Error('[auth-real] Not implemented yet — see Phase 7 (T024).')
  },
  async getUser() {
    throw new Error('[auth-real] Not implemented yet — see Phase 7 (T024).')
  },
}
