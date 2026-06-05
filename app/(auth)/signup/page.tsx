import Link from 'next/link'
import { AuthCard } from '@/components/auth/AuthCard'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = {
  title: 'Criar conta — FlowMind',
  description: 'Crie sua conta gratuita no FlowMind e comece a criar diagramas BPMN com IA.',
}

export default function SignupPage() {
  return (
    <AuthCard
      title="Crie sua conta"
      subtitle="Grátis para sempre no plano Free."
    >
      <SignupForm />
      <p style={{
        marginTop: '1.25rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text2)',
      }}>
        Já tem conta?{' '}
        <Link
          href="/login"
          style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}
        >
          Entrar
        </Link>
      </p>
    </AuthCard>
  )
}
