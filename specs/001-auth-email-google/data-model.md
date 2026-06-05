# Data Model: Autenticação com Email e Google OAuth

**Feature**: `001-auth-email-google`
**Date**: 2026-06-05

---

## Entidades

### auth.users (gerenciada pelo Supabase Auth)

Tabela interna do Supabase. Não é criada nem migrada manualmente.

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid | PK, gerado pelo Supabase |
| email | text | Único, verified via OAuth |
| encrypted_password | text | Null para usuários OAuth |
| email_confirmed_at | timestamptz | Null no MVP (email não verificado) |
| last_sign_in_at | timestamptz | Atualizado a cada login |
| raw_user_meta_data | jsonb | full_name, avatar_url (vem do Google OAuth) |
| created_at | timestamptz | Auto |

### public.profiles

Tabela pública criada pelo projeto. Criada via migration SQL.

| Campo | Tipo | Nullable | Default | Notas |
|-------|------|----------|---------|-------|
| id | uuid | NOT NULL | — | PK, FK → auth.users(id) ON DELETE CASCADE |
| full_name | text | NULL | — | Nome completo do usuário |
| avatar_url | text | NULL | — | URL do avatar (Google ou null) |
| plan | text | NOT NULL | 'free' | 'free' \| 'pro' \| 'business' |
| stripe_customer_id | text | NULL | — | Preenchido quando usuário assina plano pago |
| created_at | timestamptz | NOT NULL | now() | Auto |
| updated_at | timestamptz | NOT NULL | now() | Atualizado via trigger |

---

## Relacionamentos

```
auth.users (1) ──── (1) public.profiles
```

- Um usuário tem exatamente um perfil.
- A exclusão de `auth.users` em cascata exclui `public.profiles` (ON DELETE CASCADE).

---

## Regras de Identidade e Unicidade

- `auth.users.email`: único globalmente (enforcement pelo Supabase Auth).
- `public.profiles.id`: PK, coincide exatamente com `auth.users.id`.
- Não existem dois perfis para o mesmo usuário, mesmo ao usar OAuth + email/senha
  com o mesmo endereço (FR-008 — unificação automática via Supabase Auth).

---

## Ciclo de Vida

### Criação de Conta (email/senha)

```
1. auth.users INSERT (via Supabase Auth signUp)
2. Trigger on_auth_user_created FIRES
3. public.profiles INSERT ← full_name vem de raw_user_meta_data
4. plan = 'free' por padrão
```

### Criação de Conta (Google OAuth)

```
1. auth.users INSERT (via Supabase Auth OAuth callback)
   raw_user_meta_data.full_name = Google display name
   raw_user_meta_data.avatar_url = Google photo URL
2. Trigger on_auth_user_created FIRES
3. public.profiles INSERT ← full_name + avatar_url vem de raw_user_meta_data
4. plan = 'free' por padrão
```

### Sessão

- Criada: no login/cadastro bem-sucedido
- Renovada: automaticamente pelo SDK Supabase (token refresh)
- Expirada: após 30 dias de inatividade (configuração do projeto Supabase)
- Destruída: no logout explícito

---

## Migrations SQL Necessárias

### Migration 001: profiles table

```sql
-- Cria tabela profiles
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name text,
  avatar_url text,
  plan text NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS (Princípio III da Constituição — obrigatório)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários acessam apenas seu próprio perfil"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger: auto-create profile on new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

---

## Modelo TypeScript (tipos compartilhados)

```typescript
// types/index.ts (extensão dos tipos existentes)

export interface Profile {
  id: string
  fullName: string | null
  avatarUrl: string | null
  plan: 'free' | 'pro' | 'business'
  stripeCustomerId: string | null
  createdAt: string
  updatedAt: string
}

export interface AuthUser {
  id: string
  email: string
  profile: Profile | null
}
```
