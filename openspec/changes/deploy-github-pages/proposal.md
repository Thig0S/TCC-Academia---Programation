# Proposal

## Why

A SPA demonstrativa ainda não está publicada para avaliação. Publicar o build no GitHub Pages após commits integrados à `main` torna a versão disponível sem deploy manual.

## What Changes

- Adicionar workflow GitHub Actions de build e deploy de produção, acionado por `push` em `main`.
- Ajustar o artefato para URL de projeto e navegação direta nas rotas.
- Configurar GitHub Pages para usar GitHub Actions.

Fora do escopo: deploy de branches/PRs, backend, domínio próprio, secrets adicionais e alterações de produto não necessárias à publicação.

## Capabilities

### New Capabilities

- `publicacao-github-pages`: build estático e publicação automatizada da SPA.

### Modified Capabilities

Nenhuma.

## Impact

- Referências: PRD, seção “Publicação demonstrativa no GitHub Pages”; TDD, seção “Deploy automatizado no GitHub Pages”.
- Arquivos previstos: `.github/workflows/deploy-pages.yml` e configuração de build/artefato em `frontend/`, conforme validação local.
- Configuração remota de Pages para source `GitHub Actions`.
- A proposta ainda não autoriza execução; revisar os artefatos antes do apply.
