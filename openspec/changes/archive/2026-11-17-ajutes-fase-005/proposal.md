# Proposal

## Why

As consultas da FASE-005 já existem, mas cartões globais, filtros empilhados e detalhe extenso competem com vendas e parcelas na primeira tela. O PRD 1.6 e o TDD 1.10 confirmam um refinamento compacto, paginado e mais fiel às referências light/dark, sem ampliar os fluxos comerciais.

## What Changes

- Retirar de Vendas os quatro cartões Total em aberto, Valores em atraso, Recebimentos do mês e Vendas cadastradas. Reservar sua apresentação exclusivamente à Visão Geral na FASE-007, preservando projeções internas; não implementar essa página agora.
- Colocar busca única, situação, Limpar pesquisa e Limpar critérios lado a lado nas abertas. Quitadas mantém busca e limpeza, sem novo filtro.
- Paginar as duas coleções após critérios, com 10 vendas por página, números/anterior/próxima e faixa/total abaixo da tabela; voltar à página 1 ao mudar/limpar critérios e ajustar página inválida quando a coleção diminuir.
- Condensar os dados do cliente/venda lado a lado e preservar entrada, descrição e histórico. Em 1366×768/100%, nos dois temas, mostrar 10 vendas e paginação ou até 10 parcelas sem rolagem da página no cenário padrão; excedente de parcelas usa rolagem interna acessível. Telas menores, textos extensos e zoom admitem adaptação sem perda de dados.
- Refinar superfícies, tipografia, bordas, densidade, selos e links conforme `frontend/public/imgs/exemplos/`. Âncoras de menu, cliente, Visualizar e retorno/breadcrumb deixam a aparência azul/sublinhada padrão permanente, preservando foco, contraste, destinos e indicação ativa.
- Verificar, sem mudar a regra financeira, atraso no primeiro dia civil após vencer: vence em 10/11, atrasa em 11/11; parcela paga permanece Paga.
- Não copiar dados pessoais, busca global duplicada, filtros de intervalo, notificações, controles de janela ou ações não implementadas das imagens.

## Capabilities

### New Capabilities

Nenhuma. Reutilizar os limites das capacidades já consolidadas.

### Modified Capabilities

- `consulta-vendas`: substituir cartões da listagem por consulta compacta e paginada, com detalhe condensado, links acessíveis e cenários verificáveis de layout/atraso.
- `estado-demonstrativo`: retirar a obrigação de resumos visíveis em Vendas, mantendo projeções, fonte única e comandos internos sem antecipar Visão Geral.
- `temas-visuais`: permitir o refinamento das superfícies de consulta e indicação ativa sem sublinhado permanente obrigatório, preservando logo, identidade da lateral, contraste e preferência de sessão.

## Impact

- Requisitos: `docs/prd/vendas-em-aberto.md` 1.6, RF-001/002/003/005/008/009, RN-014/018/019/020, RNF-002/003/007/009 e CA-026/027/028/029. RF-009 apenas como destino futuro dos indicadores. Desenho: `docs/tdd/tdd.md` 1.10, DEC-017/018 e roadmap FASE-005/007.
- Futuro código afetado: páginas de listas/detalhe, tabela compartilhada, estilos de consulta/temas/lateral e testes de listas, integração e E2E. Sem novos pacotes, versões, persistência, rotas ou mudanças de seed/IDs/comandos.
- Base observada: `feature/ajustes-fase-005`, histórico em `03feea6`, consultas e specs principais presentes. Sem nova execução de testes, fetch ou confirmação de merge remoto. Resultados antigos não comprovam os ajustes.
- Por confirmação no Harness, esta Change recebe somente os ajustes documentados anteriormente na `fase-005`; os cinco arquivos daquela Change alterados pelo agente voltam ao conteúdo anterior. PRD/TDD/README revisados permanecem e referenciam esta Change; as 20 tarefas anteriores não se tornam tarefas desta proposta.
- Planejamento apenas. Aguardar novo apply após revisão; nenhuma implementação, commit, publicação ou PR nesta etapa. Futuro PR único da Change somente com todo o escopo e verificações concluídos; merge exige autorização explícita. Sync/archive das outras Changes fica fora do escopo.
