---
description: "Task list for auth-email-google feature implementation"
---

# Tasks: Autenticação com Email e Google OAuth

**Input**: Design documents from `specs/001-auth-email-google/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: Not requested — manual validation via quickstart.md scenarios.

**Organization**: Phases 1–6 = frontend completo com AuthService mock.
Phase 7 = integração Supabase. Cada user story é independentemente validável
antes de avançar.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências)
- **[Story]**: User story correspondente (US1–US4)
- Caminhos de arquivo explícitos em cada tarefa

---

## Phase 1: Setup

**Purpose**: Configuração inicial do projeto e variáveis de ambiente para o
modo frontend-first com auth mock.

- [x] T001 Criar `.env.local` com `NEXT_PUBLIC_AUTH_MODE=mock`, `NEXT_PUBLIC_SUPABASE_URL=http://placeholder` e `NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder` na raiz do projeto
- [x] T002 Verificar/adicionar ao `package.json` as dependências `@hookform/resolvers` e garantir `zod`, `react-hook-form` presentes; rodar `npm install`
- [x] T003 [P] Criar estrutura de pastas: `components/auth/`, `lib/supabase/` (se não existir), `lib/schemas/`, `app/(auth)/login/`, `app/(auth)/signup/`, `app/auth/callback/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura de auth compartilhada por todas as user stories.
Nenhuma user story pode ser implementada antes desta fase estar completa.

**⚠️ CRITICAL**: Todas as tasks desta fase devem ser concluídas antes de
iniciar qualquer fase de user story.

- [x] T004 Criar interface `AuthService`, tipos `AuthError`, `AuthResult`, `AuthUser` em `lib/supabase/auth-service.ts` conforme `contracts/auth-service.md`
- [x] T005 [P] Criar implementação mock `AuthMockService` em `lib/supabase/auth-mock.ts` — `signUpWithEmail('duplicado@mock.com')` retorna `email_in_use`; `signInWithEmail('ok@mock.com','errada')` retorna `invalid_credentials`; `signInWithGoogle()` simula delay 1s e seta cookie mock `flowmind-mock-session`
- [x] T006 Criar `hooks/useAuth.ts` exportando `useAuth()` que retorna instância de `AuthMockService` quando `NEXT_PUBLIC_AUTH_MODE=mock`, ou `AuthService` real caso contrário
- [x] T007 [P] Criar componente `AuthCard` em `components/auth/AuthCard.tsx` — wrapper visual com `var(--bg2)`, `var(--border)`, `var(--shadow-lg)`, largura máx 400px, suporte a título e subtítulo
- [x] T008 [P] Criar skeleton do componente `GoogleAuthButton` em `components/auth/GoogleAuthButton.tsx` — botão com ícone Google SVG, texto "Entrar com Google", variante `outline`, chama `useAuth().signInWithGoogle()` ao clicar; exibe estado de loading durante execução
- [x] T009 Criar `middleware.ts` na raiz do projeto com matcher para `/dashboard/:path*`, `/editor/:path*`, `/settings/:path*`, `/login`, `/signup`; em modo mock lê cookie `flowmind-mock-session`; rota privada sem sessão → redirect `/login`; `/login` ou `/signup` com sessão → redirect `/dashboard`; referência: `contracts/route-protection.md`
- [x] T010 [P] Criar layout `app/(auth)/layout.tsx` — HTML semântico sem Topbar, fundo `var(--bg)`, conteúdo centralizado vertical e horizontal, fonte DM Sans

**Checkpoint**: AuthService mock funcional + middleware operacional antes de avançar.

---

## Phase 3: User Story 1 — Cadastro com Email e Senha (Priority: P1) 🎯 MVP

**Goal**: Visitante cria conta com nome, email e senha e chega ao `/dashboard`.

**Independent Test**: Acessar `http://localhost:3000/signup`, preencher formulário e verificar chegada ao dashboard com sessão mock ativa. Ver `quickstart.md` Fase 1 — cenários SC-001, SC-004, SC-006.

### Implementation for User Story 1

- [x] T011 [P] [US1] Criar schema Zod de cadastro `signupSchema` em `lib/schemas/auth.ts` — campos: `fullName` (string, min 2), `email` (email), `password` (string, min 8, mensagem PT-BR)
- [x] T012 [US1] Criar componente `SignupForm` em `components/auth/SignupForm.tsx` — React Hook Form com `signupSchema`, campos: nome completo, email, senha; botão "Criar conta" desabilitado durante submit; exibe erro inline por campo; em submit chama `useAuth().signUpWithEmail()`; em sucesso redireciona para `/dashboard`; erro `email_in_use` exibe "Este e-mail já está cadastrado"
- [x] T013 [US1] Criar página `app/(auth)/signup/page.tsx` — renderiza `AuthCard` com título "Crie sua conta" + `SignupForm` + link "Já tem conta? Entrar" → `/login`

