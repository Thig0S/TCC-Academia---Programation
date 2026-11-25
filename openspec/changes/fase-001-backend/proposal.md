# Proposal

## Why

A demonstração Angular já possui fluxos e regras locais, mas não existe base C#
versionada para iniciar a evolução do backend. Preparar uma API técnica independente
e verificável reduz o risco de misturar infraestrutura, migração real e regras
financeiras na primeira entrega.

## What Changes

- Planejar e, somente em apply autorizado, criar a solução .NET 10 em `backend/`,
  com API, aplicação, domínio e infraestrutura e dependências direcionadas.
- Fixar ambiente e dependências, prever restore/build/formatação reproduzíveis e
  documentação dos comandos de desenvolvimento sem dependência de IDE.
- Adotar **MSTest** para testes unitários e de integração do backend, por decisão
  explícita do solicitante; preservar Vitest/Playwright do frontend.
- Documentar o padrão futuro de Aplicacao: **MediatR + CQRS + Vertical Slice
  Architecture**, com requisição e handler próprios por caso de uso e organização
  por funcionalidade, preservando os projetos de camadas (PRD/FON-037 e
  TDD/DEC-034). Não instalar MediatR, registrar DI ou criar slices/handlers nesta
  fase; `/health` continua nativo. Versão/licenciamento antecedem a adoção efetiva
  em Change posterior.
- Documentar **FluentResults** como contrato interno futuro entre Aplicacao e API
  (PRD/FON-038, TDD/DEC-035): handlers retornam `Result`/`Result<T>`, e a API traduz
  em DTO/status de sucesso ou Problem Details (400 validação, 404 inexistência,
  409 conflito, 422 inelegibilidade; falhas inesperadas continuam 500 genérico).
  Não serializar os resultados diretamente nem instalar pacote/mapeador nesta fase.
- Disponibilizar apenas `GET /health`, sem dados de negócio, em loopback, com
  configuração validada, erro técnico genérico e encerramento controlado.
- Atualizar primeiro PRD/FON-036/RF-021/022/CA-044/045 e TDD/DEC-033. A exclusão
  histórica de backend é relaxada apenas para esta API técnica; não para operações
  financeiras ou persistência. Preservar FON-035: uma equipe, computador offline,
  sem autenticação de usuários.
- Fora do escopo: EF Core/SQLite, migrations, regras financeiras, endpoints de
  negócio, importação, dados reais, Angular integrado, Tauri, autenticação, IPC de
  produção, backup, publicação do backend e novo workflow CI.

## Capabilities

### New Capabilities

- `execucao-backend-local`: ambiente reproduzível para compilar/testar e executar
  o host C# local, seu contrato técnico de disponibilidade e os limites de rede e
  de dados da execução.

### Modified Capabilities

Nenhuma. `estado-demonstrativo` e `demonstracao-inicial` continuam descrevendo o
frontend independente, sem chamadas de dados ou persistência. A API não será ligada
à demonstração nesta fase. Não corrigir deltas pendentes de outras Changes.

## Impact

- Futuras adições concentradas em `backend/`; nenhum código de frontend ou workflow
  do Pages precisa mudar. A alteração preexistente em `.gitignore` é alheia e deve
  permanecer fora dos commits.
- API nova e independente: `GET /health`; nenhum consumidor atual precisa migrar.
- Dependências propostas: ASP.NET Core do framework .NET 10, MSTest.Sdk e
  Microsoft.AspNetCore.Mvc.Testing. Sem banco, serviço externo ou infraestrutura
  de autenticação. Internet pode ser necessária no restore, não na execução do
  host já preparado. MediatR e FluentResults são padrões documentados para
  funcionalidades futuras, não dependências a restaurar/configurar nesta fase.
- Baseline observada: SDK 10.0.103/ASP.NET Core 10.0.3 no Windows x64; compatibilidade
  dos pacotes e execução dos comandos ainda não foram comprovadas.
- Esta entrega é planejamento. Nenhum projeto foi gerado, pacote restaurado ou
  teste de aplicação executado. PR único somente após a implementação autorizada
  e todas as verificações da Change; o planejamento pronto não antecipa o PR.
