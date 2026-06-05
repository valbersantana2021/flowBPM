'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useEditorStore } from '@/stores/editorStore'
import type { BpmnCanvasRef } from '@/components/bpmn/BpmnCanvas'
import dynamic from 'next/dynamic'

// Lazy-load the BpmnCanvas (bpmn-js is browser-only)
const BpmnCanvas = dynamic(() => import('@/components/bpmn/BpmnCanvas'), {
  ssr: false,
  loading: () => (
    <div style={canvasLoadingStyle}>
      <div style={spinnerStyle} />
      <span style={{ color: 'var(--text2)', fontSize: '0.85rem', marginTop: '1rem' }}>
        Carregando editor BPMN…
      </span>
    </div>
  ),
})

export default function EditorPage() {
  const canvasRef = useRef<BpmnCanvasRef>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [pendingXml, setPendingXml] = useState<string | null>(null)

  const { messages, isGenerating, currentXml, diagramName, setCurrentXml, addMessage, setGenerating, setDiagramName } =
    useEditorStore()

  const sendMessage = useCallback(async () => {
    const text = chatInput.trim()
    if (!text || isGenerating) return

    setChatInput('')
    addMessage({ role: 'user', content: text })
    setGenerating(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/generate-bpmn', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text, history, currentXml }),
      })

      if (!res.ok) throw new Error(`Erro ${res.status}`)
      const data: { xml?: string; message?: string; error?: string } = await res.json()

      if (data.error) throw new Error(data.error)

      addMessage({ role: 'assistant', content: data.message ?? 'Diagrama gerado!', xml: data.xml })
      if (data.xml) setPendingXml(data.xml)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      addMessage({ role: 'assistant', content: `❌ Erro ao gerar diagrama: ${msg}` })
    } finally {
      setGenerating(false)
    }
  }, [chatInput, isGenerating, messages, currentXml, addMessage, setGenerating])

  const applyToCanvas = useCallback(
    async (xml: string) => {
      if (!canvasRef.current || !canvasReady) {
        // Store as pending — will auto-apply when canvas becomes ready
        setPendingXml(xml)
        return
      }
      try {
        await canvasRef.current.importXML(xml)
        setCurrentXml(xml)
        setPendingXml(null)
      } catch (err) {
        console.error('[Editor] apply error:', err)
      }
    },
    [canvasReady, setCurrentXml]
  )

  // Auto-apply any pending XML once the canvas becomes ready
  useEffect(() => {
    if (canvasReady && pendingXml && canvasRef.current) {
      canvasRef.current.importXML(pendingXml).then(() => {
        setCurrentXml(pendingXml)
        setPendingXml(null)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={editorLayoutStyle}>
      {/* Chat Panel — Left */}
      <aside style={chatPanelStyle} className="chat-panel">
        {/* Header */}
        <div style={chatHeaderStyle}>
          <input
            value={diagramName}
            onChange={(e) => setDiagramName(e.target.value)}
            style={diagramNameInputStyle}
            aria-label="Nome do diagrama"
          />
          {canvasReady && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <ZoomButton label="−" onClick={() => canvasRef.current?.zoom('out')} />
              <ZoomButton label="⊡" onClick={() => canvasRef.current?.zoom('fit')} />
              <ZoomButton label="+" onClick={() => canvasRef.current?.zoom('in')} />
            </div>
          )}
        </div>

        {/* Messages */}
        <div style={messagesStyle} id="chat-messages">
          {messages.length === 0 && (
            <div style={emptyStateStyle}>
              <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>✨</p>
              <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.25rem' }}>
                Descreva seu processo
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text3)' }}>
                Ex: &quot;Crie um processo de aprovação de férias com RH e gestor&quot;
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} style={msgWrapperStyle(msg.role)}>
              <div style={msgBubbleStyle(msg.role)}>
                <ReactMarkdownText text={msg.content} />
              </div>
              {msg.xml && (
                <button
                  onClick={() => applyToCanvas(msg.xml!)}
                  style={applyBtnStyle}
                  title="Aplicar este diagrama ao canvas"
                >
                  ▶ Aplicar ao diagrama
                </button>
              )}
            </div>
          ))}

          {isGenerating && (
            <div style={msgWrapperStyle('assistant')}>
              <div style={{ ...msgBubbleStyle('assistant'), display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                <span style={dotStyle(0)} />
                <span style={dotStyle(1)} />
                <span style={dotStyle(2)} />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={inputAreaStyle}>
          {pendingXml && (
            <button onClick={() => applyToCanvas(pendingXml)} style={applyBannerStyle}>
              ▶ Aplicar último diagrama ao canvas
            </button>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <textarea
              id="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Descreva o processo em português…"
              rows={2}
              disabled={isGenerating}
              style={textareaStyle}
              aria-label="Mensagem para gerar BPMN"
            />
            <button
              id="chat-send"
              onClick={sendMessage}
              disabled={isGenerating || !chatInput.trim()}
              style={sendBtnStyle(isGenerating || !chatInput.trim())}
              aria-label="Enviar"
            >
              {isGenerating ? '…' : '↑'}
            </button>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text3)', marginTop: '0.4rem' }}>
            Enter para enviar · Shift+Enter nova linha
          </p>
        </div>
      </aside>

      {/* Canvas Panel — Right */}
      <section style={canvasPanelStyle} className="canvas-panel">
        <BpmnCanvas
          ref={canvasRef}
          onReady={() => setCanvasReady(true)}
          style={{ width: '100%', height: '100%' }}
        />
        {!canvasReady && (
          <div style={{ ...canvasLoadingStyle, position: 'absolute', inset: 0 }}>
            <div style={spinnerStyle} />
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem', marginTop: '1rem' }}>
              Carregando editor BPMN…
            </span>
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Mini Components ─────────────────────────────────────────────────────────

function ZoomButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={zoomBtnStyle} title={label}>
      {label}
    </button>
  )
}

// Simple markdown renderer for bold, italic and line breaks
function ReactMarkdownText({ text }: { text: string }) {
  const parts = text.split('\n').map((line, i) => {
    const rendered = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    return (
      <span key={i}>
        <span dangerouslySetInnerHTML={{ __html: rendered }} />
        {i < text.split('\n').length - 1 && <br />}
      </span>
    )
  })
  return <>{parts}</>
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const editorLayoutStyle: React.CSSProperties = {
  display: 'flex',
  height: 'calc(100vh - 56px)',
  overflow: 'hidden',
}

const chatPanelStyle: React.CSSProperties = {
  width: '380px',
  minWidth: '320px',
  flexShrink: 0,
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg2)',
  borderRight: '1px solid var(--border)',
}

const chatHeaderStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid var(--border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.5rem',
  background: 'var(--bg3)',
}

const diagramNameInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--text)',
  fontSize: '0.9rem',
  fontWeight: 600,
  fontFamily: 'Syne, sans-serif',
}

const messagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
}

const emptyStateStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  flex: 1,
  padding: '2rem 1rem',
  color: 'var(--text2)',
}

function msgWrapperStyle(role: string): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: role === 'user' ? 'flex-end' : 'flex-start',
    gap: '0.35rem',
  }
}

