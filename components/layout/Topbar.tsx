'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import type { AuthUser } from '@/types'

export function Topbar() {
  const router = useRouter()
  const pathname = usePathname()
  const auth = useAuth()
  const { resolvedTheme, toggle } = useTheme()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    auth.getUser().then(setUser)
  }, [auth, pathname])

  async function handleSignOut() {
    setSigningOut(true)
    await auth.signOut()
    router.push('/')
  }

  return (
    <header
      className="topbar"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        gap: '1rem',
      }}
    >
      {/* Logo */}
      <Link href={user ? '/dashboard' : '/'} style={{ textDecoration: 'none', marginRight: 'auto' }}>
        <span style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '1.1rem',
          color: 'var(--accent)',
          letterSpacing: '-0.02em',
        }}>
          FlowMind
        </span>
      </Link>

      {/* Theme toggle */}
      {mounted && (
        <button
          onClick={toggle}
          aria-label="Alternar tema"
          title={resolvedTheme === 'dark' ? 'Mudar para claro' : 'Mudar para escuro'}
          style={themeToggleStyle}
        >
          {resolvedTheme === 'dark' ? '☀️' : '🌙'}
        </button>
      )}

      {/* Auth actions */}
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* User avatar / name */}
          <span style={{ fontSize: '0.82rem', color: 'var(--text2)' }}>
            {user.profile?.fullName ?? user.email}
          </span>

          {/* Sign out */}
          <button
            id="topbar-signout"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sair da conta"
            style={{
              padding: '0.4rem 0.85rem',
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              borderRadius: '6px',
              color: 'var(--text2)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: signingOut ? 'not-allowed' : 'pointer',
              opacity: signingOut ? 0.6 : 1,
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {signingOut ? 'Saindo…' : 'Sair'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Link href="/login" style={navLinkStyle}>
            Entrar
          </Link>
          <Link href="/signup" style={ctaLinkStyle}>
            Começar grátis
          </Link>
        </div>
      )}
    </header>
  )
}

const navLinkStyle: React.CSSProperties = {
  padding: '0.4rem 0.85rem',
  color: 'var(--text2)',
  fontSize: '0.85rem',
  fontWeight: 500,
  textDecoration: 'none',
  borderRadius: '6px',
  transition: 'color 0.15s',
}

const ctaLinkStyle: React.CSSProperties = {
  padding: '0.4rem 0.9rem',
  background: 'var(--accent)',
  color: '#fff',
  fontSize: '0.85rem',
  fontWeight: 600,
  textDecoration: 'none',
  borderRadius: '6px',
  transition: 'background 0.15s',
}

const themeToggleStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg3)',
  border: '1px solid var(--border2)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'background 0.15s',
}
