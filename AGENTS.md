# AGENTS.md — juribly

## Stack & setup
- Node 20.x, pnpm preferred.
- Express server (dev: pnpm server).
- Supabase used (do not log env values).
- Tests: pnpm test; Lint: pnpm lint --fix; Types: pnpm typecheck.

## How to run locally
1) pnpm i
2) pnpm lint && pnpm typecheck
3) pnpm test
4) pnpm server  # port 3030

## Coding rules
- Full-file replacements in patches.
- Add tests for new routes/auth.
- Don’t commit .env.

## Done criteria
- Tests, lint, typecheck all clean.
