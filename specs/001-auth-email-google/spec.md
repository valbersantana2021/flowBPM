# Feature Specification: Autenticação com Email e Google OAuth

**Feature Branch**: `001-auth-email-google`

**Created**: 2026-06-05

**Status**: Draft

**Input**: User description: "implementar autenticação com email e Google OAuth"

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Cadastro com Email e Senha (Priority: P1)

Um visitante sem conta acessa o FlowMind pela primeira vez e cria sua conta
informando nome completo, endereço de e-mail e uma senha. Após o cadastro,
é redirecionado para o painel principal pronto para criar seu primeiro diagrama.

**Why this priority**: Sem cadastro não há produto — é o pré-requisito absoluto
para qualquer uso do FlowMind.

**Independent Test**: Acessar `/cadastro`, preencher os campos, submeter e
verificar que o usuário chega ao painel (`/dashboard`) com sua sessão ativa.

**Acceptance Scenarios**:

1. **Given** que o visitante acessa a página de cadastro,
   **When** preenche nome, e-mail válido e senha com no mínimo 8 caracteres
   e confirma o cadastro,
   **Then** sua conta é criada, a sessão é iniciada automaticamente
   e ele é redirecionado para o painel.

2. **Given** que o visitante tenta se cadastrar com um e-mail já cadastrado,
   **When** submete o formulário,
   **Then** recebe uma mensagem de erro clara indicando que o e-mail já está em uso
   e permanece na página de cadastro.

3. **Given** que o visitante preenche uma senha com menos de 8 caracteres,
   **When** tenta submeter o formulário,
   **Then** o sistema bloqueia o envio e exibe a regra de senha antes de qualquer
   requisição ser feita.

---

### User Story 2 — Login com Email e Senha (Priority: P2)

Um usuário cadastrado retorna ao FlowMind e acessa sua conta informando e-mail
e senha. Após o login, é redirecionado para o painel com todos os seus diagramas.

**Why this priority**: Usuários existentes precisam recuperar acesso; sem isso
o produto perde retenção.

**Independent Test**: Acessar `/login`, informar credenciais de uma conta existente
e verificar redirecionamento para `/dashboard` com sessão ativa.

**Acceptance Scenarios**:

1. **Given** que o usuário acessa a página de login,
   **When** informa e-mail e senha corretos,
   **Then** a sessão é criada e ele é redirecionado para o painel.

2. **Given** que o usuário informa credenciais incorretas,
   **When** submete o formulário,
   **Then** recebe mensagem de erro genérica ("E-mail ou senha incorretos")
   sem revelar qual campo está errado.

3. **Given** que um visitante não autenticado tenta acessar uma página protegida
   (ex.: `/dashboard`),
   **When** navega para a URL diretamente,
   **Then** é redirecionado automaticamente para `/login`.

---

### User Story 3 — Autenticação com Conta Google (Priority: P3)

Um visitante ou usuário prefere não criar e memorizar uma nova senha
e autentica-se com um clique usando sua conta Google existente.
Se for o primeiro acesso, a conta é criada automaticamente.

**Why this priority**: Reduz fricção de cadastro e login, aumentando conversão;
especialmente relevante para o público-alvo (equipes corporativas com Google Workspace).

**Independent Test**: Clicar em "Entrar com Google" nas páginas de login e
cadastro; verificar que após autorização no Google o usuário chega ao painel.

**Acceptance Scenarios**:

1. **Given** que o visitante clica em "Entrar com Google",
   **When** autoriza o acesso na tela do Google,
   **Then** retorna ao FlowMind autenticado e redirecionado para o painel.

2. **Given** que é o primeiro acesso via Google,
   **When** a autenticação é concluída,
   **Then** o perfil do usuário é criado automaticamente com nome e avatar
   vindos do Google, e o plano padrão (gratuito) é atribuído.

3. **Given** que o usuário já tem conta com o mesmo e-mail (cadastrada manualmente),
   **When** tenta autenticar via Google com esse e-mail,
   **Then** a conta existente é reconhecida e o login é efetuado sem duplicar perfis.

---

### User Story 4 — Encerramento de Sessão (Priority: P4)

Um usuário autenticado deseja sair do FlowMind, especialmente em dispositivos
compartilhados. Após o logout, não consegue mais acessar páginas protegidas
sem fazer login novamente.

**Why this priority**: Necessário para privacidade e uso em ambientes compartilhados.

**Independent Test**: Clicar em "Sair" no menu do usuário e tentar acessar
`/dashboard` diretamente — deve redirecionar para `/login`.

**Acceptance Scenarios**:

