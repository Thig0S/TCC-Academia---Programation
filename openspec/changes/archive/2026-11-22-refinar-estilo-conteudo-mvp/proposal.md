# Proposal

## Why

A migração para Tailwind está presente no frontend, mas o conteúdo do MVP ainda usa superfícies, hierarquia e acabamento distantes das novas demonstrações HTML. Refinar a apresentação permite aproximar os dois temas dessas referências sem importar suas funcionalidades, campos ou regras divergentes.

## What Changes

- Adotar `frontend/public/imgs/exemplos/mercadao_oculos_dashboard_light.html` e `mercadao_oculos_dashboard_dark.html` como referências visuais principais do conteúdo; os PNGs anteriores continuam complementares para composição compacta de listas, detalhe e cadastro.
- Refinar fundos, painéis, tipografia, espaçamento, bordas, cantos, sombras, campos, ações, tabelas, selos e estados nos dois temas.
- Padronizar as tabelas de vendas abertas/quitadas e parcelas com fonte de 18 px e o mesmo padding de célula, preservando a densidade aprovada.
- Aplicar às quatro tabelas de Relatórios a mesma fonte de 18 px, line-height de 20 px e padding de dados/cabeçalho compartilhados com Vendas, Quitadas e parcelas, preservando as regiões roláveis atuais e os dados completos.
- Planejar Nova venda com formulário à esquerda e prévia das parcelas à direita, alinhados ao topo a partir de `md` (768 px), e empilhados abaixo disso. Compactar prioritariamente valor/quantidade, mantendo nome/descrição mais amplos e preservando conteúdo, validações e prévia em tempo real; não redesenhar edição/recebimento.
- Refletir a revisão aprovada de consulta: sem aviso global persistente, ação “Limpar critérios” ou atalho contextual para Quitadas no cabeçalho; “Nova venda” ocupa a posição da limpeza conjunta, enquanto a lista integral é restaurada limpando o termo e selecionando “Todas”. Quitadas segue disponível na navegação lateral.
- Cobrir Visão Geral, Vendas, cadastro, detalhe, Relatórios e Configurações, além de Quitadas, edição, recebimento, prévia, erros, vazios e páginas/registro ausentes existentes.
- Preservar integralmente a barra lateral: logo, cores, navegação, perfil, dimensões e comportamento responsivo; mudanças compartilhadas não podem alterá-la por efeito indireto.
- Preservar contratos funcionais, conteúdo, campos, validações, rotas, foco e comandos existentes, exceto pela remoção acordada do aviso global/“Limpar critérios” e reposicionamento de “Nova venda” descritos nesta Change. Cadastro e detalhe continuam páginas; recebimento continua modal nativo.
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
- Reutilização PRD → TDD → SDD: PRD `docs/prd/vendas-em-aberto.md` 1.16, RF-001/003/004/010, RN-019 e CA-001/005/028/031/032; TDD `docs/tdd/tdd.md` 1.20, DEC-018/021/022/023/024/025. A atualização registra as mudanças aprovadas de consulta e apresentação, sem alterar regras financeiras ou arquitetura.
- Change independente de `troca-para-tailwind`, registrada como completa pelo CLI; não reabrir sua migração, sincronizar/arquivar Changes ou declarar aceite do MVP nesta etapa.
- As revisões 1.13/1.14/1.15 atualizam requisitos e desenho antes das alterações de tipografia/consulta. A solicitação explícita do usuário autoriza implementar este escopo na feature branch; o PR único permanece condicionado à conclusão de toda a Change e das verificações aplicáveis.
- A revisão PRD 1.16/TDD 1.20 acrescenta o planejamento do cadastro lateral. O solicitante aprovou os artefatos e autorizou o apply em 21/11/2026; a tarefa 5.4 será executada e verificada antes do PR único. Resultados anteriores não comprovam o novo layout.
