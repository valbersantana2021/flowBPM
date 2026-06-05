'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth'
import { useAuth } from '@/hooks/useAuth'
import { GoogleAuthButton } from './GoogleAuthButton'

export function LoginForm() {
  const router = useRouter()
  const auth = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)
    const result = await auth.signInWithEmail(values.email, values.password)
    if (result.error) {
      if (result.error.code === 'invalid_credentials') {
        setServerError('E-mail ou senha incorretos.')
      } else {
        setServerError('Ocorreu um erro. Tente novamente.')
      }
      return
    }
    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Email */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label htmlFor="login-email" style={labelStyle}>E-mail</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          aria-invalid={!!errors.email}
          {...register('email')}
          style={inputStyle(!!errors.email)}
        />
        {errors.email && (
          <span role="alert" style={errorStyle}>{errors.email.message}</span>
        )}
      </div>

      {/* Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label htmlFor="login-password" style={labelStyle}>Senha</label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          aria-invalid={!!errors.password}
          {...register('password')}
          style={inputStyle(!!errors.password)}
        />
        {errors.password && (
          <span role="alert" style={errorStyle}>{errors.password.message}</span>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div role="alert" style={serverErrorStyle}>{serverError}</div>
      )}

      {/* Submit */}
      <button
        id="login-submit"
        type="submit"
        disabled={isSubmitting}
        style={submitStyle(isSubmitting)}
      >
        {isSubmitting ? 'Entrando…' : 'Entrar'}
      </button>

      {/* Divider */}
      <div style={dividerStyle}>
        <span style={dividerLineStyle} />
        <span style={{ color: 'var(--text3)', fontSize: '0.8rem', whiteSpace: 'nowrap', padding: '0 0.5rem' }}>ou</span>
        <span style={dividerLineStyle} />
      </div>

      <GoogleAuthButton />
    </form>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 500,
  color: 'var(--text2)',
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '0.6rem 0.85rem',
    background: 'var(--bg3)',
    border: `1px solid ${hasError ? 'var(--red)' : 'var(--border2)'}`,
    borderRadius: '8px',
    color: 'var(--text)',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }
}

const errorStyle: React.CSSProperties = {
  fontSize: '0.78rem',
  color: 'var(--red)',
}

const serverErrorStyle: React.CSSProperties = {
  padding: '0.6rem 0.85rem',
  background: 'var(--red-bg)',
  border: '1px solid var(--red)',
  borderRadius: '8px',
  color: 'var(--red)',
  fontSize: '0.85rem',
}

function submitStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '0.7rem',
    background: disabled ? 'var(--accent-bg)' : 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.7 : 1,
    transition: 'background 0.15s, opacity 0.15s',
  }
}

const dividerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
}

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: '1px',
  background: 'var(--border2)',
}
