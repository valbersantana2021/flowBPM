'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Diagram {
  id: string
  name: string
  createdAt: string
}

// In-memory mock store — replaced by Supabase in Phase 7
function useDiagrams() {
  const [diagrams, setDiagrams] = useState<Diagram[]>([
    {
      id: 'demo-1',
      name: 'Processo de Onboarding',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: 'demo-2',
      name: 'Aprovação de Férias',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
  ])

  const createDiagram = useCallback((): string => {
    const id = `diagram-${crypto.randomUUID().slice(0, 8)}`
    setDiagrams((prev) => [
      { id, name: 'Novo Diagrama', createdAt: new Date().toISOString() },
      ...prev,
    ])
    return id
  }, [])

  const deleteDiagram = useCallback((id: string) => {
    setDiagrams((prev) => prev.filter((d) => d.id !== id))
  }, [])

  return { diagrams, createDiagram, deleteDiagram }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'Agora mesmo'
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function DashboardPage() {
  const router = useRouter()
  const { diagrams, createDiagram, deleteDiagram } = useDiagrams()

  function handleNew() {
    const id = createDiagram()
    router.push(`/editor/${id}`)
  }

  return (
    <main style={mainStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div>
          <h1 style={h1Style}>Meus Diagramas</h1>
          <p style={{ color: 'var(--text2)', fontSize: '0.88rem' }}>
            {diagrams.length} diagrama{diagrams.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button id="new-diagram" onClick={handleNew} style={newBtnStyle}>
          + Novo Diagrama
        </button>
      </div>

      {/* Usage Bar — Free plan */}
      <div style={usageBarWrapStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>Plano Free</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text2)' }}>{diagrams.length}/5 este mês</span>
        </div>
        <div style={usageBarBgStyle}>
          <div style={usageBarFillStyle(diagrams.length / 5)} />
        </div>
      </div>

      {/* Grid */}
      {diagrams.length === 0 ? (
        <div style={emptyStateStyle}>
          <p style={{ fontSize: '2rem' }}>📊</p>
          <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>
            Nenhum diagrama ainda
          </p>
          <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
            Crie seu primeiro diagrama BPMN com IA
          </p>
          <button onClick={handleNew} style={newBtnStyle}>
            + Criar primeiro diagrama
          </button>
        </div>
      ) : (
        <div style={gridStyle}>
          {/* New diagram card */}
          <button onClick={handleNew} style={newCardStyle}>
            <span style={{ fontSize: '2rem', color: 'var(--accent)' }}>+</span>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
              Novo Diagrama
            </span>
          </button>

          {/* Existing cards */}
          {diagrams.map((d) => (
            <DiagramCard key={d.id} diagram={d} onDelete={deleteDiagram} />
          ))}
        </div>
      )}
    </main>
  )
}

function DiagramCard({
  diagram,
  onDelete,
}: {
  diagram: Diagram
  onDelete: (id: string) => void
}) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div
      className="diagram-card"
      style={cardStyle}
      onMouseLeave={() => setShowMenu(false)}
    >
      {/* Preview area */}
      <Link href={`/editor/${diagram.id}`} style={{ textDecoration: 'none', display: 'block' }}>
        <div style={cardPreviewStyle}>
          <BpmnPlaceholderSvg />
        </div>
      </Link>

      {/* Footer */}
      <div style={cardFooterStyle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={cardNameStyle}>{diagram.name}</p>
          <p style={{ color: 'var(--text3)', fontSize: '0.75rem' }}>{timeAgo(diagram.createdAt)}</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            style={menuBtnStyle}
            aria-label="Opções"
            title="Opções"
          >
            ⋯
          </button>
          {showMenu && (
            <div style={menuStyle}>
              <Link href={`/editor/${diagram.id}`} style={menuItemStyle}>
                ✏️ Abrir
              </Link>
              <button
                onClick={() => onDelete(diagram.id)}
                style={{ ...menuItemStyle, color: 'var(--red)', background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
              >
                🗑 Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function BpmnPlaceholderSvg() {
  return (
    <svg viewBox="0 0 280 140" width="100%" height="100%" style={{ display: 'block', opacity: 0.5 }}>
      <rect x="10" y="57" width="26" height="26" rx="13" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
      <rect x="60" y="47" width="80" height="40" rx="4" fill="none" stroke="var(--text2)" strokeWidth="1.5" />
      <rect x="170" y="47" width="80" height="40" rx="4" fill="none" stroke="var(--text2)" strokeWidth="1.5" />
      <rect x="244" y="57" width="26" height="26" rx="13" fill="none" stroke="var(--red)" strokeWidth="1.5" />
      <rect x="256" y="57" width="2" height="26" rx="1" fill="var(--red)" />
      <rect x="244" y="69" width="26" height="2" rx="1" fill="var(--red)" />
      <line x1="36" y1="70" x2="60" y2="70" stroke="var(--text3)" strokeWidth="1.5" markerEnd="url(#a)" />
      <line x1="140" y1="70" x2="170" y2="70" stroke="var(--text3)" strokeWidth="1.5" />
      <line x1="250" y1="70" x2="270" y2="70" stroke="var(--text3)" strokeWidth="1.5" />
      <text x="100" y="73" textAnchor="middle" fill="var(--text2)" fontSize="9" fontFamily="DM Sans, sans-serif">Tarefa 1</text>
      <text x="210" y="73" textAnchor="middle" fill="var(--text2)" fontSize="9" fontFamily="DM Sans, sans-serif">Tarefa 2</text>
    </svg>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const mainStyle: React.CSSProperties = {
  padding: '2rem 1.5rem',
  maxWidth: '1200px',
  margin: '0 auto',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '1.5rem',
  gap: '1rem',
}

const h1Style: React.CSSProperties = {
  fontFamily: 'Syne, sans-serif',
  fontSize: '1.6rem',
  fontWeight: 800,
  color: 'var(--text)',
  margin: 0,
}

const newBtnStyle: React.CSSProperties = {
  padding: '0.55rem 1.1rem',
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '0.88rem',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const usageBarWrapStyle: React.CSSProperties = {
  marginBottom: '1.75rem',
  padding: '0.85rem 1rem',
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: '10px',
}

const usageBarBgStyle: React.CSSProperties = {
  height: '6px',
  background: 'var(--bg4)',
  borderRadius: '3px',
  overflow: 'hidden',
}

function usageBarFillStyle(fraction: number): React.CSSProperties {
  const pct = Math.min(fraction, 1) * 100
  return {
    height: '100%',
    width: `${pct}%`,
    background: pct >= 80 ? 'var(--amber)' : 'var(--accent)',
    borderRadius: '3px',
    transition: 'width 0.4s',
  }
}

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  paddingTop: '5rem',
  textAlign: 'center',
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '1rem',
}

const newCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '200px',
  background: 'var(--bg2)',
  border: `2px dashed var(--border2)`,
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'border-color 0.15s',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg2)',
  border: '1px solid var(--border)',
  borderRadius: '12px',
  overflow: 'hidden',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const cardPreviewStyle: React.CSSProperties = {
  height: '140px',
  background: 'var(--bg3)',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.75rem',
}

const cardFooterStyle: React.CSSProperties = {
  padding: '0.7rem 0.85rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
}

const cardNameStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: '0.85rem',
  color: 'var(--text)',
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const menuBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--text2)',
  fontSize: '1rem',
  cursor: 'pointer',
  padding: '0.2rem 0.4rem',
  borderRadius: '4px',
  lineHeight: 1,
}

const menuStyle: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  bottom: '100%',
  background: 'var(--bg3)',
  border: '1px solid var(--border2)',
  borderRadius: '8px',
  boxShadow: 'var(--shadow-lg)',
  minWidth: '120px',
  zIndex: 10,
  overflow: 'hidden',
}

const menuItemStyle: React.CSSProperties = {
  display: 'block',
  padding: '0.55rem 0.85rem',
  color: 'var(--text)',
  fontSize: '0.83rem',
  textDecoration: 'none',
  cursor: 'pointer',
}
