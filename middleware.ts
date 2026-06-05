import { NextResponse, type NextRequest } from 'next/server'
import type { CookieOptions } from '@supabase/ssr'

const MOCK_COOKIE = 'flowmind-mock-session'
const PROTECTED = ['/dashboard', '/editor', '/settings']

const AUTH_PAGES = ['/login', '/signup']

function isMockMode() {
  return process.env.NEXT_PUBLIC_AUTH_MODE === 'mock'
}

async function getSupabaseUser(request: NextRequest) {
  const { createServerClient } = await import('@supabase/ssr')
  let user = null
  const response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            response.cookies.set(name, value, options as any)
          })
        },
      },
    }
  )

  const { data } = await supabase.auth.getUser()
  user = data.user
  return { user, response }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p))

  if (!isProtected && !isAuthPage) return NextResponse.next()

  let isAuthenticated = false

  if (isMockMode()) {
    isAuthenticated = request.cookies.has(MOCK_COOKIE)
  } else {
    const { user, response } = await getSupabaseUser(request)
    if (user) {
      isAuthenticated = true
      if (isAuthPage) return NextResponse.redirect(new URL('/dashboard', request.url))
      return response
    }
  }

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/editor/:path*', '/settings/:path*', '/login', '/signup'],
}
