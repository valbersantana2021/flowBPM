# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:
`specs/001-auth-email-google/plan.md`
<!-- SPECKIT END -->

---

## Project

**FlowMind** — SaaS B2B para criar diagramas BPMN 2.0 via linguagem natural (português brasileiro).  
PRD completo em `.llm/PRD_FlowMind.md` — leia-o antes de implementar qualquer feature.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| Estado | Zustand 5, React Hook Form + Zod |
| Tema | next-themes (`attribute="class"`, `storageKey="flowmind-theme"`) |
| BPMN | bpmn-js 18.x — **importação sempre dinâmica** |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions em Deno) |
| IA | Claude Sonnet via Anthropic API (`claude-sonnet-4-20250514`) |
| Pagamento | Stripe (Subscriptions + Webhooks) |
| Deploy | Vercel (frontend) + Supabase (backend) |

---

## Comandos

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Edge Functions (Supabase CLI)
supabase functions serve generate-bpmn --env-file .env.local
supabase functions deploy generate-bpmn

# Setar secrets na Edge Function
supabase secrets set ANTHROPIC_API_KEY=sk-...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
```

---

## Regras Críticas (não-negociáveis)

### bpmn-js
- **NUNCA** importar estaticamente no topo do arquivo.
- **SEMPRE** usar `import()` dinâmico dentro de `useEffect`.
- Razão: o módulo usa APIs de browser no top-level e quebra o build do Next.js.

```ts
// CORRETO
useEffect(() => {
  import('bpmn-js/lib/Modeler').then(({ default: BpmnModeler }) => { ... })
}, [])

// ERRADO — nunca fazer isso
import BpmnModeler from 'bpmn-js/lib/Modeler'
```

### Segurança
- **NUNCA** expor `ANTHROPIC_API_KEY` no frontend. Toda chamada à API Anthropic passa pela Edge Function.
- RLS ativo em **todas** as tabelas Supabase.

### BpmnCanvas
- Usa `forwardRef` + `useImperativeHandle` obrigatoriamente (ref expõe `importXML`, `exportXML`, `exportSVG`, `zoom`).

### Tema
- `ThemeProvider` no `app/layout.tsx` raiz com `attribute="class"` e `storageKey="flowmind-theme"`.
- `tailwind.config.ts` com `darkMode: 'class'`.
- Tokens CSS em `globals.css`: `:root` para dark (padrão), `:root.light, [data-theme='light']` para light.
- Hook `useTheme` em `hooks/useTheme.ts` — não usar `useTheme` do next-themes diretamente nos componentes.

---

## Arquitetura

### Fluxo principal do Editor

```
ChatInput → useChat.sendMessage()
  → Supabase Edge Function (generate-bpmn)
    → Valida auth + checa limite de plano
    → Chama Claude API (contexto: history[-10] + currentXml)
    → Retorna { xml, message }
  → Store atualiza mensagens
  → "Aplicar ao diagrama" → BpmnCanvasRef.importXML(xml)
  → Salva XML em diagrams.bpmn_xml
  → Gera thumbnail: BpmnCanvasRef.exportSVG() → Supabase Storage
```

### Rotas (App Router)

| Rota | Auth | Descrição |
|------|------|-----------|
| `/` | Público | Landing page |
| `/(auth)/login` e `/signup` | Público | Autenticação |
| `/(app)/dashboard` | Privado | Grid de diagramas + uso do plano |
| `/(app)/editor/[id]` | Privado | Split-panel chat + canvas |
| `/(app)/settings` | Privado | Perfil, plano, zona de perigo |
| `/api/webhooks/stripe` | Público validado | Eventos Stripe |

### Banco de dados (Supabase)

Tabelas: `profiles`, `diagrams`, `conversations`, `usage_logs`, `subscriptions`.  
Função RPC: `check_plan_limit(user_id)` — Free: 5/mês, Pro: 50/mês, Business: ilimitado.

### Supabase clients

- `lib/supabase/client.ts` — cliente browser (componentes `'use client'`)
- `lib/supabase/server.ts` — cliente server (Server Components, route handlers, middleware)

---

## Variáveis de Ambiente

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRO_PRICE_ID=
NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID=
```

Secrets da Edge Function são configurados via `supabase secrets set` (não vão para `.env.local`).

---

## Limitações Conhecidas

- **Pools e Lanes** não suportados.
- **IA não enxerga edições manuais** no canvas — sempre re-injetar `currentXml` no próximo prompt.
- **Vision** (imagem → BPMN) disponível apenas nos planos Pro e Business.
- **bpmn-js não funciona via CDN** em ambientes com CSP restritivo — usar exclusivamente via npm.
