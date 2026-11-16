# Proposal

## Why

A FASE-004 entregou o núcleo financeiro, mas Vendas e Quitadas ainda não permitem consultar seus dados. A FASE-005 conecta essa fonte à interface para localizar a venda correta e conferir parcelas antes das futuras mutações, conforme PRD 1.5 e TDD 1.9.

## What Changes

- Planejar listas reais de abertas e quitadas, com identificação, datas, valores, parcelas pagas/total, saldo, próximo vencimento, situação textual e acesso ao detalhe.
- Exibir em Vendas os quatro resumos globais existentes e identificar a referência civil da sessão nas consultas, sem recalcular cartões a partir da pesquisa.
- Aplicar a busca única aprovada no Harness: nome parcial sem acentos/caixa, identificação por dígitos ignorando pontuação, data completa por dia exato; mesma regra nas duas coleções, sem misturá-las e sem filtros extras.
- Acrescentar detalhe somente leitura, entrada separada, parcelas inclusive pagas, estados de ausência e retornos; preservar IDs completos e suporte a endereço direto/recarga.
- Evoluir requisitos e testes de indisponibilidade apenas em Vendas/Quitadas, preservando Visão Geral/Relatórios ainda indisponíveis, Configurações, aviso, temas e privacidade.
- Manter cadastro, edição, recebimento, gráficos e relatórios funcionais fora da fase, sem ações fictícias. Não adicionar dependências ou persistência.

## Capabilities

### New Capabilities

- `consulta-vendas`: listas separadas, cartões globais, pesquisa local, detalhe/parcelas somente leitura e estados de consulta acessíveis sobre a fonte de sessão.

### Modified Capabilities

- `navegacao-aplicacao`: disponibilizar detalhe por ID opaco, contexto de Vendas e retorno; restringir a indisponibilidade comercial às páginas ainda não entregues.

## Impact

- Requisitos: `docs/prd/vendas-em-aberto.md` 1.5, RF-001/002/003/005/008/011, RN-014/015/018/019, CA-002/003/004/005/010/014/018/019/020/023/025/026, somente responsabilidades de consulta. PEN-005/012 resolvidas para o MVP; PEN-008/010/013/014 continuam nas fases afetadas.
- Desenho: `docs/tdd/tdd.md` 1.9, FASE-005 e DEC-003/004/005/008/013/017. Consumir o serviço raiz entregue, não alterar suas regras ou o seed para facilitar testes.
- Futuro apply: páginas de listas/detalhe, busca pura, componentes efetivamente reutilizados, rota `/vendas/:id`, testes unitários/componentes/E2E e evidências em `frontend/README.md`.
- Base verificada: PR #7 mesclado, commit `1f184e3` na main; evidências anteriores de 156 testes e 26 E2E, sem reexecução neste planejamento. A Change 004 permanece ativa, com três deltas não consolidadas. Sync/arquivamento não serão feitos nesta Change; a proibição de UI naquela fase é um recorte histórico, não uma vedação permanente.
- Esta entrega cria somente planejamento na `feature/fase-005`: PRD, TDD, proposta, deltas, design e tarefas. Não implementa código; não abre PR antecipado nem inicia apply. Revisar os artefatos e solicitar novo apply para implementar; PR único apenas após todo o escopo implementado e verificado, merge somente com autorização explícita.
