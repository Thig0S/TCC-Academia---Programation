# Proposal

## Why

O domínio e o SQLite já existem, mas consumidores ainda precisam coordenar manualmente
carga, operação, validação e gravação. Consolidar casos de uso internos prepara a
evolução local sem duplicar regras financeiras nem conectar prematuramente API e Angular.

## What Changes

- Implementar, após apply próprio, cinco Commands: cadastro, edição de cliente,
  status administrativo, baixa individual e correção individual.
- Implementar Queries de detalhe, coleções completas, resumo, período e relatório
  mensal, sem busca, ordenação parametrizável ou paginação.
- Adotar handlers explícitos por Vertical Slice, MediatR 12.5.0 Apache-2.0 e
  FluentResults 4.0.0 MIT, com gate de compatibilidade/licenças/segurança antes da adoção.
- Receber referência civil por operação e revisão esperada nos Commands; gerar novos
  IDs na aplicação por abstração; devolver DTOs próprios com revisão e dados imutáveis.
- Coordenar snapshot completo e gravação única, sem retry; status/cliente sem mudança
  não gravam, mas revisão obsoleta continua falhando.
- Compor destino SQLite por caminho absoluto, sem I/O no registro e com preparação
  explícita separada; preservar cancelamento, falhas tipadas e confirmação indeterminada.
- Registrar requisitos em PRD/RF-027–030/CA-054–060 e desenho em TDD/DEC-040.

## Capabilities

### New Capabilities

- `casos-de-uso-vendas`: coordenação interna de operações e consultas de vendas sobre
  domínio e armazenamento, com revisão, identidade, respostas próprias e falhas seguras.

### Modified Capabilities

Nenhuma. `dominio-vendas`, `recebimentos-parcelas` e `relatorios-financeiros` continuam
fontes das regras existentes; este recorte acrescenta sua coordenação persistida, não
muda contratos demonstrativos/UI. `persistencia-vendas`, ainda na Change 003, é
consumida sem alterar schema/contrato; não sincronizar/arquivar outras Changes aqui.

## Impact

- Futuro código em `backend/src/VendasEmAberto.Aplicacao/`, composição/gerador na
  Infraestrutura, respectivos projetos/lockfiles e testes MSTest unitários/integração.
- API continua sem referência a Infraestrutura/EF/SQLite, sem registro dos casos de uso,
  sem abertura de banco e com `/health`/404 preservados. MediatR/FluentResults podem
  transitar via Aplicacao, sem serem ativados no host técnico.
- Sem endpoints, mapper HTTP, Angular, importação, dados reais, seed, autenticação,
  Tauri/IPC, backup operacional, instalador ou CI.
- Rastreabilidade: PRD/FON-043/044 → RF-027–030/CA-054–060 → TDD/DEC-040 → esta Change.
  Arquivos de planejamento são a única entrega autorizada agora; não houve implementação.
- Branch `feature/fase-004-aplicacao`; sem PR ou archive por planejamento pronto.
  Após apply integral/verificações, archive desta Change e PR único conforme AGENTS.md;
  merge depende de autorização explícita.
