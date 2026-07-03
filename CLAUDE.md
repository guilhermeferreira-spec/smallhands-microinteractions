Use /caveman ultra for all responses in this project until told otherwise.

# Project notes

Next.js + PartyKit (Cloudflare Worker via wrangler) + Three.js + Tailwind + TypeScript.
Two routes share one PartyKit room: `/present` (broadcasts), `/` (audience, subscribes).
Slides live in `components/slides/`, registered in `components/slides/index.ts`.

## Workflow rules (standing)
- Read once per file per task; don't re-read unchanged files already seen this convo.
- No auto-verification (tsc/build/preview) after edits — plan ahead, reason through
  correctness, edit. Run verification only when explicitly asked.
- Pricey/console commands (`npm run build`, `npm install`, `npm run deploy:party`, dev
  servers) — hand off the exact command; user runs it, not Claude.
- Batch file reads when a task needs multiple.
- Deploy: `git push` = frontend only. `party/index.ts` changes need
  `npm run deploy:party` separately.
