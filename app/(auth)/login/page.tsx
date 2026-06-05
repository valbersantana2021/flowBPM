import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Entrar — FlowMind',
  description: 'Acesse sua conta no FlowMind e continue criando diagramas BPMN com IA.',
}

export default function LoginPage() {
  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta para continuar."
    >
      <LoginForm />
      <p style={{
        marginTop: '1.25rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text2)',
      }}>
        Não tem conta?{' '}
        <Link
          href="/signup"
          style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
        >
          Criar conta
        </Link>
      </p>
    </AuthCard>
  )
}
