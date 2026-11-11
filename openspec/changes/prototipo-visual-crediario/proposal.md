# Proposal

## Why

A equipe da ótica utiliza uma planilha auxiliar para acompanhar crediários e, embora geralmente consiga consultá-la, por vezes não encontra o cliente; cadastrar vendas e atualizar pagamentos também exige cuidado manual. Um protótipo visual permitirá validar uma alternativa mais clara antes de investir no backend, preservando a possibilidade de reaproveitar a interface.

## What Changes

- Criar um frontend navegável chamado Crediário Fácil, em pt-BR, com foco desktop, sidebar e busca em posição consistente.
- Utilizar Angular + TypeScript, com identificadores próprios em português e organização por funcionalidades conforme o `AGENTS.md`.
- Priorizar Vendas como entrada, com 10–15 vendas fictícias, filtros, indicadores, identificação de clientes e detalhes das parcelas.
- Permitir busca parcial por nome e CPF, tolerante a acentos, caixa e formatação do documento, com recuperação explícita de buscas sem resultados ou restringidas por filtros.
- Simular cadastro de clientes e vendas, edição segura de vendas sem pagamentos e registro de pagamento integral de uma parcela, usando somente estado local em memória.
- Disponibilizar Clientes, Parcelas e Visão Geral com os mesmos dados; Relatórios e Configurações serão telas demonstrativas, sem operações reais.
- Separar dados fictícios, regras de apresentação e componentes para facilitar uma futura integração, sem definir ou implementar API agora.
- Validar o fluxo com tarefas de atendimento, incluindo cliente não localizado e nomes semelhantes.

Fora de escopo: empacotamento Tauri, backend, banco, autenticação, integrações com sistemas da franquia, importação de Excel, cobranças automáticas, exportação real, pagamentos parciais, juros, renegociação e uso operacional com dados reais.

A evolução definida é Tauri como janela nativa Windows, Angular + TypeScript para interface, C# / ASP.NET Core para regras e validações definitivas e SQLite como banco local. Essa arquitetura orienta a separação da interface, mas suas camadas além do Angular não serão implementadas nesta mudança.

## Capabilities

### New Capabilities

- `navegacao-crediario`: estrutura visual consistente e acesso aos módulos e indicadores demonstrativos.
- `consulta-crediario`: busca de clientes e vendas, filtros, identificação de registros e consulta de parcelas.
- `registro-crediario`: cadastro local de clientes e vendas, prévia de parcelas e edição limitada de vendas.
- `recebimento-parcelas`: simulação de pagamento com confirmação e atualização coerente de saldos e situações.

### Modified Capabilities

Nenhuma; não há especificações existentes.

## Impact

O repositório contém documentos de contexto, `AGENTS.md` e planejamento OpenSpec, sem aplicação, testes de implementação ou stack configurada. A implementação criará a base frontend e seus testes, sem alterar os sistemas existentes da ótica. As capturas de tela e a planilha mencionadas no README não estão disponíveis; os documentos e a conversa são as referências atuais. Respostas identificadas como reconstruídas nas entrevistas são hipóteses para validação, não evidências confirmadas.
