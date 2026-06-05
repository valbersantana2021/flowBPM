# PRD — FlowMind: SaaS de Diagramas BPMN com IA

**Versão:** 1.2  
**Data:** Junho 2026  
**Stack:** Next.js 15 · Supabase · Claude API · Stripe · bpmn-js  
**Destino:** Usar este documento como contexto no Claude Code para scaffolding completo do projeto

---

## Changelog

| Versão | Data | Alterações |
|--------|------|-----------|
| 1.0 | Jun 2026 | Versão inicial |
| 1.1 | Jun 2026 | Adicionado tema light/dark com toggle e persistência |
| 1.2 | Jun 2026 | Documentada estratégia de importação bpmn-js; adicionado hook useTheme; corrigido design system com tokens de ambos os temas |

---

## 1. Visão Geral

FlowMind é um SaaS B2B que permite criar, editar e interpretar diagramas BPMN 2.0 usando linguagem natural em português brasileiro. O usuário descreve um processo; a IA (Claude Sonnet 4.6) gera o diagrama automaticamente. Foco inicial em equipes de RH, DP e gestão de processos.

**Problema:** Modelagem BPMN exige conhecimento técnico da notação. Ferramentas como Bizagi e Lucidchart têm curva de aprendizado alta. Times não-técnicos não conseguem documentar processos sem depender de analistas.

**Solução:** Interface de chat + canvas visual. O usuário fala português; a IA produz BPMN 2.0 válido.

**Diferencial:** Português nativo, Vision (imagem → BPMN), histórico por diagrama, exportação padrão BPMN, tema light/dark com persistência.

---

## 2. Stack Técnica

### Frontend
- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS v4** + **shadcn/ui**
- **bpmn-js 18.x** — `npm install bpmn-js` — importação **sempre dinâmica** (`import()`)
- **Zustand** (estado global: sessão de chat, XML do diagrama, tema)
- **React Hook Form + Zod** (formulários e validação)
- **next-themes** (gerenciamento de tema light/dark com SSR-safe)

### Backend
- **Supabase** (PostgreSQL + Auth + Storage + Edge Functions)
- **Supabase Auth** (email/senha + OAuth Google)
- **Supabase Edge Functions** (Deno) — chamada à API Anthropic
- **Supabase Storage** — thumbnails SVG dos diagramas

### IA
- **Anthropic Claude Sonnet** via API
- Modelo: `claude-sonnet-4-20250514`
- Prompts em template strings (Deno)
- Suporte a Vision (base64 image → BPMN)

### Pagamento
- **Stripe** (Subscriptions + Webhooks)
- Planos: Free, Pro (R$49/mês), Business (R$149/mês)

### Infra
- **Vercel** (deploy frontend Next.js)
- **Supabase** (backend completo)
- CI/CD: GitHub Actions

---

## 3. Schema do Banco (Supabase)

```sql
-- profiles (criado automaticamente via trigger on auth.users)
profiles (
  id uuid PK → auth.users
  full_name text
  avatar_url text
  plan text DEFAULT 'free'  -- 'free' | 'pro' | 'business'
  stripe_customer_id text
  created_at timestamptz
  updated_at timestamptz
)

-- diagrams
diagrams (
  id uuid PK
  user_id uuid FK → profiles
  name text DEFAULT 'Novo Diagrama'
  bpmn_xml text          -- XML BPMN 2.0 completo
  thumbnail_svg text     -- SVG comprimido para preview
  is_archived boolean DEFAULT false
  created_at timestamptz
  updated_at timestamptz
)

-- conversations
conversations (
  id uuid PK
  diagram_id uuid FK → diagrams
  user_id uuid FK → profiles
  role text CHECK (role IN ('user', 'assistant'))
  content text
  created_at timestamptz
)

-- usage_logs
usage_logs (
  id uuid PK
  user_id uuid FK → profiles
  action text  -- 'create' | 'edit' | 'interpret'
  diagram_id uuid FK → diagrams
  tokens_used integer
  model text
  created_at timestamptz
)

-- subscriptions
subscriptions (
  id uuid PK
  user_id uuid FK → profiles
  stripe_subscription_id text UNIQUE
  stripe_price_id text
  status text  -- 'active' | 'canceled' | 'past_due' | 'trialing'
  plan text  -- 'pro' | 'business'
  current_period_start timestamptz
  current_period_end timestamptz
  canceled_at timestamptz
  created_at timestamptz
  updated_at timestamptz
)
```