1. **Given** que o usuário está autenticado e clica em "Sair",
   **When** a ação é confirmada,
   **Then** a sessão é encerrada e ele é redirecionado para a página inicial.

2. **Given** que a sessão foi encerrada,
   **When** o usuário tenta acessar qualquer rota protegida,
   **Then** é redirecionado para `/login`.

---

### Edge Cases

- O que acontece se o usuário fechar o navegador durante o fluxo OAuth do Google?
  O sistema deve descartar o estado parcial e permitir nova tentativa limpa.
- O que acontece se o serviço do Google estiver indisponível durante o OAuth?
  O botão "Entrar com Google" deve exibir erro amigável sem quebrar o fluxo de e-mail.
- O que acontece com sessões simultâneas em múltiplos dispositivos?
  As sessões coexistem; logout em um dispositivo não afeta os demais.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir que visitantes criem uma nova conta informando
  nome completo, endereço de e-mail e senha.
- **FR-002**: O sistema DEVE validar que a senha tenha no mínimo 8 caracteres antes
  de aceitar o cadastro.
- **FR-003**: O sistema DEVE impedir o cadastro com um e-mail já registrado
  e informar o usuário com mensagem clara.
- **FR-004**: O sistema DEVE autenticar usuários cadastrados mediante e-mail e senha
  corretos, iniciando uma sessão persistente.
- **FR-005**: O sistema DEVE exibir mensagem de erro genérica em caso de credenciais
  inválidas, sem revelar qual campo está incorreto.
- **FR-006**: O sistema DEVE oferecer autenticação via conta Google como alternativa
  ao cadastro/login manual.
- **FR-007**: O sistema DEVE criar automaticamente o perfil do usuário no primeiro
  acesso via Google, importando nome e avatar da conta Google.
- **FR-008**: O sistema DEVE reconhecer e unificar tentativas de login via Google
  com e-mails já cadastrados por e-mail/senha, sem duplicar contas.
- **FR-009**: O sistema DEVE redirecionar usuários não autenticados para a página
  de login ao tentar acessar qualquer rota protegida.
- **FR-010**: O sistema DEVE permitir que o usuário autenticado encerre sua sessão,
  invalidando o acesso às rotas protegidas imediatamente.
- **FR-012**: O sistema DEVE encerrar automaticamente sessões inativas ou expiradas
  após 30 dias, exigindo nova autenticação.
- **FR-011**: Todo novo usuário DEVE receber o plano gratuito por padrão no momento
  da criação da conta.

### Key Entities

- **Usuário**: Representa uma pessoa com acesso ao FlowMind. Atributos principais:
  nome completo, e-mail (único), avatar, plano de assinatura, data de cadastro.
- **Sessão**: Representa o estado de autenticação ativo de um usuário num dispositivo.
  Criada no login/cadastro, destruída no logout ou expiração (máximo 30 dias).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem completar o cadastro (do clique inicial até o painel)
  em menos de 2 minutos.
- **SC-002**: Usuários conseguem fazer login (do clique inicial até o painel)
  em menos de 30 segundos.
- **SC-003**: O fluxo de autenticação via Google é concluído em menos de 3 cliques
  a partir da página de login.
- **SC-004**: Taxa de erro de formulário visível ao usuário antes do envio ao servidor
  chega a 100% para campos obrigatórios vazios e senha fora do padrão.
- **SC-005**: Nenhuma rota protegida é acessível sem autenticação ativa
  (0 falhas de redirecionamento em testes de acesso não autorizado).
- **SC-006**: Tentativas de cadastro com e-mail duplicado resultam em mensagem
  de erro visível em 100% dos casos, sem criar conta duplicada.

## Assumptions

- Verificação de e-mail por link não é obrigatória no MVP; o usuário tem acesso
  imediato após o cadastro.
- Sessões persistem por 30 dias após o último login; após esse período o usuário
  deve autenticar novamente. Não há opção manual de "sessão temporária" no MVP.
- Recuperação de senha ("Esqueci minha senha") está fora do escopo desta feature
  e será tratada separadamente.
- O fluxo de cadastro via Google é idêntico ao de login: um único botão "Entrar
  com Google" que funciona para novos e existentes usuários.
- Não há requisito de autenticação multifator (MFA) para o MVP.
- Usuários corporativos (Google Workspace) são suportados pelo mesmo fluxo OAuth
  padrão sem configuração adicional.

## Clarifications

### Session 2026-06-05

- Q: Quanto tempo uma sessão autenticada deve durar antes de exigir novo login? → A: 30 dias (padrão SaaS B2B)
