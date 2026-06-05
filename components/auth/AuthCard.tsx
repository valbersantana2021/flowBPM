interface AuthCardProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="auth-card" style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border2)',
      borderRadius: '16px',
      boxShadow: 'var(--shadow-lg)',
      padding: '2rem',
      width: '100%',
      maxWidth: '400px',
    }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: 'var(--text2)', marginTop: '0.5rem', fontSize: '0.9rem' }}>{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  )
}
