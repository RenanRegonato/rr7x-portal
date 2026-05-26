<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:rr7x-session-protocol -->
# Protocolo de início (rr7x-portal)

Antes de editar ou propor qualquer melhoria neste projeto, levante o estado ATUAL.
NÃO confie em snapshots nem na sua memória de treino: o estado real vive no git e nas
memórias do usuário.

1. Rode e mostre ao usuário: `git status` e `git log --oneline -12`.
   Sempre parta do commit MAIS RECENTE da branch de trabalho. Se uma tarefa parecer
   reverter trabalho recente (visível nos commits), avise o usuário antes de prosseguir.
2. Consulte as memórias do projeto antes de mexer no que elas cobrem. Elas ficam em
   `/Users/renan/.claude/projects/-Users-renan-Desktop-SQUADEs/memory/` (leia o
   `MEMORY.md` desse diretório). Principais: `project_analise_pipeline_fragil`,
   `reference_rr7x_portal_deploy`, `project_invest_match_mandor`,
   `project_rr7x_portal_site_redesign`.
3. Fatos operacionais (confirme se ainda valem ao começar):
   - Produção: www.mandor.com.br (e rr7x-portal.vercel.app).
   - Deploy: SOMENTE `vercel --prod` (NÃO há git remote; `git push` não funciona).
   - Typecheck: `node_modules/.bin/tsc --noEmit` (NÃO use `npx tsc`).
   - O pipeline de análise roda 100% server-side via Inngest (não no navegador).
     Há instrumentação de diagnóstico temporária no `/step` (rede de segurança).
   - Rollback: promover um deploy anterior no painel do Vercel.

Ao concluir uma mudança relevante: escreva um commit descritivo E atualize a memória
correspondente, para que este protocolo continue refletindo o estado real na próxima vez.
<!-- END:rr7x-session-protocol -->