**RLS:** Todas as tabelas com RLS ativo. Cada usuário só acessa seus próprios dados.

**Função auxiliar:**
```sql
check_plan_limit(user_id uuid) → boolean
-- Retorna true se o usuário ainda tem cota no mês
-- Free: 5/mês | Pro: 50/mês | Business: ilimitado
```

---

## 4. Estrutura de Pastas (Next.js App Router)

```
flowmind/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   ├── editor/[id]/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── webhooks/stripe/route.ts
│   ├── layout.tsx                    ← ThemeProvider aqui
│   └── page.tsx                      ← Landing page
├── components/
│   ├── bpmn/
│   │   ├── BpmnCanvas.tsx            ← Componente crítico
│   │   ├── BpmnToolbar.tsx
│   │   └── useBpmnModeler.ts         ← Hook de inicialização
│   ├── chat/
│   │   ├── ChatPanel.tsx
│   │   ├── ChatMessage.tsx
│   │   └── ChatInput.tsx
│   ├── dashboard/
│   │   ├── DiagramCard.tsx
│   │   └── UsageBar.tsx
│   ├── editor/
│   │   └── EditorLayout.tsx
│   ├── layout/
│   │   ├── Topbar.tsx                ← Inclui ThemeToggle
│   │   └── ThemeToggle.tsx           ← Botão 🌙/☀️
│   └── ui/                           ← shadcn/ui components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── types.ts
│   ├── stripe.ts
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts
│   ├── useDiagram.ts
│   ├── useChat.ts
│   └── useTheme.ts                   ← Hook de tema
├── stores/
│   └── editorStore.ts
├── supabase/
│   └── functions/
│       └── generate-bpmn/
│           └── index.ts
└── types/
    └── index.ts
```

---

## 5. Componente Crítico: BpmnCanvas

**REGRA ABSOLUTA:** bpmn-js nunca deve ser importado estaticamente. Sempre usar `import()` dinâmico dentro de `useEffect`. Importação estática quebra o build do Next.js (módulo usa APIs de browser no top-level).

```typescript
// components/bpmn/BpmnCanvas.tsx
'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'

export interface BpmnCanvasRef {
  importXML: (xml: string) => Promise<void>
  exportXML: () => Promise<string>
  exportSVG: () => Promise<string>
  zoom: (direction: 'in' | 'out' | 'fit') => void
}

interface BpmnCanvasProps {
  className?: string
  onReady?: () => void
}

const BpmnCanvas = forwardRef<BpmnCanvasRef, BpmnCanvasProps>(
  ({ className, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const modelerRef = useRef<any>(null)

    useEffect(() => {
      // SEMPRE importação dinâmica — nunca import estático no topo do arquivo
      import('bpmn-js/lib/Modeler').then(({ default: BpmnModeler }) => {
        if (!containerRef.current) return
        modelerRef.current = new BpmnModeler({
          container: containerRef.current,
          keyboard: { bindTo: document },
        })
        onReady?.()
      })

      return () => {
        modelerRef.current?.destroy()
      }
    }, [])

    useImperativeHandle(ref, () => ({
      importXML: async (xml) => {
        await modelerRef.current?.importXML(xml)
        modelerRef.current?.get('canvas').zoom('fit-viewport')
      },
      exportXML: async () => {
        const { xml } = await modelerRef.current?.saveXML({ format: true })
        return xml
      },
      exportSVG: async () => {
        const { svg } = await modelerRef.current?.saveSVG()
        return svg
      },
      zoom: (direction) => {
        const canvas = modelerRef.current?.get('canvas')
        const scroll = modelerRef.current?.get('zoomScroll')
        if (direction === 'fit') canvas?.zoom('fit-viewport')
        else if (direction === 'in') scroll?.zoom(0.3)
        else scroll?.zoom(-0.3)
      },
    }))

    return <div ref={containerRef} className={className} />
  }
)

BpmnCanvas.displayName = 'BpmnCanvas'
export default BpmnCanvas
```

---

## 6. Tema Light/Dark

### Implementação com next-themes

```typescript
// app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="flowmind-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Hook useTheme

```typescript
// hooks/useTheme.ts
'use client'
import { useTheme as useNextTheme } from 'next-themes'