**Checkpoint**: Cadastro funcional com mock — validar SC-001, SC-004 e SC-006 do quickstart.md antes de prosseguir.

---

## Phase 4: User Story 2 — Login com Email e Senha (Priority: P2)

**Goal**: Usuário existente faz login e chega ao `/dashboard`. Rotas protegidas redirecionam para `/login`.

**Independent Test**: Acessar `http://localhost:3000/login`, usar `ok@mock.com` / `senha123` → dashboard. Testar credencial errada → mensagem genérica. Acessar `/dashboard` sem sessão → redirect para `/login`. Ver `quickstart.md` Fase 1 — cenários SC-002, FR-005, SC-005.

### Implementation for User Story 2

- [x] T014 [P] [US2] Adicionar schema Zod de login `loginSchema` em `lib/schemas/auth.ts` — campos: `email` (email), `password` (required, sem validação de comprimento)
- [x] T015 [US2] Criar componente `LoginForm` em `components/auth/LoginForm.tsx` — React Hook Form com `loginSchema`; botão "Entrar" com estado de loading; erro `invalid_credentials` exibe "E-mail ou senha incorretos"; em sucesso redireciona para `/dashboard`; inclui `GoogleAuthButton` separado por divisor "ou"
- [x] T016 [US2] Criar página `app/(auth)/login/page.tsx` — renderiza `AuthCard` com título "Bem-vindo de volta" + `LoginForm` + link "Não tem conta? Criar conta" → `/signup`

**Checkpoint**: Login + proteção de rotas validados (mock). Validar SC-002, FR-005, SC-005 do quickstart.md.

---

## Phase 5: User Story 3 — Autenticação com Google (Priority: P3)

**Goal**: Usuário clica "Entrar com Google" e chega ao `/dashboard` em ≤ 3 cliques.

**Independent Test**: Clicar em "Entrar com Google" nas páginas de login e cadastro; verificar que após 1s de simulação (mock) o usuário chega ao dashboard. Ver `quickstart.md` Fase 1 — cenário SC-003.

### Implementation for User Story 3

- [x] T017 [US3] Completar implementação do `GoogleAuthButton` em `components/auth/GoogleAuthButton.tsx` — verificar que já está incluído em `LoginForm` (T015); adicionar também à página de signup em `app/(auth)/signup/page.tsx` com divisor "ou" acima do botão

**Checkpoint**: Fluxo Google mock validado em login E signup. Validar SC-003.

---

## Phase 6: User Story 4 — Encerramento de Sessão (Priority: P4)

**Goal**: Usuário autenticado clica "Sair", sessão é encerrada e rotas protegidas ficam bloqueadas.

**Independent Test**: Estando autenticado (mock), clicar em "Sair" → redirect para `/`. Tentar acessar `/dashboard` → redirect para `/login`. Ver `quickstart.md` Fase 1 — cenário FR-010.

### Implementation for User Story 4

- [x] T018 [US4] Adicionar botão "Sair" ao componente `components/layout/Topbar.tsx` — visível apenas quando usuário está autenticado (via `useAuth().getUser()`); ao clicar chama `useAuth().signOut()`, limpa cookie mock `flowmind-mock-session` e redireciona para `/`

**Checkpoint**: ✅ FRONTEND COMPLETO — Todos os 4 user stories funcionais com mock auth. Executar TODOS os cenários da Fase 1 do `quickstart.md` antes de avançar para Phase 7.

---

## Phase 7: Supabase Integration — Backend Real

**Purpose**: Substituir AuthService mock por implementação real com Supabase.
**Pré-requisito**: Todas as Fases 1–6 validadas com mock auth.

- [ ] T019 Aplicar migration SQL em `supabase/migrations/001_profiles.sql` com o conteúdo de `data-model.md` (tabela profiles + RLS policy + trigger `on_auth_user_created` + trigger `profiles_updated_at`)
- [ ] T020 [P] Atualizar `.env.local` com valores reais: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; remover `NEXT_PUBLIC_AUTH_MODE=mock`
- [ ] T021 [P] Configurar provedor Google OAuth no Supabase Dashboard (Authentication → Providers → Google) com Client ID e Client Secret; adicionar URL de callback `http://localhost:3000/auth/callback` nos Authorized redirect URIs do Google Console
- [ ] T022 [P] Configurar JWT expiry para 2592000 segundos (30 dias) no Supabase Dashboard (Authentication → Settings → JWT expiry) — FR-012
- [ ] T023 Criar `app/auth/callback/route.ts` — route handler GET que extrai `code` da query string e chama `supabase.auth.exchangeCodeForSession(code)`; redireciona para `/dashboard` em sucesso ou `/login?error=auth_callback_failed` em falha
- [ ] T024 Implementar `AuthRealService` em `lib/supabase/auth-service.ts` usando `lib/supabase/client.ts`; mapear erros Supabase para `AuthError.code` conforme tabela em `contracts/auth-service.md`; `signInWithGoogle()` chama `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '/auth/callback' } })`
- [ ] T025 Atualizar `hooks/useAuth.ts` para usar `AuthRealService` (remover lógica de mock ou manter como fallback quando `NEXT_PUBLIC_AUTH_MODE=mock` — para compatibilidade com desenvolvimento futuro)
- [ ] T026 Atualizar `middleware.ts` para ler sessão Supabase real via `lib/supabase/server.ts` em vez do cookie mock; manter o matcher existente; usar `supabase.auth.getUser()` para verificar autenticação

