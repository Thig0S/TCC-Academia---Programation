# Design

## Context

Consulte `proposal.md` e a revisão do PRD/TDD desta Change. `backend/global.json` fixa MSTest.Sdk 4.5.3 em `msbuild-sdks` e o SDK .NET 10.0.404 em `sdk`; os projetos usam `<Project Sdk="MSTest.Sdk">`. O VS Code reportou resolução a partir de uma solução temporária sob `AppData`, fora da árvore de `backend/`.

## Goals / Non-Goals

**Goals:** Resolver MSTest.Sdk mesmo quando a solução temporária da extensão estiver fora do diretório que contém o `global.json`, preservando as versões escolhidas.

**Non-Goals:** Alterar a baseline do .NET, instalar software na máquina, mudar runner, dependências NuGet, CI ou comportamento dos testes.

## Decisions

### D1 — Versão do SDK MSTest explícita nos projetos

Usar `<Project Sdk="MSTest.Sdk/4.5.3">` nos projetos de testes. A documentação oficial do MSTest admite fixar a versão tanto no atributo `Sdk` quanto em `global.json`. O atributo viaja junto com o projeto e não depende de a solução temporária estar sob `backend/`. Manter o mapeamento de `global.json`, necessário à CLI e coerente com a versão escolhida.

Alternativa: confiar somente no `global.json`; já falha quando o resolver da extensão usa a localização da solução temporária. Não atualizar versão; isso não é necessário para corrigir a descoberta.

### D2 — Fluxo de execução documentado

Manter `backend/VendasEmAberto.slnx` como solução de entrada recomendada no VS Code e documentar comandos executados a partir de `backend/`. Separar o problema do MSTest SDK do pré-requisito .NET: o `global.json` pede SDK 10.0.404 ou patch permitido na mesma feature band, enquanto a máquina inspecionada tinha 10.0.103.

## Risks / Trade-offs

- [Versões duplicadas podem divergir] → conservar o mesmo número 4.5.3 no projeto e em `global.json`, e verificar ambos.
- [O SDK .NET exigido ainda não está instalado na máquina do usuário] → registrar instalação do .NET SDK selecionado pelo `global.json` como pré-requisito separado; não reduzir a baseline fixada.
- [VS Code continua apontando para solução temporária] → recomendar abrir a solução versionada, embora o pin no projeto torne o resolver MSTest independente desse caminho.

## Migration Plan

Editar os dois projetos de teste e o README, restaurar/buildar/testar a solução a partir de `backend/`, validar os arquivos e registrar limitações. Não há migração de dados; rollback é reverter apenas estas alterações.
