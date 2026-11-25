# Tasks

Base: PRD/FON-036/RF-021/022/CA-044/045, FON-035 e TDD/DEC-033; contrato em
`specs/execucao-backend-local/spec.md`, decisões D1–D6 em `design.md`.
Todas as caixas estão pendentes: esta Change foi somente planejada. Iniciar apenas
após revisão dos artefatos e pedido explícito de apply. Não implementar fases de
banco, regras financeiras, migração ou Tauri para encerrar esta lista.

## 1. Solução e ambiente reproduzível

- [ ] 1.1 Confirmar, no início do apply, SDK 10.0.103 com política latestPatch e disponibilidade/suporte das versões exatas MSTest.Sdk 4.5.3 e Microsoft.AspNetCore.Mvc.Testing 10.0.3; verificar com `dotnet --info`, metadados e avisos de suporte/segurança, registrando no README. Se exigir troca de baseline, revisar PRD/TDD/SDD antes do código afetado, sem substituição silenciosa de framework de testes.
- [ ] 1.2 Criar `backend/VendasEmAberto.slnx`, os quatro projetos de produção e os dois projetos MSTest em `src/` e `tests/`, conforme D1; conferir arquivos e referências com inspeção dos projetos/solução e `dotnet build`, sem Class1, WeatherForecast, entidades ou regras financeiras.
- [ ] 1.3 Adicionar configurações locais de SDK/runner, nullable/implicit usings, formatação e exclusões em `backend/` conforme D2/D3; habilitar lockfiles, gerar a resolução e executar `dotnet restore VendasEmAberto.slnx --locked-mode` e build Release. Verificar que SDK/runner foram selecionados a partir de `backend/`, lockfiles aplicáveis estão versionados e `.gitignore` da raiz permanece fora do staging.
- [ ] 1.4 Documentar em `backend/README.md` pré-requisitos, camadas, versões efetivas e comandos de restore/build/format, distinguindo acesso inicial a pacotes de execução offline; verificar comandos como escritos e dependências sem EF/SQLite, login ou ferramentas globais. Consolidar este grupo em commit próprio após build e revisão do diff, sem declarar testes vazios como aprovados.

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
