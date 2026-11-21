# Proposal

> Planejamento revisado, sem implementação autorizada. A presença dos artefatos no CLI não libera apply: a conciliação PRD → TDD descrita abaixo continua bloqueante.

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

- **PRD:** `docs/prd/vendas-em-aberto.md`, RF-001 a RF-012, RNF-002/003/007/009 e CA-023/027/028/029 sustentam os fluxos e contratos visuais preservados. A abrangência global e a máxima aproximação às referências foram confirmadas na exploração; precisam ser conciliadas no PRD antes de implementar.
- **TDD:** `docs/tdd/tdd.md`, DEC-006/007/008/013/018 e seção 10. DEC-013 ainda determina Bootstrap e a seção 10 proíbe Tailwind: registrar primeiro a revisão técnica que a substitui no escopo desta migração, preservando histórico e IDs, e só então reconciliar esta Change com o TDD revisado.
- Esta revisão altera somente os cinco arquivos existentes da Change. Não altera PRD/TDD nem considera resolvido o conflito com esses documentos. A sequência documental anterior não foi cumprida na criação original; este registro não a regulariza retroativamente.
- Depois da conciliação, revisar os artefatos e aguardar pedido explícito de apply. Não antecipar PR, sync, archive, avaliação global da FASE-008 ou aceite da ótica.
