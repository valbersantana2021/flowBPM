# Implementation Plan: Autenticação com Email e Google OAuth

**Branch**: `001-auth-email-google` | **Date**: 2026-06-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-auth-email-google/spec.md`

## Summary

Implementar autenticação completa para o FlowMind com duas estratégias: email/senha
e Google OAuth. A abordagem é **frontend-first**: toda a UI e lógica de validação
são construídas e validadas com um `AuthService` mock antes de conectar ao Supabase.
Isso permite testar formulários, estados de erro, redirecionamentos e proteção de
rotas sem dependência de credenciais externas.

**Atores**: Visitante (não autenticado), Usuário (autenticado, plano free por padrão).

**Resultado final**: 4 user stories entregues (Cadastro, Login, Google OAuth, Logout)
com proteção de rotas via middleware, perfil auto-criado via trigger SQL e sessões
de 30 dias.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 15 (App Router), React 19

**Primary Dependencies**:
- `@supabase/supabase-js` v2 + `@supabase/ssr` — auth + session management
- `react-hook-form` + `@hookform/resolvers/zod` + `zod` — validação de formulários
- `next-themes` — já configurado (ThemeProvider no root layout)
- `shadcn/ui` + `tailwindcss` v4 — componentes de UI e estilos
- `NEXT_PUBLIC_AUTH_MODE=mock` — flag para ativar implementação mock

**Storage**: Supabase PostgreSQL — `auth.users` (gerenciado pelo Supabase) + `public.profiles` (migration necessária)

**Testing**: Validação manual via quickstart.md (Fase 1 mock + Fase 2 Supabase real)

**Target Platform**: Web browser moderno, deploy em Vercel

**Project Type**: Web application (SaaS) — Next.js App Router

**Performance Goals**: Cadastro < 2 min (SC-001), Login < 30s (SC-002), Google OAuth < 3 cliques (SC-003)

**Constraints**:
- Princípio III: RLS obrigatório em `public.profiles`
- Princípio IV: `'use client'` apenas em formulários; middleware e Server Components usam `supabase/server.ts`
- `ANTHROPIC_API_KEY` não envolvida nesta feature

**Scale/Scope**: MVP — usuário único tipo (free), sem MFA, sem verificação de e-mail

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Evidência |
|-----------|--------|-----------|
| I. IA Exclusivamente no Backend | ✅ N/A | Nenhuma chamada Claude nesta feature |
| II. bpmn-js Sempre Dinâmico | ✅ N/A | bpmn-js não envolvido |
| III. Isolamento de Dados via RLS | ✅ PASS | Migration em data-model.md inclui RLS + policy para profiles |
| IV. Fronteira Cliente–Servidor | ✅ PASS | Formulários = client components; middleware + server actions = server client |
| V. Limites de Plano no Servidor | ✅ PASS | profiles.plan = 'free' via trigger SQL; não requer check de cota |

**Re-check pós-design**: ✅ Todos os princípios mantidos após Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-email-google/
├── plan.md              # Este arquivo
├── research.md          # Decisões de arquitetura
├── data-model.md        # Schema SQL + tipos TypeScript
├── quickstart.md        # Guia de validação (mock + real)
├── contracts/
│   ├── auth-service.md  # Interface AuthService (mock/real)
│   └── route-protection.md  # Matriz de rotas + middleware contract
└── tasks.md             # Gerado por /speckit-tasks
```

### Source Code (repository root)

```text
app/
├── (auth)/
│   ├── layout.tsx              — Layout minimalista (sem topbar)
│   ├── login/page.tsx          — Página de login
│   └── signup/page.tsx         — Página de cadastro
├── auth/
│   └── callback/route.ts       — Handler OAuth Google (PKCE)
└── (app)/
    └── dashboard/page.tsx      — Destino pós-login (já existe no PRD)

components/
└── auth/
    ├── AuthCard.tsx            — Card wrapper visual
    ├── LoginForm.tsx           — Formulário email + senha
    ├── SignupForm.tsx          — Formulário nome + email + senha
    └── GoogleAuthButton.tsx    — Botão "Entrar com Google"

lib/
└── supabase/
    ├── auth-service.ts         — Interface + implementação real
    ├── auth-mock.ts            — Implementação mock (dev)
    ├── client.ts               — Browser client (já no PRD)
    └── server.ts               — Server client (já no PRD)

hooks/
└── useAuth.ts                  — Hook que seleciona mock ou real

middleware.ts                   — Proteção de rotas (raiz do projeto)

supabase/
└── migrations/
    └── 001_profiles.sql        — Profiles table + RLS + trigger
```

**Structure Decision**: Next.js App Router com route groups. `(auth)` para páginas
públicas de autenticação sem a topbar do app. `auth/callback` é rota pública
sem parenteses (não precisa de layout especial). Implementação em dois passos:
mock (frontend-first) → real (Supabase).

## Implementation Phases

### Frontend Phase (mock auth — sem Supabase)

Objetivo: UI 100% funcional e validada antes de qualquer integração.

1. `AuthService` interface + implementação mock (`lib/supabase/auth-mock.ts`)
2. `useAuth` hook selecionando mock quando `NEXT_PUBLIC_AUTH_MODE=mock`
3. Componentes: `AuthCard`, `LoginForm`, `SignupForm`, `GoogleAuthButton`
4. Páginas: `(auth)/login/page.tsx`, `(auth)/signup/page.tsx`
5. Layout `(auth)/layout.tsx` (sem topbar, centrado)
6. `middleware.ts` com proteção de rotas (lê cookie mock)
7. Validar todos os cenários do `quickstart.md` — Fase 1

### Backend Phase (Supabase real)

Pré-requisito: Fase Frontend 100% validada.

8. Migration SQL: `supabase/migrations/001_profiles.sql`
9. Implementação real: `lib/supabase/auth-service.ts` (substitui mock)
10. Route handler OAuth: `app/auth/callback/route.ts`
11. Atualizar `useAuth` hook para usar implementação real
12. Atualizar middleware para ler sessão Supabase real
13. Validar todos os cenários do `quickstart.md` — Fase 2

## Complexity Tracking

> Nenhuma violação de princípios constitucionais identificada.
