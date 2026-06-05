# Research: Autenticação com Email e Google OAuth

**Feature**: `001-auth-email-google`
**Date**: 2026-06-05

---

## Decision 1: Estratégia Frontend-First com Auth Mock

**Decision**: Implementar uma camada de abstração `AuthService` com interface
compartilhada entre implementação mock e real. O mock é ativado via variável de
ambiente `NEXT_PUBLIC_AUTH_MODE=mock`.

**Rationale**: Permite validar toda a UI/UX (formulários, validações, estados de
erro, redirecionamentos) sem depender do Supabase estar configurado. Reduz fricção
durante desenvolvimento e facilita testes visuais isolados.

**Alternatives considered**:
- *Nenhuma abstração*: acopla UI diretamente ao SDK Supabase desde o início —
  impossível testar frontend sem credenciais reais.
- *MSW (Mock Service Worker)*: intercepta requisições HTTP — mais complexo e
  adiciona dependência apenas para desenvolvimento.

---

## Decision 2: Supabase Auth + @supabase/ssr para Sessão

**Decision**: Usar `@supabase/supabase-js` v2 com `@supabase/ssr` para gerenciar
sessões via cookies httpOnly em Next.js App Router. Dois clientes separados:
`lib/supabase/client.ts` (browser) e `lib/supabase/server.ts` (Server Components
+ middleware).

**Rationale**: `@supabase/ssr` é a solução oficial do Supabase para Next.js App
Router — lida com refresh automático de tokens, cookies SSR-safe e evita
conflitos de hidratação. Alinha com Princípio IV da Constituição.

**Alternatives considered**:
- *Supabase JS puro sem SSR*: não funciona corretamente em Server Components
  (cookies não são acessíveis no cliente).
- *NextAuth.js*: solução genérica mais pesada; adiciona complexidade desnecessária
  quando Supabase Auth já oferece tudo que precisamos.

---

## Decision 3: Proteção de Rotas via Middleware Next.js

**Decision**: `middleware.ts` na raiz do projeto lê a sessão Supabase via
`lib/supabase/server.ts` e redireciona para `/login` se não autenticado.
Rotas protegidas: `/dashboard`, `/editor/*`, `/settings`.

**Rationale**: Middleware executa no Edge Runtime antes do render — proteção
eficaz sem flash de conteúdo protegido. Evita verificações duplicadas em cada
page component.

**Alternatives considered**:
- *Verificação em cada layout/page*: duplicação de lógica, possível flash de
  conteúdo antes do redirect.
- *Client-side redirect via useEffect*: não é proteção real; conteúdo é
  renderizado antes do redirect.

---

## Decision 4: Callback OAuth em /auth/callback

**Decision**: Route handler em `app/auth/callback/route.ts` processa o código
de autorização retornado pelo Google e troca pelo token de sessão via
`supabase.auth.exchangeCodeForSession()`.

**Rationale**: Padrão PKCE obrigatório no Supabase Auth v2 para segurança OAuth.
O callback é uma rota pública (sem proteção de middleware).

**Alternatives considered**:
- *Implicit flow*: depreciado por razões de segurança; não suportado pelo
  Supabase v2.

---

## Decision 5: Auto-criação de Perfil via Trigger SQL

**Decision**: Trigger `on_auth_user_created` no Supabase (já definido no PRD)
cria automaticamente um registro em `public.profiles` ao inserir em `auth.users`.
O trigger é responsável por: `full_name`, `avatar_url`, `plan = 'free'`.

**Rationale**: Garante consistência mesmo em cenários edge (OAuth, admin API).
Alternativa de criar perfil no frontend seria frágil a erros de rede.

**Alternatives considered**:
- *Criar perfil no callback do frontend*: falha silenciosa se a requisição não
  chegar; cria inconsistência entre auth.users e profiles.

---

## Decision 6: Validação de Formulário com React Hook Form + Zod

**Decision**: Schemas Zod para login e signup; integrados com React Hook Form via
`@hookform/resolvers/zod`. Validação ocorre client-side antes de qualquer
requisição ao servidor.

**Rationale**: Alinha com stack definida na Constituição (Seção "Technical
Constraints"). Garante 100% da SC-004 (erros visíveis antes do envio ao servidor).

**Schema signup**:
- `fullName`: string, min 2 chars, required
- `email`: email válido, required
- `password`: min 8 chars, required

**Schema login**:
- `email`: email válido, required
- `password`: required (sem validação de comprimento — não revelar regras)

---

## Decision 7: Estrutura de Arquivos

```text
app/
├── (auth)/
│   ├── layout.tsx              — Layout minimalista para páginas de auth
│   ├── login/page.tsx
│   └── signup/page.tsx
├── auth/
│   └── callback/route.ts       — Handler OAuth (público, sem middleware)
└── middleware.ts               — Proteção de rotas

components/
└── auth/
    ├── AuthCard.tsx            — Wrapper visual para formulários de auth
    ├── LoginForm.tsx           — Formulário email + senha
    ├── SignupForm.tsx          — Formulário nome + email + senha
    └── GoogleAuthButton.tsx    — Botão "Entrar com Google"

lib/
└── supabase/
    ├── auth-service.ts         — Interface AuthService + implementação real
    ├── auth-mock.ts            — Implementação mock (dev/test)
    ├── client.ts               — Browser client
    └── server.ts               — Server client

hooks/
└── useAuth.ts                  — Hook React que expõe AuthService

middleware.ts                   — Proteção de rotas (raiz do projeto)
```
