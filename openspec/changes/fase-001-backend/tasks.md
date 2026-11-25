# Tasks

Base: PRD/FON-036/037/038/039/RF-021/022/CA-044/045, FON-035 e TDD/DEC-033/034/035/036; contrato em
`specs/execucao-backend-local/spec.md`, decisões D1–D8 em `design.md`.
Todas as caixas estão pendentes: esta Change foi somente planejada. Iniciar apenas
após revisão dos artefatos e pedido explícito de apply. Não implementar fases de
banco, regras financeiras, migração ou Tauri para encerrar esta lista.
MediatR/CQRS/Vertical Slices é padrão documentado para futuros casos de uso; não
adicionar pacote, registro de DI, requisições ou handlers nesta fase. A versão e o
licenciamento serão resolvidos antes da Change que autorizar a adoção efetiva.
FluentResults também é padrão futuro: `Result`/`Result<T>` na aplicação e tradução
para DTO/status ou Problem Details somente na API, conforme DEC-035/D8. Não instalar
pacote, extensões ou mapper nesta fase, nem alterar o contrato de `/health`.

## 1. Solução e ambiente reproduzível

- [x] 1.1 Confirmado o SDK .NET 10.0.404 (`latestPatch`) e a disponibilidade no NuGet de MSTest.Sdk 4.5.3 e Microsoft.AspNetCore.Mvc.Testing 10.0.15; `dotnet --info` executado com a cópia isolada mostrou runtime .NET/ASP.NET Core 10.0.15. Revisados downloads/suporte oficial do .NET e advisories ASP.NET Core de 10/11/2026 que corrigem até 10.0.14 em 10.0.15. Registrar detalhes em `backend/README.md`. A seleção por `backend/global.json` será comprovada em 1.3, e a auditoria do grafo NuGet permanece para restore; baseline revisada primeiro em PRD/TDD/SDD (FON-039/DEC-036), sem trocar MSTest.
- [x] 1.2 Criada `backend/VendasEmAberto.slnx`, quatro projetos de produção e dois MSTest em `src/`/`tests/`, com grafo de referências conforme D1. Removidos templates `Class1`, `Test1` e WeatherForecast; a API está sem endpoints até a tarefa 3.1. `dotnet build VendasEmAberto.slnx` no diretório `backend/` (SDK isolado 10.0.404) passou com 0 avisos e 0 erros. Configuração final de SDK/runner e restore bloqueado fica em 1.3.
- [x] 1.3 Adicionados `global.json` (SDK 10.0.404, MSTest.Sdk 4.5.3 e Microsoft.Testing.Platform), `Directory.Build.props` (net10.0/nullable/implicit usings/lockfiles), `.editorconfig` e `.gitignore` locais. `dotnet --info` executado em `backend/` selecionou `backend/global.json`, SDK 10.0.404 e runtimes 10.0.15; `dotnet test --help` declarou Microsoft.Testing.Platform sem VSTest. Restore inicial gerou os seis lockfiles; `dotnet restore VendasEmAberto.slnx --locked-mode` e `dotnet build VendasEmAberto.slnx -c Release --no-restore` passaram, sem avisos/erros. `.gitignore` da raiz permaneceu fora do staging.
- [ ] 1.4 Documentar em `backend/README.md` pré-requisitos, camadas, versões efetivas e comandos de restore/build/format, distinguindo acesso inicial a pacotes de execução offline; registrar MediatR/CQRS/Vertical Slices (DEC-034/D7) e FluentResults (DEC-035/D8) como padrões futuros, com Command/Query e Handler por caso de uso, Result interno e tradução na API para DTO/status ou Problem Details (400/404/409/422; inesperadas 500 genérico). Conferir contra D1/D7/D8: sem instalação de pacotes/DI/mapper ou slices de exemplo, sem serialização direta do resultado e mantendo `/health` nativo. Indicar versão/licença e contratos como pré-requisitos da adoção posterior, preservar MSTest e verificar comandos como escritos e dependências sem EF/SQLite, login ou ferramentas globais. Consolidar este grupo em commit próprio após build e revisão do diff, sem declarar testes vazios como aprovados.

## 2. Configuração local e ciclo de vida do host

