# Spec Delta

## Purpose

Permitir preparar, verificar e executar o backend local de forma reproduzível,
com disponibilidade técnica observável e sem antecipar operações de negócio,
persistência ou integração com a interface demonstrativa.

## ADDED Requirements

### Requirement: Preparação reproduzível do backend

O ambiente SHALL documentar versões e comandos para restaurar, compilar, testar,
verificar formatação e iniciar o backend sem IDE. Dependências SHALL ter versões
fixadas e restauração bloqueada. Configuração do backend SHALL permanecer isolada
do frontend. Preparação inicial SHALL distinguir necessidade de internet de
execução local já preparada.

#### Scenario: Preparar um checkout sem IDE
- **WHEN** a pessoa desenvolvedora seguir os comandos documentados com o SDK exigido
- **THEN** SHALL conseguir restaurar e compilar o backend sem banco, planilha ou frontend em execução
- **AND** as versões efetivas e os pré-requisitos SHALL ser verificáveis sem pressupor acesso offline a pacotes ainda não obtidos

#### Scenario: Detectar dependências divergentes
- **WHEN** a restauração bloqueada encontrar declarações incompatíveis com o lockfile
- **THEN** SHALL falhar com código não zero, sem atualizar silenciosamente o conjunto bloqueado

### Requirement: Verificação automatizada não vazia

O backend SHALL disponibilizar comandos documentados para executar testes unitários
e de integração sem IDE e verificar formatação sem reescrever arquivos. A verificação
SHALL distinguir testes aprovados de descoberta vazia ou execução interrompida e
SHALL sinalizar falhas por código não zero.

#### Scenario: Verificar a base técnica
- **WHEN** a pessoa executar os comandos de verificação após compilar o backend
- **THEN** SHALL obter resultados não vazios de testes unitários e de integração das configurações e do contrato técnico HTTP
- **AND** a checagem de formatação SHALL reportar conformidade ou divergência sem gravar alterações

#### Scenario: Não anunciar sucesso sem testes
- **WHEN** houver teste falhando, nenhum teste descoberto em um dos projetos ou execução interrompida
- **THEN** a verificação SHALL não ser registrada como suíte aprovada
- **AND** falha de teste SHALL resultar em código não zero

### Requirement: Execução restrita ao loopback

O host SHALL escutar somente em `127.0.0.1`, com porta padrão 5070, alterável por
configuração entre 1024 e 65535. Tentativas de configurar endpoints não loopback
SHALL ser rejeitadas antes de expor um listener externo. Arquivo de perfil de IDE
SHALL não ser a única proteção dessa restrição.

#### Scenario: Iniciar com configuração padrão ou porta alternativa
- **WHEN** o host iniciar sem sobrescritas ou com uma porta alternativa válida e livre
- **THEN** SHALL responder somente por loopback na porta padrão ou solicitada, respectivamente
- **AND** SHALL não abrir listener em todas as interfaces nem depender de certificado de desenvolvimento

#### Scenario: Rejeitar porta inválida
- **WHEN** a configuração de porta for não numérica ou estiver fora de 1024–65535
- **THEN** SHALL encerrar a inicialização com erro compreensível e código não zero
- **AND** SHALL não substituir silenciosamente a porta inválida por outra

#### Scenario: Rejeitar exposição externa por configuração
- **WHEN** arquivo, variável de ambiente ou argumento de inicialização tentar configurar endpoint não loopback
- **THEN** SHALL recusar a inicialização sem abrir listener externo
- **AND** a restrição SHALL continuar válida ao iniciar sem perfil de IDE

### Requirement: Disponibilidade técnica sem dados de negócio

`GET /health` SHALL responder HTTP 200 com conteúdo `text/plain` e corpo `Healthy`
quando o host estiver disponível. A resposta SHALL indicar somente disponibilidade
do processo, sem informações pessoais, configuração sensível ou garantia de banco,
importação ou operação financeira. A consulta SHALL não produzir mutação.

