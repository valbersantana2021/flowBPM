'use client'

import { authMock } from '@/lib/supabase/auth-mock'
import type { AuthService } from '@/lib/supabase/auth-service'

// In mock mode we always use authMock.
// In real mode (Phase 7), this factory will import AuthRealService from auth-service.ts.
// We use a variable indirection so Webpack does not try to statically resolve
// a module that doesn't exist yet during the mock-mode build.
let _authReal: AuthService | null = null

function getRealService(): AuthService {
  if (!_authReal) {
    // Dynamic require is intentional: file is only present after Phase 7 setup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _authReal = require('@/lib/supabase/auth-real').authReal
  }
  return _authReal!
}

export function useAuth(): AuthService {
  if (process.env.NEXT_PUBLIC_AUTH_MODE === 'mock') {
    return authMock
  }
  return getRealService()
}