- [ ] 2.1 Implementar fonte `Backend:Porta` com padrão 5070, intervalo 1024–65535 e binding explícito a `127.0.0.1`; escrever testes MSTest unitários para padrão, limites e porta alternativa, além de valor não numérico e fora dos limites. Verificar execução não vazia do UnitTests e documentar a configuração no README no mesmo grupo.
- [ ] 2.2 Rejeitar configurações de URLs/endpoints concorrentes, incluindo argumentos, variáveis e `Kestrel:Endpoints`, sem depender de launch profile; adicionar MSTest para sobrescritas, garantindo que a validação falhe antes de expor listener externo. Verificar ausência de alteração permanente do ambiente do usuário e mensagem orientando a configuração suportada.
- [ ] 2.3 Cobrir startup inválido e configurar encerramento padrão do host; verificar em smoke Kestrel real o listener apenas em loopback, porta alternativa, conflito com porta ocupada e liberação após encerramento. Preservar o processo dono da porta, registrar comandos/resultados no README e criar commit da funcionalidade com seus testes e tarefas atualizados.

## 3. Disponibilidade e contrato HTTP técnico

- [ ] 3.1 Disponibilizar apenas `GET /health` com health checks do framework e configurar IntegrationTests em MSTest com WebApplicationFactory e acesso ao entry point conforme pacote fixado; executar testes para 200, `text/plain`, corpo `Healthy`, repetição sem cookies/mutação e ausência de banco, planilha ou serviços externos.
- [ ] 3.2 Adicionar testes MSTest de integração para 404 em `/vendas` e `/pagamentos`, acesso sem credenciais/redirect e ausência de CORS permissivo com origem arbitrária; verificar execução não vazia do IntegrationTests e remoção de rotas de template, OpenAPI e middleware de autenticação/HTTPS não previstos.
- [ ] 3.3 Documentar e conferir em processo real o contrato de `/health` e a distinção entre disponibilidade do processo e readiness de banco inexistente; registrar requisição/resposta e ambiente no README. Criar commit da funcionalidade com seus testes, documentação e tarefas após as verificações deste grupo.

## 4. Tratamento de falhas técnicas

- [ ] 4.1 Configurar tratamento de exceções com HTTP 500 e Problem Details genérico em Development e ambiente não Development; criar testes MSTest de integração que injetem falha apenas no host de testes e confiram status/tipo de conteúdo e ausência de stack trace, mensagem sensível e configuração no corpo.
- [ ] 4.2 Verificar que composição de erro é exclusiva dos testes, sem rota pública para provocar exceção e sem leitura de dados reais; documentar limites dos logs/respostas no README, executar as suítes MSTest aplicáveis e criar commit próprio com código, testes, documentação e tarefas deste grupo.

## 5. Verificação integrada e registro da entrega

- [ ] 5.1 Executar a sequência completa a partir de `backend/`: restore bloqueado, build Release sem restore, `dotnet test --solution VendasEmAberto.slnx -c Release --no-build` e `dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore`; comprovar descoberta não vazia nos dois projetos, registrar contagens/resultados reais e não tratar interrupção/ausência de testes como sucesso. Conferir restauração divergente em cópia isolada e resposta não zero para falha controlada de teste, sem deixar modificação nos arquivos entregues.
- [ ] 5.2 Repetir smoke real do host sem launch profile: porta padrão quando livre, alternativa válida, `/health`, listeners, rejeição de endpoint externo, conflito e encerramento; verificar execução sem serviços externos, nenhum processo residual e preservação dos processos alheios. Registrar evidências sem dados pessoais no README.
- [ ] 5.3 Em `frontend/`, executar `npm.cmd test -- --watch=false` e `npm.cmd run build`, com a API desligada; revisar diff para comprovar ausência de mudanças em Angular, seed, workflow do Pages, dados reais, banco, auth e Tauri. Registrar resultados, avisos e E2E não executado por ausência de mudança de UI; qualquer falha real impede declarar a Change concluída.
- [ ] 5.4 Executar `openspec validate fase-001-backend --strict` e `git diff --check`, conferir rastreabilidade PRD → TDD → SDD, evidências dos grupos e todos os itens autorizados concluídos; atualizar documentação/tarefas com resultados e limitações reais em commit de verificação. Confirmar que somente arquivos do escopo foram incluídos, sem abrir PR se houver tarefas incompletas ou bloqueios.

## Workflow follow-up

- Publicar a mesma feature branch e abrir um único PR para `main` somente após
  concluir todo o apply e verificações, usando `.github/pull_request_template.md`.
  Não abrir PR com apenas este planejamento e não reutilizar o PR documental #33.
- Aguardar revisão e autorização explícita para merge; não integrar diretamente
  na `main` nem apresentar implementação como aceite operacional da loja.
- Sync/archive em etapa própria, quando solicitado; preservar referências de
  PRD/TDD e conferir o estado resultante sem alterar outras Changes.
