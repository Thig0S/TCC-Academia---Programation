# Design

## Context

A aplicação é Angular SPA em `frontend/`, com build de produção pelo Angular CLI. O Pages precisa servir a saída compilada sob o subcaminho do repositório, não a raiz do domínio. PRD/TDD existentes foram revisados antes deste SDD e estabelecem publicação somente após push em `main`.

## Goals / Non-Goals

**Goals:** build reproduzível por lockfile; workflow de menor privilégio; publicação oficial via GitHub Pages Actions; suporte ao subcaminho e fallback de rota direta; configurar Pages para Actions.

**Non-Goals:** preview por PR/branch, alterar regra de negócio ou persistência, backend, infraestrutura externa e domínio customizado.

## Decisions

1. Workflow em `.github/workflows/`, evento `push` filtrado para `main`, com `workflow_dispatch` apenas se não ampliar gatilhos automáticos. Checkout e Node.js 24; rodar `npm ci` e build no diretório `frontend/`.
2. Determinar e validar o `base-href` do projeto usando o nome real do repositório (`TCC-Academia---Programation`). Examinar a saída do Angular antes de selecionar o diretório a publicar.
3. Publicar pelo par oficial `actions/upload-pages-artifact` / `actions/deploy-pages`, com permissões `contents: read`, `pages: write` e `id-token: write`, ambiente `github-pages` e concorrência para evitar deploy concorrente obsoleto.
4. Preservar as rotas da SPA no Pages. Se necessário, gerar `404.html` a partir do index no artefato; comprovar que acesso direto a rota retorna a aplicação e que assets usam o subcaminho correto. Recursos locais copiados de `public/`, inclusive a logo, devem usar URL relativa ao `<base href>`; caminhos absolutos a partir da raiz do domínio falham em Pages de projeto.
5. Configurar o repositório para Pages source `GitHub Actions` após o workflow estar pronto. A ação remota requer acesso autorizado; registrar resultado observado.

## Risks / Trade-offs

- `base-href` incorreto quebra assets sob URL de projeto → verificar build/artefato no subcaminho e URL real após deploy.
- Rotas Angular podem retornar 404 ao acesso direto → fallback compatível e teste de rota publicada.
- Mudanças no repositório remoto podem estar bloqueadas → reportar bloqueio sem alegar configuração/deploy concluído.
- A publicação por push à `main` só é testável após merge; não publicar a feature branch como substituto.

## Verification

- Validar sintaxe/estrutura do workflow e conferir gatilho/permissões.
- Build de produção com o base path real; conferir index, assets e fallback dentro do artefato.
- Após merge, verificar execução Actions, estado da configuração Pages, URL publicada, carregamento e acesso direto a rota.
- Registrar resultados reais e verificações não executadas em `frontend/README.md`.

## Migration Plan

1. Implementar workflow/configuração de build e fallback necessários na feature branch.
2. Executar verificações locais; corrigir e documentar resultados.
3. Configurar Pages para Actions e validar acesso/autorização.
4. Concluir tarefas e abrir um único PR para `main`; deploy automático será confirmado após integração. Merge exige autorização explícita.
