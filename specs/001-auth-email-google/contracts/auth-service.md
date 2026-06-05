# Contract: AuthService Interface

**Feature**: `001-auth-email-google`
**Date**: 2026-06-05

---

## Purpose

Define a interface pública do serviço de autenticação que desacopla os
componentes React da implementação concreta (mock ou Supabase). Esta interface
é o contrato que garante que a troca mock → real não quebre nenhum componente.

---

## Interface TypeScript

```typescript
// lib/supabase/auth-service.ts

export interface AuthError {
  code:
    | 'email_in_use'       // FR-003: e-mail já cadastrado
    | 'invalid_credentials' // FR-005: e-mail ou senha incorretos
    | 'weak_password'       // FR-002: senha < 8 chars (validado client-side)
    | 'google_unavailable'  // Edge case: Google OAuth indisponível
    | 'unknown'
  message: string           // Mensagem amigável em português
}

export interface AuthResult {
  user: AuthUser | null
  error: AuthError | null
}

export interface AuthService {
  /**
   * Cadastra novo usuário com email, senha e nome.
   * Em caso de e-mail já em uso, retorna erro com code='email_in_use'.
   * Ao sucesso, cria perfil com plan='free' e inicia sessão.
   * (FR-001, FR-002, FR-003, FR-011)
   */
  signUpWithEmail(
    fullName: string,
    email: string,
    password: string
  ): Promise<AuthResult>

  /**
   * Autentica usuário existente com email e senha.
   * Em caso de credenciais inválidas, retorna erro com code='invalid_credentials'.
   * Não revela qual campo está incorreto.
   * (FR-004, FR-005)
   */
  signInWithEmail(email: string, password: string): Promise<AuthResult>

  /**
   * Inicia fluxo OAuth do Google.
   * Redireciona o browser para a tela de autorização do Google.
   * Não retorna um AuthResult — o resultado vem via /auth/callback.
   * (FR-006, FR-007, FR-008)
   */
  signInWithGoogle(): Promise<void>

  /**
   * Encerra a sessão atual do usuário.
   * Após o retorno, getSession() deve retornar null.
   * (FR-010)
   */
  signOut(): Promise<void>

  /**
   * Retorna o usuário autenticado atual, ou null se não autenticado.
   * Inclui dados do perfil (plano, avatar, nome).
   */
  getUser(): Promise<AuthUser | null>
}
```

---

## Implementação Mock (`lib/supabase/auth-mock.ts`)

Ativada quando `NEXT_PUBLIC_AUTH_MODE=mock`.

**Estado interno**: objeto `mockSession` em memória (inicialmente null).

**Comportamento**:

| Método | Comportamento mock |
|--------|-------------------|
| `signUpWithEmail('teste@mock.com', ...)` | Sempre sucesso, cria usuário mock |
| `signUpWithEmail('duplicado@mock.com', ...)` | Retorna `error.code = 'email_in_use'` |
| `signInWithEmail('ok@mock.com', 'senha123')` | Sempre sucesso |
| `signInWithEmail('ok@mock.com', 'errada')` | Retorna `error.code = 'invalid_credentials'` |
| `signInWithGoogle()` | Simula delay de 1s, então seta sessão mock e redireciona para `/dashboard` |
| `signOut()` | Limpa `mockSession`, resolve imediatamente |
| `getUser()` | Retorna usuário mock se `mockSession !== null`, caso contrário null |

---

## Implementação Real (`lib/supabase/auth-service.ts`)

Usa `@supabase/supabase-js` browser client. Mapeia erros Supabase para
`AuthError.code` padronizado.

**Mapeamento de erros Supabase → AuthError.code**:

| Supabase error | AuthError.code |
|---------------|---------------|
| `User already registered` | `email_in_use` |
| `Invalid login credentials` | `invalid_credentials` |
| `AuthApiError: ...google...` | `google_unavailable` |
| Qualquer outro | `unknown` |

---

## Regras de troca Mock → Real

1. Nenhum componente importa `auth-mock.ts` ou `auth-service.ts` diretamente.
2. O hook `useAuth` (via `hooks/useAuth.ts`) escolhe a implementação baseado em
   `process.env.NEXT_PUBLIC_AUTH_MODE`.
3. A troca é feita apenas no hook — zero mudanças nos componentes.
