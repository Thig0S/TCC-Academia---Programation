# Proposal

## Why

`Venda.Reconstruir` pode aceitar entrada cuja alocação difere do valor recebido e
da parcela-base; o agregado aceito depois falha em `Projetar`. Corrigir essa lacuna
antes dos futuros casos de uso preserva a garantia de sucesso com estado válido.

## What Changes

- Exigir, na reconstrução da entrada, igualdade exata em centavos entre alocação,
  recebimento e valor-base da parcela 1, sem ajustar dados silenciosamente.
- Rejeitar divergências menores e maiores com falha tipada antes de criar a raiz,
  preservando os dados de entrada e os contratos válidos.
- Acrescentar regressões MSTest negativas e positivas, incluindo reconstrução,
  projeção e aceitação do conjunto, e atualizar catálogo e evidências no apply.
- Reutilizar `docs/prd/vendas-em-aberto.md`, RF-023/CA-046–048, e
  `docs/tdd/tdd.md`, DEC-037 (reconstrução validada, reconciliação e imutabilidade).
  Não há requisito de produto ou arquitetura novo que exija editar esses documentos;
  o delta apenas explicita a invariante já exigida para a entrada.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `dominio-vendas`: explicitar no requisito existente “Entrada como primeira parcela
  paga” a igualdade financeira também na reconstrução, com rejeição imediata de
  alocação divergente e preservação da reconciliação dos históricos válidos.

## Impact

No apply: mudança localizada em
`backend/src/VendasEmAberto.Dominio/Vendas/Venda.Reconstrucao.cs`, testes em
`backend/tests/VendasEmAberto.UnitTests/Dominio/Vendas/VendaReconstrucaoTests.cs`,
`backend/tests/VendasEmAberto.UnitTests/Dominio/catalogo-paridade.md` e
`backend/README.md`. Sem novas dependências, assinaturas públicas, endpoints ou
alteração dos dados financeiros válidos; apenas históricos inconsistentes deixam
de ser aceitos indevidamente.

Fora do escopo: fase 003/handlers, persistência, importação ou reparo de dados reais,
otimização de projeções, frontend, revisão documental geral e sync/archive de outras
Changes. O delta da fase 002 ainda não está consolidado na spec principal; este
planejamento usa um requisito já existente nela e não duplica o delta pendente.

Autorização de implementação concedida pelo pedido explícito
`opsx-apply corrigir-reconstrucao-entrada` na branch
`feature/corrigir-reconstrucao-entrada`. O apply e as verificações desta Change foram
concluídos, conforme `tasks.md`; a conclusão autoriza o fluxo de PR único descrito
nas instruções do repositório, mas não autoriza merge. Merge depende de autorização
explícita.
