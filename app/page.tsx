import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '3rem', color: 'var(--text)', marginBottom: '1rem' }}>
        FlowMind
      </h1>
      <p style={{ color: 'var(--text2)', marginBottom: '2rem', textAlign: 'center', maxWidth: '480px' }}>
        Crie diagramas BPMN 2.0 usando linguagem natural em português.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Link
          href="/signup"
          style={{ background: 'var(--accent)', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: 500 }}
        >
          Começar grátis
        </Link>
        <Link
          href="/login"
          style={{ background: 'var(--bg3)', color: 'var(--text)', padding: '0.75rem 1.5rem', borderRadius: '8px', textDecoration: 'none', border: '1px solid var(--border2)' }}
        >
          Entrar
        </Link>
      </div>
    </main>
  )
}
