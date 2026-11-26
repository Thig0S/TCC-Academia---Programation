# Proposal

## Why

O VS Code pode restaurar o projeto por uma solução temporária fora de `backend/`, sem encontrar o mapeamento `MSTest.Sdk` no `global.json` local. Isso impede a descoberta/restauração dos testes antes mesmo da execução e produz `NU1503` como consequência.

## What Changes

- Fixar a versão já adotada do `MSTest.Sdk` no atributo `Project Sdk` dos dois projetos de testes, tornando a resolução independente do diretório da solução temporária.
- Documentar como abrir a solução versionada e executar restore/testes, além do pré-requisito do SDK .NET definido pelo `global.json`.
- Manter `backend/global.json` e as versões de dependências existentes.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

Nenhuma. A mudança corrige configuração de build/documentação sem alterar comportamento do sistema; `.openspec.yaml` marca `skip_specs: true`.

## Impact

Afeta os dois `.csproj` de testes, `backend/README.md` e referências de planejamento em `docs/prd/vendas-em-aberto.md` e `docs/tdd/tdd.md`. Sem novas dependências ou alteração de API.
