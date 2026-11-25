# Backend — Vendas em Aberto

## Baseline e segurança

O backend tem como alvo `.NET 10` (`net10.0`). Baseline planejada em 25/11/2026:

- SDK `10.0.404`, `rollForward=latestPatch`, `allowPrerelease=false`.
- Runtime .NET e ASP.NET Core `10.0.15`.
- `MSTest.Sdk` `4.5.3` e `Microsoft.AspNetCore.Mvc.Testing` `10.0.15`.

O host de desenvolvimento observado originalmente tinha SDK `10.0.103` e runtime
ASP.NET Core `10.0.3`; esses componentes locais não serão usados para esta baseline.
Para viabilizar a Change sem alterar a instalação global, o SDK `10.0.404` foi
instalado isoladamente em `%LOCALAPPDATA%\Temp\opencode\dotnet-10.0.404`. A
instalação informou runtime .NET e ASP.NET Core `10.0.15`. Esta cópia temporária é
específica deste ambiente e não é requisito de distribuição; desenvolvedores devem
instalar o SDK exigido a partir dos canais oficiais.

A página oficial de downloads do .NET 10 consultada em 25/11/2026 identifica
`10.0.15` como patch de segurança, publicado em 10/11/2026, e SDK `10.0.404`; a
política oficial indica suporte ao .NET 10 até 14/11/2028. Advisories ASP.NET Core
publicados em 10/11/2026 incluem versões até `10.0.14` como afetadas e `10.0.15`
como corrigida. As versões exatas dos pacotes acima estão publicadas no NuGet; isso
não substitui a auditoria do grafo transitivo a executar durante o restore.

Referências consultadas em 25/11/2026:

- <https://dotnet.microsoft.com/download/dotnet/10.0>
- <https://dotnet.microsoft.com/platform/support/policy/dotnet-core>
- Advisories Microsoft ASP.NET Core publicados em 10/11/2026; consultar os avisos
  aplicáveis novamente ao atualizar a baseline.
- <https://www.nuget.org/packages/MSTest.Sdk/4.5.3>
- <https://www.nuget.org/packages/Microsoft.AspNetCore.Mvc.Testing/10.0.15>

## Estado de verificação

O SDK isolado respondeu `dotnet --info` como versão `10.0.404`, com runtimes
`Microsoft.NETCore.App 10.0.15` e `Microsoft.AspNetCore.App 10.0.15` (Windows x64).
Ainda não foi comprovada a seleção por `backend/global.json`, nem foram executados
restore, build ou testes. Os comandos e resultados reais serão acrescentados após
a criação da solução e das configurações locais.
