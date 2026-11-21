# Proposal

> Planejamento revisado após conciliação documental PRD 1.11 → TDD 1.15. Esta atualização não comprova implementação nem aprovação da ótica; os critérios e tarefas técnicas permanecem sujeitos à revisão antes de prosseguir.

## Why

A aplicação usa Bootstrap como base visual, enquanto as referências aprovadas para a demonstração definem uma linguagem própria de superfícies, densidade, identidade vermelha e temas claro/escuro. A substituição por Tailwind é uma oportunidade de aproximar todas as telas dessas referências sem alterar os fluxos e regras de negócio já entregues.

## What Changes

- Substituir integralmente Bootstrap por Tailwind CSS em toda a aplicação, incluindo dependências, estilos globais, templates, componentes e testes acoplados à implementação Bootstrap.
- Refinar todas as telas e componentes nos temas claro e escuro para máxima aproximação visual às referências existentes, mantendo adaptação responsiva e acessibilidade.
- Definir tokens e padrões visuais compartilhados para superfícies, tipografia, espaçamento, bordas, foco, estados e identidade cromática; aplicar linguagem coerente também às telas sem referência específica.
- Preservar navegação, funcionalidades, conteúdo, regras de domínio, contratos de dados e estados existentes. Não copiar dados pessoais, controles fictícios ou capacidades que aparecem apenas nas imagens.
- Preservar os requisitos de densidade e rolagem já estabelecidos para listas e detalhes no desktop de referência, além dos critérios para telas estreitas e zoom.
- Migrar progressivamente, verificando cada entrega antes de retirar a base visual anterior; a entrega final não poderá depender de Bootstrap.

## Capabilities

### New Capabilities

Nenhuma. A mudança não introduz capacidades de produto; estabelece requisitos visuais e atualiza a implementação de capacidades existentes.

### Modified Capabilities

- `temas-visuais`: atualizar o contrato de consistência visual para incluir a linguagem visual das referências em toda a aplicação, sem limitar-se à barra lateral e consultas.
- `consulta-vendas`: atualizar os critérios de fidelidade visual das listas e detalhes, preservando contratos funcionais e densidade existentes.

## Impact

- Frontend Angular em `frontend/`: configuração do Angular CLI e PostCSS, dependências e lockfile, estilos globais e dos componentes, templates e testes de componentes/E2E.
- Remoção da dependência e dos acoplamentos visuais de Bootstrap, inclusive classes, tokens `--bs-*`, atributo `data-bs-theme` e expectativas de teste correspondentes; preservar a semântica dos temas claro/escuro sem dependência de Bootstrap.
- A entrada atual de estilos é SCSS e importa Bootstrap via Sass. A abordagem proposta é Tailwind v4 com pipeline CSS/PostCSS, sem processar Tailwind por Sass; confirmar compatibilidade com os builders Angular existentes durante a implementação.
- Sem mudanças em APIs de domínio, persistência, rotas ou dependências de bibliotecas de componentes visuais.

## Rastreabilidade e pré-requisitos

- **PRD:** `docs/prd/vendas-em-aberto.md` 1.11; RF-001 a RF-012, RNF-002/003/007/009 e CA-023/027/028/029 sustentam os fluxos e contratos visuais preservados. O §10 explicita a linguagem das referências em todos os módulos e estados existentes; o PRD não impõe framework.
- **TDD:** `docs/tdd/tdd.md` 1.15; DEC-006/007/008/009/021 e seção 10. DEC-021 substitui a escolha técnica de base visual da DEC-013 por Tailwind CSS v4/PostCSS, preservando a decisão histórica e condicionando migração ampla à prova local dos dois builds.
- A conciliação documental foi registrada antes da implementação. Esta revisão atualiza os artefatos da Change para rastrear PRD/TDD vigentes; não comprova compatibilidade, execução técnica ou aceite da ótica.
- Revisar os artefatos atualizados antes de prosseguir com apply. Não antecipar PR, sync, archive, avaliação global da FASE-008 ou aceite da ótica.
