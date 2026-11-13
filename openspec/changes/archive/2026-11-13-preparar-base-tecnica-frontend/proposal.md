# Proposal

## Why

O Mercadão dos Óculos - Vendas em Aberto possui PRD e TDD, mas não uma base frontend
executável verificável. Preparar as FASE-001 e FASE-002 permite iniciar o desenvolvimento
com instalação reprodutível e verificações mínimas, sem transformar regras abertas em código.

## What Changes

- Delimitar a preparação às dependências da base; manter pendências das fases comerciais
  e visuais explicitamente diferidas, sem declarar a FASE-001 global concluída.
- Criar futuramente uma SPA Angular 22 standalone, zoneless e estrita em `frontend/`,
  com TypeScript 6.0.x, Node.js 24 compatível, npm e lockfile.
- Exibir somente uma página técnica inicial com nome do produto e aviso de demonstração
  em pt-BR. A página não representa os módulos funcionais do MVP.
- Preparar SCSS e comprovar a compilação dos estilos Bootstrap 5.3.x, sem plugins JavaScript.
- Configurar Prettier sem lint, Vitest/TestBed/jsdom e smoke E2E Playwright/Chromium
  no Windows em 1366 × 768 e 390 × 844.
- Registrar versões efetivamente resolvidas e resultados reais na execução futura.

**Fora do escopo:** FASE-003 a FASE-008; navegação dos quatro módulos; temas e alternância;
  vendas, clientes, parcelas, formulários, pagamentos, cálculos, dados sintéticos comerciais
  e indicadores; backend, HTTP de dados, persistência, autenticação, Tauri, SSR e PWA.
  Não há remoção de comportamento existente nem mudança incompatível conhecida.

## Capabilities

### New Capabilities

- `demonstracao-inicial`: abertura da página técnica da demonstração com identidade,
  idioma e limite de uso explícitos, sem dependência de dados externos ou persistência.

### Modified Capabilities

Nenhuma. O inventário `openspec list --specs` não possui capacidades existentes.

## Impact

- **Referências reutilizadas:** `docs/prd/vendas-em-aberto.md` v1.0, RF-011 e
  RNF-001/004/008/010; `docs/tdd/tdd.md` v1.3, FASE-001/002 e
  DEC-001/002/003/008/009/013/014. O PRD não muda: não se redefine comportamento comercial.
- **Planejamento atual:** revisão pontual autorizada do TDD e artefatos desta mudança.
  Nenhum código, dependência ou configuração da aplicação é criado neste fluxo.
- **Execução futura:** manifestos, lockfile, configurações, fonte mínima, testes e instruções
  de execução em `frontend/`, respeitando pastas existentes e sem apagar caches/saídas.
- **Bloqueios:** patches/engines/peers/licenças ainda exigem verificação na criação da base
  (TDD/PEN-015). PEN-016 tem escolhas registradas em DEC-014, não configuração comprovada.
  PRD/PEN-006 e demais regras permanecem abertas para as respectivas fases;
  PRD/PEN-013 não é resolvida pelo ambiente técnico de smoke test.
- **Entrega:** branch `feature/base-tecnica-fases-001-002`; revisão e PR futuro com
  `.github/pull_request_template.md`. Não há autorização de implementação, commit,
  publicação ou merge nesta proposta.
