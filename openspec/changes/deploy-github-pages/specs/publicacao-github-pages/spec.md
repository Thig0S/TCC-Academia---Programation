# publicacao-github-pages Specification

## Purpose

Definir a publicação estática da aplicação demonstrativa no GitHub Pages após commits na branch principal.

## ADDED Requirements

### Requirement: Publicação automática após commit na branch principal

O sistema SHALL iniciar um workflow de build e deploy quando houver `push` na branch `main`, sem iniciar deploy automático por commits em outras branches ou pull requests.

#### Scenario: Commit integrado na main

- **WHEN** um commit é enviado à branch `main`
- **THEN** o workflow instala dependências de forma reproduzível, compila a aplicação de produção e publica o artefato no GitHub Pages

#### Scenario: Commit em outra branch

- **WHEN** um commit é enviado a uma branch diferente de `main`
- **THEN** nenhum deploy automático é iniciado

### Requirement: Artefato estático acessível sob URL de projeto

A publicação SHALL servir a aplicação e seus recursos usando o subcaminho do repositório no GitHub Pages.

#### Scenario: Carregamento da página publicada

- **WHEN** uma pessoa abre a URL de projeto publicada
- **THEN** a aplicação carrega sem falha de caminho em seus recursos estáticos

#### Scenario: Acesso direto a rota da SPA

- **WHEN** uma pessoa abre diretamente uma rota válida da aplicação publicada
- **THEN** o fallback configurado entrega a aplicação para que o roteador Angular resolva a rota

### Requirement: Permissões e publicação restritas

O workflow SHALL usar o mecanismo oficial do GitHub Pages, permissões mínimas necessárias e concorrência que evite publicações obsoletas simultâneas.

#### Scenario: Configuração de hospedagem

- **WHEN** o workflow estiver pronto para publicar
- **THEN** o repositório usa GitHub Actions como fonte do GitHub Pages e o artefato compilado como conteúdo publicado
