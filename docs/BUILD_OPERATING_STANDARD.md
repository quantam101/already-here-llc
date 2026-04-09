# Build Operating Standard

## Source of truth

- GitHub is the long-term source of truth
- Vercel is the default production runtime
- Working production behavior is preserved first, then improved

## Tool ownership

- ChatGPT + Codex = reasoning, architecture, debugging, refactors, review, security review
- Cursor = primary engineering implementation
- Lovable = fast front-end generation only
- Manus = browser automation and workflow execution only
- Replit = prototypes and lightweight experiments only

## Non-negotiable rules

1. Do not let one tool own every layer
2. Do not expose secrets in frontend code
3. Do not treat prototypes as production without governance
4. Preserve working functionality first
5. Harden weak systems

## Required repo baseline

- README.md
- ARCHITECTURE.md
- DECISIONS.md
- RUNBOOK.md
- .env.example
- docs/BUILD_OPERATING_STANDARD.md

## Required production baseline

- CI
- lint
- typecheck
- tests
- observability
- secret discipline
- governed deploy path

## Immediate execution order

1. governance docs
2. CI
3. smoke tests
4. observability
5. final commercial QA
6. proof and review engine