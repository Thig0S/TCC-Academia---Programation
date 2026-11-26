# Proposal

## Why

O domínio C# já valida vendas e históricos, mas não conserva estado entre processos.
Após a correção de reconstrução da entrada (`0280d3b`), preparar persistência SQLite
isolada permite comprovar fidelidade e atomicidade sem expor dados pela API.

## What Changes

- Persistir e reidratar o conjunto completo, preservando IDs, ordem, datas civis,
  centavos, clientes por venda, status, parcelas e recebimentos/alocações.
- Introduzir inicializador interno com migrations explícitas e caminho absoluto
  informado; leitura/gravação não criam nem migram banco silenciosamente.
- Gravar com transação e revisão global esperada, sem excluir vendas omitidas,
  perder histórico ou aceitar candidatos inconsistentes.
- Testar round-trip, leitura inválida, rollback, concorrência e cancelamento em
  arquivos SQLite temporários; documentar resultados somente após execução.
- Reutilizar regras de domínio e a correção recente; não reabrir fases concluídas.

Fora do escopo: handlers/MediatR/FluentResults, endpoints, Angular, Tauri/IPC,
importação, dados reais, backup operacional, autenticação, criptografia e CI.
O apply foi autorizado em etapa posterior e limita-se às tarefas desta Change; esta
proposta não autoriza abrir PR antecipado ou mesclar sem autorização explícita.

## Capabilities

### New Capabilities

- `persistencia-vendas`: preparação controlada do armazenamento local, leitura fiel
  e gravação atômica do conjunto com proteção de revisão e histórico.

### Modified Capabilities

Nenhuma. As invariantes de `dominio-vendas` são consumidas sem modificá-las.
Não sincronizar/arquivar deltas de outras Changes para criar esta proposta.

## Impact

PRD/FON-041/RF-024–026/CA-049–052 → TDD/DEC-038 → esta Change. Implementação futura
afetará contratos de persistência em Aplicacao, EF Core/SQLite em Infraestrutura,
MSTest de integração e README/lockfiles/ferramenta local do backend. Dominio não
recebe ORM nem setters; API mantém loopback, `/health` e 404 de negócio, sem acessar
banco. Frontend/Pages permanecem exclusivamente demonstrativos e independentes.

Branch: `feature/fase-003-persistencia-sqlite`, criada da main limpa e sincronizada
com `origin/main`. Revisão recente foi por inspeção, não reexecução dos 143 testes
backend e 430 frontend registrados. SQL-01/1.1–1.3 estão concluídos; SQL-02–SQL-05
permanecem pendentes.