export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme()
  const isDark = resolvedTheme === 'dark'

  const toggle = () => setTheme(isDark ? 'light' : 'dark')

  return { isDark, toggle, theme }
}
```

### Componente ThemeToggle

```typescript
// components/layout/ThemeToggle.tsx
'use client'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="btn btn-icon btn-sm"
      title={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
      aria-label="Alternar tema"
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  )
}
```

### Tokens CSS — Dark (padrão)

```css
:root {
  --bg:           #0A0C10;
  --bg2:          #0F1218;
  --bg3:          #151820;
  --bg4:          #1C2030;
  --border:       rgba(255,255,255,0.07);
  --border2:      rgba(255,255,255,0.12);
  --text:         #F0F2F8;
  --text2:        #8A90A4;
  --text3:        #555A6E;
  --accent:       #4B7FFF;
  --accent2:      #6B9FFF;
  --accent-bg:    rgba(75,127,255,0.10);
  --accent-border:rgba(75,127,255,0.25);
  --green:        #3DD68C;
  --green-bg:     rgba(61,214,140,0.10);
  --amber:        #F5A623;
  --amber-bg:     rgba(245,166,35,0.10);
  --red:          #F56565;
  --red-bg:       rgba(245,101,101,0.10);
  --topbar-bg:    rgba(10,12,16,0.92);
  --shadow:       0 1px 3px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.04);
  --shadow-lg:    0 8px 32px rgba(0,0,0,0.60);
}
```

### Tokens CSS — Light

```css
:root.light,
[data-theme='light'] {
  --bg:           #F5F6FA;
  --bg2:          #FFFFFF;
  --bg3:          #EEF0F6;
  --bg4:          #E2E5EF;
  --border:       rgba(0,0,0,0.07);
  --border2:      rgba(0,0,0,0.13);
  --text:         #0F1218;
  --text2:        #5A6070;
  --text3:        #9AA0B0;
  --accent:       #3A6FEE;
  --accent2:      #2458D8;
  --accent-bg:    rgba(58,111,238,0.08);
  --accent-border:rgba(58,111,238,0.22);
  --green:        #1A9E5C;
  --green-bg:     rgba(26,158,92,0.09);
  --amber:        #C47D0A;
  --amber-bg:     rgba(196,125,10,0.09);
  --red:          #D94040;
  --red-bg:       rgba(217,64,64,0.09);
  --topbar-bg:    rgba(245,246,250,0.92);
  --shadow:       0 1px 4px rgba(0,0,0,0.08), 0 0 0 0.5px rgba(0,0,0,0.04);
  --shadow-lg:    0 8px 32px rgba(0,0,0,0.12);
}
```

### Tipografia

- Headings: `Syne` (700–800) — `font-family: 'Syne', sans-serif`
- Corpo: `DM Sans` (300–500) — `font-family: 'DM Sans', sans-serif`
- Importar via Google Fonts no `layout.tsx`

### Transição suave ao trocar tema

```css
body,
.topbar,
.auth-card,
.feature-card,
.plan-card,
.diagram-card,
.settings-section,
.chat-panel,
.canvas-panel,
.editor-topbar {
  transition: background 0.25s, border-color 0.25s, color 0.2s;
}
```

### Tailwind config (dark mode via class)

```typescript
// tailwind.config.ts
export default {
  darkMode: 'class',   // ← obrigatório para funcionar com next-themes
  // ...
}
```

---

## 7. Edge Function: generate-bpmn

```typescript
// supabase/functions/generate-bpmn/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Anthropic from "npm:@anthropic-ai/sdk"
import { createClient } from "npm:@supabase/supabase-js"

const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! })
const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

