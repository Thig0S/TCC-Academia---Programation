# Proposal

## Why

`ConsultarPeriodo.Vendas` inclui Inativas e Prejuízo, contrariando o universo operacional já definido no PRD/TDD; o teste atual perpetua essa divergência. Antes dos handlers internos, também é necessário completar a sequência de verificação HIS-007 e eliminar colisões de identificadores documentais, sem confundir evidências anteriores com novas execuções.

## What Changes

- Restringir `ConsultarPeriodo.Vendas` às vendas Ativas, abertas ou quitadas, pela data civil da venda no intervalo inclusivo, preservando a ordem. Decisão confirmada pelo solicitante no Harness nesta proposta.
- Preservar `Recebidos` de todos os status pela data efetiva, inclusive entrada/lote uma única vez; não filtrar a coleção-fonte dos recebimentos.
- **BREAKING (contrato interno):** consumidores que usavam a consulta por período para listar Inativas/Prejuízo deixarão de recebê-las nesse campo. Sem mudança de assinatura, HTTP ou schema SQLite.
- Completar HIS-007 com rejeição de entrada inconsistente seguida de reconstrução válida no mesmo teste, preservando as verificações financeiras existentes e o estado anterior.
- Desambiguar somente as referências da correção MSTest: manter `DEC-038`, `CA-049` e `FON-041` da persistência; planejar `DEC-039`, `CA-053` e `FON-042` para MSTest, com nota de correspondência histórica.
- Atualizar catálogo, README e documentos pertinentes no apply, com resultados reais e sem reescrever retrospectivamente as evidências das Changes concluídas.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `dominio-vendas`: explicitar o universo de `ConsultarPeriodo.Vendas` no requisito existente de resumos globais e períodos civis; acrescentar cenário de reconstrução válida após rejeição, sem criar capability de manutenção documental.

## Impact

Produção futura limitada a `backend/src/VendasEmAberto.Dominio/Vendas/ConjuntoVendas.Consultas.cs`; testes em `ConjuntoVendasConsultasTests.cs` e `VendaReconstrucaoTests.cs`. Documentação: `backend/tests/VendasEmAberto.UnitTests/Dominio/catalogo-paridade.md`, `backend/README.md`, `docs/prd/vendas-em-aberto.md` e `docs/tdd/tdd.md`; referências explícitas da Change MSTest somente se afetadas pelo remapeamento. Preservar IDs e artefatos da persistência.

Reutilização PRD → TDD: RF-023/CA-046–048, RF-013/016, RN-025/026 e CA-038 sustentam as regras; DEC-037, especialmente projeções e verificação, já define períodos operacionais somente de Ativas. A correção documental preserva o conteúdo das decisões existentes. Não se exige novo PRD/TDD vazio nem nova arquitetura; este planejamento registra a decisão e o remapeamento, cujas edições serão tarefas do apply.

Fora do escopo: handlers/MediatR/FluentResults, composição SQLite, endpoints, Angular, migrations, instalação de SDK, validação manual do VS Code, renumeração de fases, dados reais e sync/archive de outras Changes. Esta solicitação autoriza somente os artefatos de planejamento, não código, testes executados, PR antecipado ou merge.
