<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0  [Initial ratification — all content is new]

Modified principles: N/A (first version)

Added sections:
- Core Principles (I–V)
- Technical Constraints
- Development Workflow
- Governance

Removed sections: N/A

Templates reviewed:
- .specify/templates/plan-template.md   ✅ no changes needed (Constitution Check section is generic-by-design)
- .specify/templates/spec-template.md   ✅ no changes needed
- .specify/templates/tasks-template.md  ✅ no changes needed

Deferred TODOs: none
-->

# FlowMind Constitution

## Core Principles

### I. IA Exclusivamente no Backend (NON-NEGOTIABLE)

All calls to the Anthropic Claude API MUST be made from Supabase Edge Functions only.
`ANTHROPIC_API_KEY` MUST never be referenced, bundled, or forwarded to the
Next.js frontend or any client-side code.

- The Edge Function `generate-bpmn` is the sole entry point for Claude.
- Frontend communicates with the Edge Function via the Supabase client using
  the user's `Authorization` JWT — never with a raw Anthropic key.
- Any new AI capability MUST follow the same pattern: Edge Function → Claude API.

### II. bpmn-js Sempre Dinâmico (NON-NEGOTIABLE)

`bpmn-js` MUST be imported exclusively via dynamic `import()` inside `useEffect`.
Static top-level imports MUST NOT be used anywhere in the codebase.

- Reason: bpmn-js uses browser-only APIs at module load time, which crashes the
  Next.js SSR build.
- `BpmnCanvas` MUST use `forwardRef` + `useImperativeHandle` and expose the
  contract: `{ importXML, exportXML, exportSVG, zoom }`.
- No CDN or `<script>` tag alternatives — always via `npm install`.

### III. Isolamento de Dados via RLS

Every Supabase table MUST have Row Level Security (RLS) enabled.
Policies MUST ensure each user can only read and write their own rows.

- No table may be created or altered to bypass RLS without an explicit security
  review documented in the PR description.
- Service-role calls (e.g., inside Edge Functions) are the only exception and
  MUST use `SUPABASE_SERVICE_ROLE_KEY` exclusively server-side.

### IV. Fronteira Cliente–Servidor

`'use client'` directives MUST only appear where browser APIs or React
interactivity (state, effects, event handlers) are genuinely required.

- Server Components are the default; add `'use client'` only when necessary.
- Supabase `server.ts` client MUST be used in Server Components, route handlers,
  and middleware. Supabase `client.ts` is for client components only.
- Data fetching in Server Components eliminates round-trip waterfalls; prefer
  server-side data passing over client-side fetching where possible.

### V. Limites de Plano Aplicados no Servidor

Usage quotas MUST be enforced server-side via the `check_plan_limit()` Supabase
RPC before any Claude API call is executed.

- Free: 5 diagrams/month · Pro: 50/month · Business: unlimited.
- The Edge Function MUST return HTTP 429 with body `{ "error": "PLAN_LIMIT_REACHED" }`
  when the quota is exceeded.
- Vision (image → BPMN) MUST be gated to Pro and Business plans server-side; the
  frontend check is UX-only and MUST NOT be the sole enforcement point.
- Usage MUST be logged to `usage_logs` after every successful Claude call.

## Technical Constraints

These constraints are fixed for the v1 lifecycle and require a constitution
amendment to change.

- **Runtime**: Next.js 15 (App Router), TypeScript strict mode, React 19.
- **Styling**: Tailwind CSS v4 with `darkMode: 'class'`.
- **Theme**: `next-themes` with `attribute="class"` and `storageKey="flowmind-theme"`;
  `ThemeProvider` in root `app/layout.tsx`; CSS tokens defined in `globals.css`
  under `:root` (dark default) and `:root.light, [data-theme='light']`.
- **State**: Zustand 5 for editor global state (`stores/editorStore.ts`).
- **Forms**: React Hook Form + Zod for all form validation — no ad-hoc validation.
- **Payments**: Stripe webhook signatures MUST be verified server-side via
  `STRIPE_WEBHOOK_SECRET` in `/api/webhooks/stripe`.
- **Unsupported**: BPMN Pools and Lanes are out of scope for v1.

## Development Workflow

- Feature branches are created via `/speckit-git-feature` before any
  implementation begins.
- Specs live under `specs/[###-feature-name]/` following the Speckit workflow
  (`/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`).
- The PRD at `.llm/PRD_FlowMind.md` is the authoritative product specification.
  When PRD and constitution conflict, the constitution takes precedence on
  technical/governance rules; the PRD takes precedence on product scope and UX.
- Commits are made after each logical task unit via `/speckit-git-commit`.
- `CLAUDE.md` MUST be updated whenever a constitution amendment changes a
  non-negotiable rule or adds/removes a technical constraint.

## Governance

This constitution supersedes all other development practices and guidance files.
Any deviation from Principles I–V requires an explicit, documented exception in
the PR description.

**Amendment procedure**:
1. Propose change in PR description with rationale and impact analysis.
2. Update this file with the new content and increment the version per semver.
3. Update `CLAUDE.md` if the change affects non-negotiable rules.
4. Re-run template consistency checks (plan, spec, tasks templates).

**Versioning policy**: MAJOR — principle removal/redefinition;
MINOR — new principle or section; PATCH — clarifications and wording.

**Compliance**: All PRs touching `app/`, `components/`, `lib/`, `hooks/`,
`stores/`, or `supabase/functions/` MUST verify compliance with Principles I–V
before merge.

**Version**: 1.0.0 | **Ratified**: 2026-06-05 | **Last Amended**: 2026-06-05
