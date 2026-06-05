# Quickstart: Validação da Feature de Autenticação

**Feature**: `001-auth-email-google`
**Date**: 2026-06-05

---

## Pré-requisitos

- Node.js 18+ instalado
- Repositório clonado e branch `001-auth-email-google` ativa
- `npm install` executado

---

## Fase 1: Validação Frontend (Mock Auth)

### Setup

```bash
# Criar .env.local com auth em modo mock
echo "NEXT_PUBLIC_AUTH_MODE=mock" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_URL=http://placeholder" >> .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder" >> .env.local

npm run dev
```

### Cenários de validação (executar manualmente no browser)

**SC-001 — Cadastro em menos de 2 minutos**

1. Abrir `http://localhost:3000/signup`
2. Preencher: Nome "João Silva", email `ok@mock.com`, senha `senha123`
3. Clicar em "Criar conta"
4. ✅ Esperado: redireciona para `/dashboard` em < 2s

**SC-004 — Erros de formulário antes do envio**

1. Abrir `http://localhost:3000/signup`
2. Clicar em "Criar conta" sem preencher nada
3. ✅ Esperado: erros visíveis em todos os campos obrigatórios (sem requisição ao servidor)
4. Preencher senha `abc` (< 8 chars)
5. ✅ Esperado: erro "A senha deve ter no mínimo 8 caracteres" sem enviar

**SC-006 — E-mail duplicado**

1. Abrir `http://localhost:3000/signup`
2. Preencher email `duplicado@mock.com` com senha válida
3. ✅ Esperado: mensagem de erro "Este e-mail já está cadastrado"

**SC-002 — Login em menos de 30 segundos**

1. Abrir `http://localhost:3000/login`
2. Preencher email `ok@mock.com`, senha `senha123`
3. ✅ Esperado: redireciona para `/dashboard`

**FR-005 — Erro genérico no login**

1. Abrir `http://localhost:3000/login`
2. Preencher email `ok@mock.com`, senha `errada`
3. ✅ Esperado: "E-mail ou senha incorretos" (sem revelar qual campo)

**SC-003 — Google OAuth em 3 cliques**

1. Abrir `http://localhost:3000/login`
2. Clicar em "Entrar com Google" (1 clique)
3. ✅ Esperado (mock): loader → redireciona para `/dashboard` em ~1s

**SC-005 — Proteção de rotas**

1. Abrir `http://localhost:3000/dashboard` (sem sessão ativa / após logout)
2. ✅ Esperado: redireciona para `/login`

**FR-010 — Logout**

1. Estando autenticado, clicar em "Sair" no menu
2. ✅ Esperado: redireciona para `/` (página inicial)
3. Tentar acessar `http://localhost:3000/dashboard`
4. ✅ Esperado: redireciona para `/login`

**Redirecionamento de usuário já autenticado**

1. Estando autenticado, acessar `http://localhost:3000/login`
2. ✅ Esperado: redireciona automaticamente para `/dashboard`

---

## Fase 2: Validação com Supabase Real

### Setup adicional

```bash
# Atualizar .env.local com credenciais reais
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
# Remover ou deixar vazio: NEXT_PUBLIC_AUTH_MODE
```

### Migrations (executar uma única vez)

```bash
# Aplicar migration da tabela profiles
supabase db push
# ou via Supabase Dashboard: SQL Editor → colar conteúdo de data-model.md
```

### Cenários adicionais (requerem Supabase)

**FR-007 — Perfil auto-criado via Google**

1. Fazer login com Google OAuth pela primeira vez
2. No Supabase Dashboard → Table Editor → profiles
3. ✅ Esperado: registro criado com full_name e avatar_url do Google, plan='free'

**FR-008 — Unificação de contas**

1. Criar conta com email `teste@gmail.com` e senha
2. Fazer login com Google usando a mesma conta `teste@gmail.com`
3. ✅ Esperado: login efetuado, sem duplicar registro em profiles

**FR-012 — Expiração de sessão**

*Não testável manualmente no dia-a-dia; verificar configuração de JWT expiry
no Supabase Dashboard → Authentication → Settings → JWT expiry: 2592000 (30 dias).*

---

## Referências

- Interface do serviço: `contracts/auth-service.md`
- Matriz de rotas protegidas: `contracts/route-protection.md`
- Modelo de dados e migrations: `data-model.md`