const SYSTEM_PROMPT = `Você é um especialista em modelagem de processos BPMN 2.0.
Quando o usuário descrever um processo, gere um diagrama BPMN completo e válido.

REGRAS OBRIGATÓRIAS:
1. Responda SEMPRE com JSON válido contendo dois campos: "xml" e "message"
2. "xml": XML BPMN 2.0 completo com coordenadas de layout (BPMNDiagram/BPMNShape/BPMNEdge)
3. "message": explicação amigável em português do que foi criado/alterado
4. Nomeie todos os elementos em português brasileiro
5. Inclua sempre: startEvent, endEvent, pelo menos uma task, flows corretamente ligados
6. Para edições: preserve o que não foi pedido para alterar
7. Use IDs únicos com prefixo (ex: StartEvent_1, Task_aprovacao, Gateway_decisao)
8. O XML deve estar completo com namespace e BPMNDiagram com coordenadas reais

ELEMENTOS SUPORTADOS:
Tasks: task, userTask, serviceTask, sendTask, receiveTask, businessRuleTask, manualTask, scriptTask
Gateways: exclusiveGateway, parallelGateway, inclusiveGateway
Events: startEvent, endEvent, intermediateThrowEvent, intermediateCatchEvent (timer/message)

NÃO USE: pools, lanes

FORMATO DE RESPOSTA (JSON puro, sem markdown, sem backticks):
{"xml": "<?xml version=\\"1.0\\"...>...</definitions>", "message": "Criado processo com..."}`

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '') || ''
    )
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: withinLimit } = await supabase.rpc('check_plan_limit', { p_user_id: user.id })
    if (!withinLimit) {
      return new Response(JSON.stringify({ error: 'PLAN_LIMIT_REACHED' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { message, history = [], currentXml, imageBase64, diagramId } = await req.json()

    let userContent: any = message
    if (imageBase64) {
      userContent = [
        { type: "image", source: { type: "base64", media_type: "image/png", data: imageBase64 } },
        { type: "text", text: message || "Converta esta imagem em um diagrama BPMN" }
      ]
    } else if (currentXml) {
      userContent = `${message}\n\nXML atual do diagrama:\n${currentXml}`
    }

    const messages = [
      ...history.slice(-10),
      { role: "user", content: userContent }
    ]

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(rawText)

    await supabase.from('usage_logs').insert({
      user_id: user.id,
      action: currentXml ? 'edit' : 'create',
      diagram_id: diagramId || null,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
      model: response.model
    })

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal error', details: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
```

---

## 8. Zustand Store: Editor

```typescript
// stores/editorStore.ts
import { create } from 'zustand'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  xml?: string
  timestamp: Date
}

interface EditorStore {
  diagramId: string | null
  diagramName: string
  currentXml: string | null
  isDirty: boolean
  isSaving: boolean
  messages: ChatMessage[]
  isGenerating: boolean

  setDiagramId: (id: string) => void
  setDiagramName: (name: string) => void
  setCurrentXml: (xml: string) => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  setGenerating: (v: boolean) => void
  setSaving: (v: boolean) => void
  reset: () => void
}

export const useEditorStore = create<EditorStore>((set) => ({
  diagramId: null,
  diagramName: 'Novo Diagrama',
  currentXml: null,
  isDirty: false,
  isSaving: false,
  messages: [],
  isGenerating: false,

  setDiagramId: (id) => set({ diagramId: id }),
  setDiagramName: (name) => set({ diagramName: name, isDirty: true }),
  setCurrentXml: (xml) => set({ currentXml: xml, isDirty: true }),
  addMessage: (msg) => set((s) => ({
    messages: [...s.messages, { ...msg, id: crypto.randomUUID(), timestamp: new Date() }]
  })),
  setGenerating: (v) => set({ isGenerating: v }),
  setSaving: (v) => set({ isSaving: v }),
  reset: () => set({
    diagramId: null, diagramName: 'Novo Diagrama', currentXml: null,
    isDirty: false, isSaving: false, messages: [], isGenerating: false
  }),
}))
```

---

## 9. Páginas e Rotas

| Rota | Componente | Auth | Descrição |
|------|-----------|------|-----------|
| `/` | `LandingPage` | Público | Hero, features, pricing |
| `/login` | `LoginPage` | Público | Email+senha, Google OAuth |
| `/signup` | `SignupPage` | Público | Cadastro com nome, email, senha |
| `/dashboard` | `DashboardPage` | Privado | Grid de diagramas, uso do plano |
| `/editor` | `EditorPage` | Privado | Novo diagrama vazio |
| `/editor/[id]` | `EditorPage` | Privado | Diagrama existente carregado |
| `/settings` | `SettingsPage` | Privado | Perfil, plano, zona de perigo |
| `/api/webhooks/stripe` | `POST handler` | Público (validado) | Eventos Stripe |

**ThemeToggle** aparece na Topbar de todas as páginas autenticadas e na landing.

---

## 10. Fluxo de Dados — Editor

```
1. Usuário digita no ChatInput
2. useChat.ts → sendMessage()
3. Append msg do usuário no store
4. Chama Supabase Edge Function: POST /functions/v1/generate-bpmn
   Body: { message, history[-10], currentXml, imageBase64? }
5. Edge Function: valida auth → checa limite → chama Claude → loga uso
6. Retorna { xml, message }
7. Frontend:
   a. Append msg do assistente no store
   b. Mostra botão "Aplicar ao diagrama"
   c. Ao clicar: BpmnCanvasRef.importXML(xml)
   d. Salva XML no Supabase (diagrams.bpmn_xml)
   e. Gera thumbnail: BpmnCanvasRef.exportSVG() → salva no Storage
```

---

## 11. Planos e Limites

| Feature | Free | Pro (R$49) | Business (R$149) |
|---------|------|-----------|-----------------|
| Diagramas/mês | 5 | 50 | Ilimitado |
| Vision (imagem → BPMN) | ✗ | ✓ | ✓ |
| Histórico | 30 dias | Ilimitado | Ilimitado |
| Exportação | .bpmn + PNG | .bpmn + PNG | .bpmn + PNG + API |
| Suporte | Community | Prioritário | SLA + Dedicado |
| API Access | ✗ | ✗ | ✓ |

---

## 12. Variáveis de Ambiente

```env
# .env.local (Next.js)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=

# Supabase Secrets (via supabase secrets set)
ANTHROPIC_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 13. Pacotes NPM

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^4.0.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "bpmn-js": "^18.1.1",
    "zustand": "^5.0.0",
    "next-themes": "^0.3.0",
    "react-hook-form": "^7.0.0",
    "zod": "^3.23.0",
    "@stripe/stripe-js": "^4.0.0",
    "stripe": "^16.0.0",
    "shadcn-ui": "latest"
  }
}
```

---

## 14. Limitações Conhecidas

1. **Pools e Lanes** não suportados pela lib `bpmn-auto-layout`
2. **A IA não enxerga edições manuais** — sempre trabalha com o XML que ela gerou. Mitigação: exportar XML atual e re-injetar no próximo prompt via `currentXml`
3. **Vision** disponível apenas para modelos com suporte a imagem (Claude Sonnet tem suporte nativo)
4. **bpmn-js não funciona via CDN** em ambientes com CSP restritivo (unpkg e jsdelivr bloqueados). Usar exclusivamente via `npm install` + importação dinâmica no Next.js

---

## 15. Roadmap v1 → v2

### v1.0 (MVP)
- [ ] Auth (email + Google)
- [ ] Dashboard com CRUD de diagramas
- [ ] Editor split-panel (chat + canvas bpmn-js)
- [ ] Integração Claude via Edge Function
- [ ] Exportação .bpmn e PNG
- [ ] Tema light/dark com persistência (localStorage via next-themes)
- [ ] Plano Free com limite de 5/mês
- [ ] Deploy Vercel + Supabase

### v1.5
- [ ] Stripe (planos Pro e Business)
- [ ] Vision — upload de imagem → BPMN
- [ ] Templates prontos de processos RH/DP
- [ ] Compartilhamento de diagrama via link público

### v2.0
- [ ] API pública (Business plan)
- [ ] Integração N8N (webhook → gerar BPMN automaticamente)
- [ ] Pools e Lanes
- [ ] Colaboração em tempo real
- [ ] Versioning de diagramas

---

## 16. Instruções para o Claude Code

Ao usar este PRD no Claude Code, instruir:

```
Usando o PRD acima como especificação completa, gere o projeto FlowMind.

Prioridades de implementação:
1. Setup Next.js 15 com App Router + Supabase + Tailwind + next-themes
2. Auth completo (login, signup, middleware de proteção de rotas)
3. Componente BpmnCanvas (seção 5) — importação dinâmica obrigatória
4. Hook useTheme + ThemeToggle (seção 6)
5. Edge Function generate-bpmn (seção 7)
6. Dashboard com CRUD de diagramas
7. Editor split-panel funcional
8. Landing page com toggle de tema

Observações críticas — não negociáveis:
- bpmn-js: NUNCA import estático. Sempre import() dinâmico dentro de useEffect
- NUNCA expor ANTHROPIC_API_KEY no frontend
- RLS ativo em todas as tabelas Supabase
- BpmnCanvas usa useImperativeHandle + forwardRef obrigatoriamente
- ThemeProvider no layout raiz com attribute="class" e storageKey="flowmind-theme"
- tailwind.config.ts com darkMode: 'class'
- Tokens CSS definidos em globals.css para :root (dark) e :root.light / [data-theme='light']
- Usar 'use client' apenas onde necessário
```

---

*Documento gerado em Junho 2026 · FlowMind v1.2*
