# Proposal

## Why

A migração para Tailwind está presente no frontend, mas o conteúdo do MVP ainda usa superfícies, hierarquia e acabamento distantes das novas demonstrações HTML. Refinar a apresentação permite aproximar os dois temas dessas referências sem importar suas funcionalidades, campos ou regras divergentes.

## What Changes

- Adotar `frontend/public/imgs/exemplos/mercadao_oculos_dashboard_light.html` e `mercadao_oculos_dashboard_dark.html` como referências visuais principais do conteúdo; os PNGs anteriores continuam complementares para composição compacta de listas, detalhe e cadastro.
- Refinar fundos, painéis, tipografia, espaçamento, bordas, cantos, sombras, campos, ações, tabelas, selos e estados nos dois temas.
- Cobrir Visão Geral, Vendas, cadastro, detalhe, Relatórios e Configurações, além de Quitadas, edição, recebimento, prévia, erros, vazios e páginas/registro ausentes existentes.
- Preservar integralmente a barra lateral: logo, cores, navegação, perfil, dimensões e comportamento responsivo; mudanças compartilhadas não podem alterá-la por efeito indireto.
- Preservar contratos funcionais, conteúdo, campos, rótulos, validações, rotas, foco e comandos existentes. Cadastro e detalhe continuam páginas; recebimento continua modal nativo.
- Manter dez vendas por página e a densidade desktop de listas/detalhe, sem ocultar informação ou reduzir artificialmente fontes para copiar as medidas dos HTMLs.
- Produzir evidências comparativas por superfície; testes funcionais verdes não substituem revisão visual.

## Capabilities

### New Capabilities

Nenhuma. Não há funcionalidade nova.

### Modified Capabilities

- `temas-visuais`: explicitar as novas referências principais para o conteúdo, cobertura visual por seção e preservação da lateral e dos contratos funcionais.
- `consulta-vendas`: atualizar a referência de acabamento das consultas, mantendo ações identificáveis, busca local, paginação, histórico completo e densidade.

## Impact

- Implementação futura restrita à apresentação em `frontend/src/styles.css`, templates/CSS de páginas e componentes compartilhados, com testes pertinentes e evidências em `frontend/README.md`.
- Reutilizar Tailwind/PostCSS instalados, tokens semânticos, serviço de tema, SVGs locais e `dialog` existentes; sem nova dependência, CDN, fonte remota, biblioteca visual ou alteração de domínio/estado.
- Não copiar JavaScript, dados, exportação CSV, busca global, notificações, ajuda, oito registros por página, primeiro vencimento editável, limite de 120 parcelas ou regras de recebimento dos exemplos. Não replicar os quatro indicadores em Vendas/Relatórios.
- Referências HTML atualmente locais e não rastreadas: preservá-las sem edição ou inclusão silenciosa no commit. Antes do apply, confirmar sua disponibilidade na branch/ambiente executor; ausência bloqueia comparação visual, sem recriar exemplos por suposição.
- Reutilização PRD → TDD → SDD: PRD `docs/prd/vendas-em-aberto.md` 1.11, §10, RF-001 a RF-012, RNF-002/003/007/009 e CA-023/027/028/029; TDD `docs/tdd/tdd.md` 1.15, §10, DEC-006/007/008/018/020/021. As novas referências refinam a linguagem já requerida, sem alterar requisitos funcionais ou arquitetura; não é necessário revisar esses documentos nesta proposta.
- Change independente de `troca-para-tailwind`, registrada como completa pelo CLI; não reabrir sua migração, sincronizar/arquivar Changes ou declarar aceite do MVP nesta etapa.
- Este pedido autoriza somente planejamento. Revisar os artefatos antes de solicitar apply; nenhum código foi implementado ou teste de aplicação executado por esta proposta. O PR único permanece para a conclusão integral da implementação autorizada, não para o planejamento isolado.