#### Scenario: Consultar disponibilidade do processo
- **WHEN** um cliente local enviar `GET /health` ao host iniciado
- **THEN** SHALL receber HTTP 200 com corpo `Healthy` e conteúdo textual
- **AND** SHALL não depender de banco, serviços externos ou arquivo de vendas

#### Scenario: Repetir consulta técnica
- **WHEN** o cliente repetir a consulta de disponibilidade
- **THEN** SHALL continuar recebendo o mesmo contrato técnico, sem criar cookies, vendas ou recebimentos

### Requirement: Acesso técnico sem contas de usuários

A API técnica SHALL funcionar sem login, contas, senha, sessão autenticada ou
permissões por pessoa, para o cenário local de uma equipe específica. SHALL não
apresentar desafio de autenticação, redirecionamento de login ou política CORS
permissiva para integrar a demonstração nesta fase.

#### Scenario: Consultar sem credenciais
- **WHEN** um cliente local consultar `/health` sem cookies ou cabeçalhos de autenticação
- **THEN** SHALL obter a resposta técnica sem 401, 403 ou redirecionamento de login
- **AND** SHALL não receber cookie de sessão nem exigência de cadastro de usuário

#### Scenario: Não habilitar integração web implícita
- **WHEN** uma requisição à API técnica incluir uma origem web arbitrária
- **THEN** a resposta SHALL não conceder acesso cross-origin por política permissiva
- **AND** o frontend demonstrativo SHALL permanecer sem dependência dessa API

### Requirement: Falhas técnicas sem vazamento de detalhes

Exceções inesperadas de requisição SHALL gerar HTTP 500 com Problem Details
genérico, sem stack trace, segredos ou configuração interna, inclusive em ambiente
de desenvolvimento. A aplicação SHALL não publicar rota para provocar falhas de
teste e SHALL não ler dados reais para verificar esse comportamento.

#### Scenario: Tratar exceção em composição exclusiva de teste
- **WHEN** um teste provocar uma exceção de requisição com conteúdo sensível conhecido e solicitar resposta JSON
- **THEN** SHALL receber HTTP 500 com Problem Details sem reproduzir o conteúdo sensível ou a stack trace
- **AND** a rota ou componente que provoca a exceção SHALL não estar disponível no host publicado

### Requirement: Ciclo de vida local verificável

Porta ocupada SHALL impedir inicialização com erro e código não zero, sem troca
automática de porta. Encerramento solicitado pelo operador SHALL liberar o listener.
A disponibilidade em rede SHALL ser conferida em processo real, não inferida
somente de testes HTTP em memória.

#### Scenario: Informar conflito de porta
- **WHEN** outra instância já estiver usando a porta configurada
- **THEN** a nova instância SHALL falhar sem anunciar disponibilidade em outra porta
- **AND** SHALL não interromper o processo que já utilizava a porta

#### Scenario: Encerrar o host
- **WHEN** o operador solicitar encerramento normal do processo iniciado
- **THEN** SHALL concluir o encerramento e liberar a porta sem deixar processo auxiliar residual

### Requirement: Independência da demonstração e ausência de operações comerciais

A base SHALL não expor operações comerciais, persistir dados de negócio, ler a
planilha real ou alterar a demonstração Angular. O frontend SHALL continuar
funcionando sem o backend e sem mudanças em fonte demonstrativa, rotas ou
publicação no Pages. Rotas comerciais inexistentes SHALL responder 404.

#### Scenario: Consultar uma rota comercial não implementada
- **WHEN** um cliente solicitar `/vendas` ou `/pagamentos` na API técnica
- **THEN** SHALL receber HTTP 404, sem resposta comercial sintética ou consulta à planilha

#### Scenario: Usar a demonstração com o host desligado
- **WHEN** o frontend for compilado e seus testes unitários executados sem iniciar a API
- **THEN** SHALL continuar atendendo às verificações existentes sem introduzir chamadas ao backend
- **AND** a fase SHALL não alterar o workflow de publicação do Pages ou persistir o estado demonstrativo
