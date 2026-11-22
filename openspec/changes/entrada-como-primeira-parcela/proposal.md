# Proposal

## Why

A entrada hoje é contabilizada fora das parcelas, contrariando a nova interpretação solicitada de “10x” como dez parcelas no total, inclusive a entrada. A checkbox também presume ausência de entrada sem exigir uma decisão explícita, dificultando a conferência do cadastro.

## What Changes

- **BREAKING**: quantidade informada inclui a entrada como parcela 1 Paga, na data da venda, com forma obrigatória; o saldo é dividido entre N−1 futuras. Sem entrada, manter N futuras.
- Permitir entrada diferente das demais, preservando seu valor e distribuindo centavos somente entre as futuras; exigir N≥2 com entrada e entrada positiva menor que o total. Cadastro já quitado continua excluído.
- Trocar checkbox por select “Possui Entrada”, acima de data/valor total/quantidade, com “Selecione uma opção”, “Sim” e “Não”. Só Sim/Não são válidos; envio sem escolha revela erro associado, sem criar venda ou prévia válida.
- Preservar rascunho de valor/forma ao escolher Não, mas ocultá-lo e ignorá-lo no envio/cálculo; voltar a Sim restaura e revalida.
- Mostrar situação textual na prévia, identificando a primeira parcela como Entrada/Paga, sem efetivar recebimentos até a confirmação.
- Representar entrada por um recebimento integral alocado à parcela 1; o metadado não é uma segunda origem de valores. Ajustar contagens, detalhe, seleção de recebimento, períodos, indicadores e Relatórios sem dupla contagem.
- Uniformizar as 12 vendas do seed e fixtures: acrescentar entrada paga, preservar valores financeiros, histórico e vencimentos pendentes, ajustar numeração e vínculos. Sem migração de persistência ou sessão antiga.

## Capabilities

### New Capabilities

Nenhuma; reutilizar as fronteiras existentes.

### Modified Capabilities

- `dominio-vendas`: quantidade total, limites, centavos, calendário, entrada como parcela e invariantes de contabilização.
- `formularios-vendas`: seleção obrigatória, posição/erro, rascunho triestado e prévia com situação fiel.
- `consulta-vendas`: contagem incluindo entrada e detalhe com a primeira parcela paga, mantendo densidade e histórico completo.
- `recebimentos-parcelas`: explicitar entrada já liquidada na seleção e quitação reconciliada incluindo-a.
- `estado-demonstrativo`: seed uniforme e válido, sem alterar valores financeiros/datas pendentes ou duplicar recebimentos.
- `relatorios-financeiros`: entrada originada no recebimento da parcela 1, identificada uma vez, sem somar metadado ou alocações novamente.

## Impact

- Rastreabilidade: PRD `docs/prd/vendas-em-aberto.md` 1.17, FON-015, RF-002/004/005/007/008/009/010/011, RN-007/011/012/013/015/017/024, CA-008/033/034/035; TDD `docs/tdd/tdd.md` 1.21, DEC-026, FASE-010 a FASE-013.
- Áreas de implementação futura: modelos/preparação/cálculos de vendas e parcelas, rascunhos/cadastro, detalhe/consultas/recebimento, cálculos de Relatórios, seed, fixture e testes pertinentes; evidências futuras em `frontend/README.md`. Sem novas dependências, backend, persistência ou mudança de edição restrita ao cliente.
- Base: main atualizada com PR #20 mesclado; preservar cadastro lateral, temas, tipografia e consulta vigentes. A Change visual ainda contém deltas não sincronizadas; seus contratos de entrada separada são superados por esta nova decisão, sem editar/arquivar/sincronizar a Change anterior nesta solicitação.
- Esta entrega é somente PRD → TDD → SDD para revisão. Não autoriza implementação, não comprova novos testes de aplicação e não abre PR antecipado; toda a Change deve ser entregue em um PR único após apply e verificações autorizados.
