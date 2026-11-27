# Proposal

## Why

A fase 004 entregou casos de uso persistidos, mas a API ainda expõe somente health e
não permite consumi-los por HTTP. Um contrato local verificável é o próximo passo
para integrar o Angular e depois o desktop, sem duplicar regras financeiras.

## What Changes

- Planejar e posteriormente expor cinco comandos e cinco consultas existentes por
  HTTP versionado, preservando revisão, referência civil, atomicidade e falhas tipadas.
- Acrescentar consulta consolidada de Visão Geral: indicadores e três resumos limitados,
  derivados de um único snapshot, pelas regras já vigentes.
- Definir JSON com centavos inteiros, revisão decimal textual, datas ISO, IDs opacos
  em query/body, enums explícitos e Problem Details seguro.
- Exigir segredo técnico no grupo comercial, sem contas/JWT/cookies, mantendo loopback,
  health textual público e CORS desabilitado.
- **BREAKING** para o host técnico: API passa a exigir destino absoluto com pai existente
  e segredo; compõe Infraestrutura e prepara explicitamente o banco antes de servir.
  Não existe mais a garantia de iniciar o host sem configuração/banco ou sem EF/SQLite.
- Preservar Angular demonstrativo e independente. Não integrar UI, Tauri, sidecar,
  instalador, dados reais, seed, importação, backup operacional ou novo schema.

## Capabilities

### New Capabilities

- `api-local-vendas`: contrato HTTP local das operações de vendas, sua inicialização,
  proteção técnica, representação externa e tratamento seguro de falhas.

### Modified Capabilities

- `casos-de-uso-vendas`: adicionar consulta consolidada de Visão Geral e revisar somente
  o isolamento do host técnico para permitir API com composição SQLite; preservar
  preparação explícita, regras internas e independência da demonstração.

As regras de `visao-geral` são reutilizadas sem alteração; não há delta visual.

## Impact

Base documental: `docs/prd/vendas-em-aberto.md`, fase 005/FON-045/046/RF-031–036/
CA-061–068; `docs/tdd/tdd.md`, DEC-041/API-01–05. Escopo e escolhas materiais
confirmados no Harness; contrato detalhado proposto para revisão.

No futuro apply: `backend/src/VendasEmAberto.Api/` (composição, configuração,
contratos, autenticação, erros e endpoints), referência Api → Infraestrutura e lockfile;
`backend/src/VendasEmAberto.Aplicacao/` (query/DTOs de Visão Geral); testes unitários
e de integração HTTP/SQLite e `backend/README.md`. Sem dependência de produção nova
além da composição dos projetos existentes; conservar baseline/licenças.

Estado: **somente planejamento autorizado**, feature
`feature/fase-005-contrato-e-api-local`. Não há implementação ou testes de aplicação
desta fase executados. Revisar artefatos antes de novo pedido de apply; não arquivar
nem abrir PR enquanto o escopo executável/verificações estiverem pendentes. Um único
PR após apply integral, evidências e archive; merge exige autorização explícita.
