# Contract: Proteção de Rotas

**Feature**: `001-auth-email-google`
**Date**: 2026-06-05

---

## Matriz de Rotas

| Rota | Tipo | Auth necessária | Redirect se não auth | Redirect se já auth |
|------|------|-----------------|---------------------|---------------------|
| `/` | Público | Não | — | — |
| `/login` | Público | Não | — | `/dashboard` |
| `/signup` | Público | Não | — | `/dashboard` |
| `/auth/callback` | Público | Não | — | — |
| `/dashboard` | Privado | Sim | `/login` | — |
| `/editor` | Privado | Sim | `/login` | — |
| `/editor/[id]` | Privado | Sim | `/login` | — |
| `/settings` | Privado | Sim | `/login` | — |

**Regra**: usuário autenticado que acessa `/login` ou `/signup` é redirecionado
para `/dashboard` (evita sessões duplas ou confusão).

---

## Middleware Contract

```typescript
// middleware.ts (raiz do projeto)

// Matcher: aplica middleware APENAS nas rotas relevantes
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/editor/:path*',
    '/settings/:path*',
    '/login',
    '/signup',
  ],
}

// Lógica:
// 1. Ler sessão via supabase/server.ts (cookie-based)
// 2. Se rota privada e sem sessão → redirect('/login')
// 3. Se rota pública (/login, /signup) e com sessão → redirect('/dashboard')
// 4. Caso contrário → next()
```

---

## Modo Mock

Quando `NEXT_PUBLIC_AUTH_MODE=mock`, o middleware lê um cookie de sessão mock
(`flowmind-mock-session`) em vez de consultar o Supabase. O cookie é setado pelo
`signInWithEmail` / `signUpWithEmail` mock e removido pelo `signOut` mock.

Isso garante que a proteção de rotas funcione corretamente durante a fase de
desenvolvimento frontend sem Supabase conectado.