function msgBubbleStyle(role: string): React.CSSProperties {
  const isUser = role === 'user'
  return {
    maxWidth: '85%',
    padding: '0.6rem 0.85rem',
    borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
    background: isUser ? 'var(--accent)' : 'var(--bg4)',
    color: isUser ? '#fff' : 'var(--text)',
    fontSize: '0.85rem',
    lineHeight: 1.5,
    border: isUser ? 'none' : '1px solid var(--border2)',
  }
}

const applyBtnStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  padding: '0.3rem 0.75rem',
  background: 'var(--green-bg)',
  border: '1px solid var(--green)',
  borderRadius: '6px',
  color: 'var(--green)',
  fontSize: '0.78rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const inputAreaStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderTop: '1px solid var(--border)',
  background: 'var(--bg3)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
}

const applyBannerStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.4rem',
  background: 'var(--green-bg)',
  border: '1px solid var(--green)',
  borderRadius: '6px',
  color: 'var(--green)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
}

const textareaStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.55rem 0.75rem',
  background: 'var(--bg4)',
  border: '1px solid var(--border2)',
  borderRadius: '8px',
  color: 'var(--text)',
  fontSize: '0.85rem',
  resize: 'none',
  outline: 'none',
  lineHeight: 1.5,
  fontFamily: 'DM Sans, sans-serif',
}

function sendBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    background: disabled ? 'var(--bg4)' : 'var(--accent)',
    color: disabled ? 'var(--text3)' : '#fff',
    border: 'none',
    fontSize: '1.2rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }
}

const canvasPanelStyle: React.CSSProperties = {
  flex: 1,
  position: 'relative',
  background: '#fff',  // bpmn-js renders a white SVG canvas
  overflow: 'hidden',
}

const canvasLoadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg)',
  zIndex: 2,
}

const spinnerStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  border: '2.5px solid var(--border2)',
  borderTopColor: 'var(--accent)',
  animation: 'spin 0.8s linear infinite',
}

const zoomBtnStyle: React.CSSProperties = {
  width: '26px',
  height: '26px',
  background: 'var(--bg4)',
  border: '1px solid var(--border2)',
  borderRadius: '4px',
  color: 'var(--text2)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

function dotStyle(i: number): React.CSSProperties {
  return {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--text3)',
    animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
  }
}