**Checkpoint**: Validar TODOS os cenários da Fase 2 do `quickstart.md` com Supabase real antes de finalizar.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Verificar que todas as páginas de auth (`/login`, `/signup`) usam corretamente os tokens CSS do tema (`var(--bg)`, `var(--text)`, `var(--accent)`, etc.) e aplicam transição suave ao trocar tema
- [ ] T028 [P] Adicionar `aria-label`, `aria-invalid` e `role="alert"` nos estados de erro dos formulários em `LoginForm.tsx` e `SignupForm.tsx`
- [ ] T029 [P] Criar/atualizar `.env.example` na raiz com todas as variáveis necessárias para auth: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_AUTH_MODE` (opcional)
- [ ] T030 Verificar comportamento de hidratação SSR: testar que `AuthCard`, `LoginForm` e `SignupForm` não causam mismatch de hidratação com `next-themes` (usar `suppressHydrationWarning` onde necessário)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — iniciar imediatamente
- **Foundational (Phase 2)**: Depende da Phase 1 — **bloqueia todas as user stories**
- **US1 (Phase 3)**: Depende da Phase 2 — MVP mínimo entregável
- **US2 (Phase 4)**: Depende da Phase 2 — pode rodar em paralelo com US1 se houver capacidade
- **US3 (Phase 5)**: Depende de Phase 2 + `GoogleAuthButton` já em `LoginForm` (T015)
- **US4 (Phase 6)**: Depende da Phase 2 — independente de US1/US2/US3
- **Supabase (Phase 7)**: Depende de TODAS as Fases 1–6 estarem validadas
- **Polish (Phase 8)**: Depende da Phase 7

### User Story Dependencies

- **US1 (P1)**: Pode iniciar após Phase 2 — nenhuma dependência de outras stories
- **US2 (P2)**: Pode iniciar após Phase 2 — independente de US1
- **US3 (P3)**: Pode iniciar após Phase 2 — requer que `LoginForm` (T015) esteja criado para incluir o botão
- **US4 (P4)**: Pode iniciar após Phase 2 — independente de US1/US2/US3

### Within Each User Story

- Schemas Zod antes de formulários
- Formulários antes de páginas
- Páginas antes de validação manual
- Story completa antes de avançar para próxima

### Parallel Opportunities

- T002, T003 podem rodar em paralelo na Phase 1
- T005, T007, T008, T010 em paralelo na Phase 2 (após T004)
- T011 em paralelo com T012 prep (schema antes do componente)
- T014 em paralelo com T015 prep
- T019, T020, T021, T022 em paralelo na Phase 7 (após validação frontend)
- T027, T028, T029 em paralelo na Phase 8

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Após T004 (interface criada), lançar em paralelo:
Task T005: "Criar lib/supabase/auth-mock.ts"
Task T007: "Criar components/auth/AuthCard.tsx"
Task T008: "Criar components/auth/GoogleAuthButton.tsx"
Task T010: "Criar app/(auth)/layout.tsx"

# T006 depende de T004 + T005 → sequencial
# T009 depende de T006 → sequencial após T006
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (T004–T010)
3. Phase 3: US1 — Cadastro (T011–T013)
4. **STOP e VALIDATE**: SC-001, SC-004, SC-006 do quickstart.md
5. Usuário já consegue criar conta e chegar ao dashboard

### Frontend-First Incremental

1. Setup + Foundational → infraestrutura mock pronta
2. US1 (Cadastro) → validar → avançar
3. US2 (Login) → validar → avançar
4. US3 (Google mock) → validar → avançar
5. US4 (Logout) → validar todos os cenários Fase 1
6. **CHECKPOINT FRONTEND**: todos os 9 cenários da Fase 1 do quickstart.md passando
7. Phase 7 (Supabase real) → validar todos os cenários Fase 2
8. Phase 8 (Polish)

---

## Notes

- `[P]` = arquivos diferentes, sem dependências, podem rodar em paralelo
- `[US?]` mapeia a tarefa para a user story correspondente no spec.md
- A variável `NEXT_PUBLIC_AUTH_MODE=mock` controla o ponto de troca mock→real; zero mudanças nos componentes
- Cada user story tem um **Checkpoint** explícito — não avançar sem validar
- Phase 7 é a única fase que requer credenciais externas (Supabase + Google Console)
