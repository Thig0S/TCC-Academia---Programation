# PRD — Mercadão dos Óculos - Vendas em Aberto

> Documento de planejamento. Não comprova implementação nem aprovação. O MVP descrito é uma demonstração com dados sintéticos e estado em memória, inadequada para controlar cobranças reais.

## 1. Identificação e resumo executivo

- **Situação:** rascunho para validação.
- **Data de elaboração:** 11/11/2026. **Versão:** 1.1 — revisão de planejamento em 13/11/2026.
- **Produto:** Mercadão dos Óculos - Vendas em Aberto — MVP visual de gestão de vendas a prazo de uma ótica.
- **Origem do briefing:** solicitação de criar um PRD baseado no `README.md`, sem autorização para implementação.
- **Responsáveis e aprovadores:** não confirmados. Proprietário e funcionários são partes interessadas previstas, não aprovadores formalmente designados.
- **Proposta:** demonstrar uma alternativa à planilha auxiliar de crediário, concentrando cadastro de venda, identificação do cliente, consulta de parcelas e simulação de recebimento em uma navegação simples.
- **Valor esperado:** validar se a equipe consegue cadastrar e conferir uma venda com menos dificuldade, distinguir clientes com nomes semelhantes e entender pagamentos e saldos. Redução efetiva de erros e ganhos de tempo ainda não foram medidos.
- **Limite:** Angular + TypeScript, dados sintéticos, operações locais e perda das alterações ao recarregar. Backend, banco, autenticação, persistência e integrações não fazem parte do MVP.

## 2. Contexto, problema e evidências

O README propõe substituir, futuramente, uma planilha usada para acompanhar vendas a prazo, parcelas e recebimentos. A entrevista de gestão delimita melhor essa oportunidade: a loja já utiliza sistemas da franquia, inclusive de crediário, e mantém uma planilha auxiliar de determinadas vendas. O produto não deve ser interpretado como substituto de todo o sistema financeiro ou do crediário da franquia.

O relato de atendimento indica que consultar por nome pode ser tranquilo, enquanto cadastrar e conferir informações exige mais cuidado. Nomes semelhantes exigem conferência de sobrenome e CPF. Portanto, não há evidência de que a busca atual seja difícil para todos; a oportunidade mais consistente é simplificar cadastro, conferência e atualização, preservando a facilidade de consulta. Parte das entrevistas foi reconstruída, aproximada ou reorganizada e precisa de validação antes de fundamentar afirmações definitivas sobre frequência ou prejuízo financeiro.

**Estado local verificado em 13/11/2026:** a base técnica das FASE-001/002 está integrada na `main`, com página inicial, manifesto, Bootstrap e infraestrutura de testes. `frontend/README.md` registra build, 5 testes unitários/componentes e 8 execuções E2E aprovados na entrega anterior; não foram reexecutados nesta revisão. A mudança está em `openspec/changes/archive/2026-11-13-preparar-base-tecnica-frontend/` e a capacidade em `openspec/specs/demonstracao-inicial/spec.md`. Não existem ainda navegação funcional, temas ou fluxos comerciais. A FASE-001 global permanece parcial pelas decisões de produto diferidas.

### Fontes e decisões de referência

Os caminhos abaixo são relativos à raiz do repositório. “Confirmado por fonte” significa documentado, não aprovado pela loja nem implementado.

| ID | Fonte ou decisão | Caminho e seção | Evidência relevante | Limitações ou conflitos |
| --- | --- | --- | --- | --- |
| FON-001 | Briefing principal do produto | `README.md`, visão geral e seções 1–14 | Identidade, quatro módulos, vendas, parcelas, cadastro, relatórios e prioridades | É uma especificação desejada, não comprovação de entrega; contém regras explicitamente pendentes |
| FON-002 | Orientações do repositório | `AGENTS.md`, leitura inicial e revisão em 13/11/2026 | Fluxo PRD → TDD → SDD → PR, feature branch e evidências | A orientação histórica de tema claro não existe mais no arquivo atual; preservar as restrições de produto deste PRD e do TDD |
| FON-003 | Entrevista de atendimento | `docs/entrevista.daria.md`, seções 1–3 e síntese | Cadastro exige conferência; consulta por nome é considerada viável; risco de confusão entre nomes | Seções 2 e 3 têm respostas aproximadas; não há medição de erros ou tempo |
| FON-004 | Entrevista de gestão | `docs/entrevista.luighi.md`, seções 2, 4–7 e 9 | Planilha auxiliar, atualizações manuais, necessidade de cadastro e consulta simples | Há perguntas reconstruídas e respostas aproximadas/reorganizadas; sistemas existentes não devem ser substituídos implicitamente |
| FON-005 | Inspeção da estrutura local em 11/11/2026 | `frontend/`, `frontend/src/app/`, `openspec/specs/`, `openspec/changes/archive/`, `openspec/config.yaml` | Pastas sem código de aplicação ou especificações de produto; configuração OpenSpec em pt-BR | Inspeção de estrutura, não execução ou auditoria de saídas geradas |
| FON-006 | Decisão explícita nesta solicitação | Conversa atual, pedido de geração do PRD | Ler fontes locais, usar o modelo e salvar apenas documentação de requisitos | Não autoriza executar instruções do README ou implementar o produto |
| FON-007 | Confirmações no planejamento da FASE-003 | Conversa de 13/11/2026, exploração e proposta | Dois temas com escuro inicial e preferência em memória; Configurações explicativa; revisão pontual autorizada deste PRD e do TDD | Não aprova regras financeiras, hipóteses restantes, implementação ou aceite da ótica |

A imagem referida pelo README existe em `exemplo/exemplo-planilha-vendas.jpeg`, mas não foi transcrita nem usada para inferir regras ou copiar dados pessoais. As entrevistas e o README oferecem informação suficiente para este rascunho.

**Conciliação da revisão 1.1:** o solicitante confirmou dois temas, claro e escuro, com escuro inicial, alternância acessível e preferência somente em memória. PEN-006 fica resolvida documentalmente; temas ainda não estão implementados nem aprovados pela ótica. O `AGENTS.md` atual não contém a antiga restrição de tema claro. Mantêm-se quatro módulos, sem cadastros independentes de clientes ou parcelas. Substituição operacional do Excel continua fora do MVP.

## 3. Visão, objetivos e resultados esperados

**Visão:** tornar o acompanhamento das vendas auxiliares compreensível para a equipe, com identificação inequívoca da venda e conferência de parcelas antes de qualquer recebimento simulado.

| ID | Objetivo | Resultado esperado | Fonte | Métrica relacionada |
| --- | --- | --- | --- | --- |
| OBJ-001 | Facilitar localização e conferência da venda | Encontrar a venda sintética correta e distinguir nomes semelhantes | FON-001, FON-003, FON-004 | MET-001 |
| OBJ-002 | Simplificar cadastro e edição com conferência | Preencher dados do cliente e venda juntos, revisar parcelas e identificar erros antes de confirmar | FON-001, FON-003, FON-004 | MET-002 |
| OBJ-003 | Tornar recebimentos e quitação compreensíveis | Identificar a parcela correta, simular pagamento e reconhecer atualização do saldo | FON-001, FON-004 | MET-003 |
| OBJ-004 | Apoiar leitura da situação financeira | Explicar valores em aberto, atrasos, recebimentos e próximos vencimentos | FON-001, FON-004 | MET-004 |
| OBJ-005 | Validar uma demonstração acessível e sem uso operacional indevido | Percorrer módulos e reconhecer que dados não são reais nem persistidos | FON-001, FON-002 | MET-005 |

**Não objetivos:** operar cobranças reais; comprovar redução de inadimplência; substituir sistemas da franquia; eliminar lançamentos duplicados entre sistemas por integração; entregar infraestrutura de produção; validar regras financeiras definitivas somente por aparência da interface.

## 4. Público, perfis e necessidades

| Perfil | Contexto e tarefas | Necessidades | Base e limite |
| --- | --- | --- | --- |
| Funcionário de atendimento | Cadastrar vendas, localizar cliente durante atendimento e conferir parcelas | Campos claros, identificação por mais de um dado, revisão antes de confirmar, mensagens sem termos técnicos | FON-003 e FON-004; não representa todos os funcionários |
| Proprietário ou pessoa de gestão | Conferir situação dos valores auxiliares e discutir o fluxo da loja | Resumos consistentes, identificação de atrasos e distinção entre aberto e quitado | FON-001 e FON-004; participação e papel aprovador a confirmar |
| Participante da avaliação do protótipo | Executar tarefas fictícias e comentar navegação | Aviso de demonstração, dados sintéticos e cancelamento sem efeito | FON-001 e FON-002 |

Não se pressupõem contas, permissões ou autenticação por perfil. O perfil “Administrador” na navegação é apenas estático. Não há pesquisa específica de deficiência ou tecnologia assistiva; navegação por teclado, foco perceptível, rótulos e situações textuais são requisitos, não características presumidas dos participantes.

## 5. Escopo e prioridades

### Incluído no MVP

- **Essencial:** estrutura com Visão Geral, Vendas, Relatórios e Configurações; aviso de demonstração; temas claro e escuro, escuro inicial e alternância acessível sem persistência; listagem de vendas em aberto com busca local; cadastro com dados do cliente; detalhes com parcelas; simulação controlada de pagamento; consulta de quitadas; consistência de saldos e estados; acessibilidade e validações. Sem esses elementos não é possível validar o fluxo principal com segurança demonstrativa.
- **Importante:** edição de venda em situações permitidas, indicadores detalhados da Visão Geral e resumo financeiro de Relatórios. Completam a avaliação do processo, mas dependem de delimitar edição e regras de contabilização. Relatórios e Configurações continuam navegáveis mesmo antes do refinamento desses conteúdos.
- **Desejável:** gráfico de recebimentos dos últimos meses, paginação e decoração discreta de avatar/ícones. Não devem atrasar a validação de cadastro e recebimento.
- **Futuro:** infraestrutura operacional e alternativas condicionadas às decisões abaixo. Não há compromisso de prazo.

Prioridade expressa importância, não situação de validação. Comportamentos documentados têm origem confirmada por fonte; decisões financeiras e de busca listadas em PEN continuam abertas. Para demonstração antes dessas decisões, usar casos inequívocos e impedir confirmação dos casos ambíguos, conforme HIP-001; não decidir regras implicitamente.

### Fora do escopo

Backend, SQLite, persistência em navegador ou arquivo, autenticação, autorização, integrações, APIs externas de dados, importação de planilha, migração de dados reais, cobrança automatizada, juros/multas/descontos, estorno, exclusão de vendas, conciliação com franquia, emissão fiscal e exportação real de relatórios. Não criar cadastros independentes de clientes ou parcelas, busca global ou unicidade por CPF. Não inferir limites de crédito, quantidade máxima de parcelas ou políticas comerciais.

### Evolução futura, sem compromisso de entrega

A direção futura registrada no TDD prevê Tauri como janela Windows, Angular na interface, ASP.NET Core nas regras definitivas e SQLite local acessado pelo backend. Comunicação, execução do processo .NET, empacotamento e contratos ainda serão planejados. Temas claro/escuro e alternância pertencem à FASE-003 do MVP visual, não à infraestrutura futura.

### Recorte de planejamento da FASE-003 — revisão 1.1

Construir futuramente a estrutura visual e a navegação dos quatro módulos, com Quitadas dentro de Vendas, aviso em todos os destinos, dois temas e páginas identificadas. Visão Geral, Vendas, Quitadas e Relatórios explicarão que seus conteúdos comerciais ainda não estão disponíveis, sem números, listas, busca ou ações comerciais fictícias. Configurações explicará dados fictícios, estado apenas em memória, perda ao recarregar e ausência de capacidade operacional, sem controles fictícios. Esta confirmação aceita HIP-004 somente para esse conteúdo; filtros de Quitadas em PEN-012 permanecem abertos. A FASE-003 não conclui os requisitos de consultas, cadastro, recebimento ou indicadores. A criação de proposta e demais artefatos é planejamento, não autorização de implementação.

## 6. Jornadas e fluxos de uso

| ID | Ator, objetivo e gatilho | Pré-condições e etapas | Resultado e alternativas | Requisitos |
| --- | --- | --- | --- | --- |
| JOR-001 | Atendimento; OBJ-001; pessoa pede consulta da venda | Demonstração aberta; entrar em Vendas, pesquisar por dado disponível, conferir nome/CPF/telefone e abrir cliente da venda | Detalhes da venda correta; sem resultado, revisar e limpar busca; não selecionar automaticamente homônimos | RF-001, RF-002, RF-003, RF-005 |
| JOR-002 | Atendimento; OBJ-002; nova venda fictícia | Acessar Nova venda, preencher cliente e venda, conferir entrada e prévia, confirmar | Venda aparece em aberto; erro preserva campos; cancelar não altera dados; regra pendente impede confirmar apenas o caso afetado | RF-004, RF-011 |
| JOR-003 | Atendimento; OBJ-002; correção de venda fictícia | Abrir edição, revisar dados permitidos e confirmar | Listas e detalhes refletem alteração única; cancelar mantém original; edição financeira após pagamento depende de PEN-008 | RF-006, RF-011 |
| JOR-004 | Atendimento; OBJ-003; recebimento fictício de parcela | Conferir venda e parcela não paga, abrir modal, informar valor/data/forma e confirmar | Atualização local coerente e confirmação demonstrativa; falha não muda valores; quitação move a venda para Quitadas | RF-005, RF-007, RF-008, RF-011 |
| JOR-005 | Gestão; OBJ-004; revisão dos valores | Navegar por Visão Geral e Relatórios, ler indicadores e relacionar com vendas/parcelas | Compreensão de saldos, atrasos e recebimentos; exportação não gera arquivo; sem dados, totais zerados | RF-009, RF-010 |
| JOR-006 | Participante; OBJ-005; início e encerramento da avaliação | Ler aviso, percorrer os quatro módulos e Configurações, utilizar teclado e recarregar | Reconhecer navegação e descarte das alterações; apresentação sem login ou promessa de persistência | RF-001, RF-011, RF-012 |

## 7. Requisitos funcionais

### RF-001 — Estrutura e navegação

- **Comportamento:** apresentar identidade Mercadão dos Óculos - Vendas em Aberto, navegação lateral com ícones, rótulos e indicação ativa para os quatro módulos; disponibilizar Quitadas dentro de Vendas e perfil estático na parte inferior.
- **Necessidade:** orientação entre telas; OBJ-001 e OBJ-005; JOR-001 e JOR-006.
- **Ator, pré-condições e entradas:** participante; demonstração carregada; acionamento de link ou teclado.
- **Resultado:** conteúdo do módulo selecionado acessível sem login; dados sintéticos mantidos entre navegações da mesma sessão.
- **Exceções:** não criar módulos independentes de clientes e parcelas; seleção de venda inexistente deve informar ausência e oferecer retorno, sem tela quebrada.
- **Prioridade:** Essencial, sustenta todas as tarefas.
- **Origem/situação:** FON-001 §§2 e 13; FON-002; confirmado por fonte.
- **Aceite:** CA-001, CA-018.

### RF-002 — Listagem de vendas em aberto

- **Comportamento:** exibir somente vendas com saldo restante, botão Nova venda e colunas Cliente, Data da venda, Valor total, Parcelas pagas/total, Saldo devedor, Próximo vencimento, Situação e Ações. Oferecer acesso visível a visualizar e editar.
- **Necessidade:** conferência e localização; OBJ-001; JOR-001.
- **Ator, pré-condições e entradas:** atendimento; coleção sintética inicial com 10 a 15 vendas; abertura de Vendas.
- **Resultado:** tabela legível e quatro resumos: Total em aberto, Valores em atraso, Recebido no mês e Vendas cadastradas; números derivados da fonte demonstrativa comum.
- **Exceções:** distinguir coleção vazia de filtro sem resultados; nenhuma quitada na lista principal; não agregar situação geral com regras não confirmadas. Escopo dos cartões e contagem pendente em PEN-009.
- **Prioridade:** Essencial, tela prioritária do produto.
- **Origem/situação:** FON-001 §3; confirmado por fonte no conteúdo; PEN-007 e PEN-009 para semântica complementar.
- **Aceite:** CA-002, CA-003, CA-014.

### RF-003 — Busca local de vendas

- **Comportamento:** fornecer uma única área de pesquisa destacada em Vendas, contemplando nome, CPF, telefone e data da venda, além de ação de limpar; orientação “Buscar por nome, CPF, telefone ou data da venda...”.
- **Necessidade:** identificar a venda certa sem duplicar busca; OBJ-001; JOR-001.
- **Ator, pré-condições e entradas:** atendimento; vendas sintéticas disponíveis; critério informado e limpeza.
- **Resultado:** apresentar correspondências locais preservando a separação entre abertas e quitadas e permitir conferir a identidade antes de abrir.
- **Exceções:** informar ausência de resultados sem apagar vendas; regras de combinação, normalização e data exata/período não estão definidas. Não presumir busca global ou filtros específicos de quitadas.
- **Prioridade:** Essencial, requisito central de consulta.
- **Origem/situação:** FON-001 §§2, 3 e 13; FON-003 §1; FON-004 §§4 e 6; capacidade confirmada por fonte, algoritmo pendente em PEN-005.
- **Aceite:** CA-004, CA-005, CA-019.

### RF-004 — Cadastrar venda com dados do cliente

- **Comportamento:** reunir no mesmo formulário nome, CPF, telefone, valor da venda, existência de entrada, quantidade de parcelas e data da venda como obrigatórios; descrição do cliente opcional; valor da entrada quando houver. Iniciar data com o dia local atual e permitir alteração. Mostrar prévia das parcelas antes da confirmação.
- **Necessidade:** reduzir dificuldade de cadastro e conferência; OBJ-002; JOR-002.
- **Ator, pré-condições e entradas:** atendimento; Nova venda; campos descritos, sem exigir cliente prévio.
- **Resultado:** uma venda sintética com parcelas e dados próprios de cliente passa a ser consultável; descrição preenchida aparece nos detalhes; prévia aplica desconto da entrada.
- **Exceções:** campos inválidos preservados e identificados junto ao campo; descrição vazia não bloqueia. Casos com dia inexistente, centavos indivisíveis ou contabilização indefinida da entrada dependem de PEN-001 a PEN-003; HIP-001 propõe bloqueio explícito, não regra financeira automática. Formato/validação de CPF e telefone depende de PEN-010; não exigir unicidade.
- **Prioridade:** Essencial, principal dor relatada.
- **Origem/situação:** FON-001 §§5 e 9; FON-002; FON-003 §1; FON-004 §6; campos e fórmula confirmados por fonte, restrições demonstrativas propostas e detalhes pendentes.
- **Aceite:** CA-006, CA-007, CA-008, CA-009, CA-016, CA-017.

### RF-005 — Consultar detalhes e parcelas da venda

- **Comportamento:** ao acionar o cliente da venda, mostrar nome, CPF, telefone, descrição quando preenchida, data da venda, valor total, indicação de entrada, quantidade de parcelas, total pago, saldo e situação geral. Tabela de parcelas: número/total, valor, vencimento, situação, data e forma de pagamento e ações.
- **Necessidade:** conferência antes de recebimento; OBJ-001 e OBJ-003; JOR-001 e JOR-004.
- **Ator, pré-condições e entradas:** atendimento; venda existente; seleção da venda.
- **Resultado:** parcelas da venda, inclusive as pagas, visíveis no seu contexto; situações textuais Aberto, Próximos dias, Atrasado e Paga.
- **Exceções:** não abrir cadastro independente de cliente; datas/formas ainda inexistentes indicadas como não informadas, nunca inventadas; janela de sete dias depende de PEN-004 e situação geral depende de PEN-007.
- **Prioridade:** Essencial, evita recebimento sem conferência.
- **Origem/situação:** FON-001 §§4–6; confirmado por fonte, limites de classificação pendentes.
- **Aceite:** CA-010, CA-011, CA-018, CA-020.

### RF-006 — Editar venda demonstrativa

- **Comportamento:** oferecer formulário com valores existentes e confirmação explícita, preservando os dados ao cancelar e atualizando somente após validação.
- **Necessidade:** avaliar correção e confiança ao alterar registros; OBJ-002; JOR-003.
- **Ator, pré-condições e entradas:** atendimento; venda existente; alterações nos campos autorizados.
- **Resultado:** detalhe, tabela e resumos permanecem consistentes após uma edição aceita.
- **Exceções:** permissões de alteração após pagamentos e repercussões no parcelamento não foram definidas; não reescrever histórico pago. HIP-002 propõe limitar edição financeira até PEN-008; falhas não deixam alterações parciais.
- **Prioridade:** Importante, complementa cadastro, com risco financeiro ainda aberto.
- **Origem/situação:** FON-001 §§3 e 9; FON-002; existência confirmada por fonte, alcance pendente em PEN-008 e HIP-002.
- **Aceite:** CA-012, CA-016, CA-017.

### RF-007 — Simular registro de pagamento

- **Comportamento:** abrir modal vinculado à venda e parcela, contendo valor recebido, data do pagamento, forma de pagamento e Confirmar pagamento; permitir cancelamento.
- **Necessidade:** avaliar baixa com conferência; OBJ-003; JOR-004.
- **Ator, pré-condições e entradas:** atendimento; parcela elegível não paga; campos do modal.
- **Resultado:** em caso permitido e válido, registrar uma única alteração em memória, mostrar confirmação demonstrativa e atualizar parcela, saldos e resumos relacionados.
- **Exceções:** não permitir novo pagamento da parcela já liquidada pelo mesmo fluxo; duplicidade de envio não duplica lançamento. Valor parcial/excedente, antecipação, formas aceitas e limites de data dependem de PEN-011; HIP-003 propõe demonstração apenas de liquidação integral de uma parcela, sem sugerir que seja regra da loja.
- **Prioridade:** Essencial, valida uma tarefa central.
- **Origem/situação:** FON-001 §4; FON-002; FON-004 §§4 e 6; campos e simulação confirmados por fonte, elegibilidade detalhada pendente.
- **Aceite:** CA-011, CA-013, CA-016, CA-017.

### RF-008 — Consultar vendas quitadas

- **Comportamento:** disponibilizar página dentro de Vendas para vendas totalmente pagas, com situação Quitada e acesso aos detalhes e parcelas pagas.
- **Necessidade:** separar acompanhamento de saldo e histórico demonstrativo; OBJ-003; JOR-004.
- **Ator, pré-condições e entradas:** atendimento; venda sintética já quitada ou última parcela paga em caso inequívoco; abrir Quitadas.
- **Resultado:** venda liquidada deixa a lista de abertas e aparece uma única vez em Quitadas, sem perder parcelas.
- **Exceções:** indicar coleção vazia; não criar quinto módulo, filtros não confirmados ou saldo residual oculto.
- **Prioridade:** Essencial, consequência obrigatória do recebimento integral.
- **Origem/situação:** FON-001 §§3 e 6; confirmado por fonte; filtros específicos em PEN-012.
- **Aceite:** CA-003, CA-011, CA-014.

### RF-009 — Exibir Visão Geral

- **Comportamento:** mostrar saldo em aberto, saldo em atraso, recebimentos do mês, vendas recentes, próximos pagamentos/vencimentos e pagamentos em atraso que exigem atenção.
- **Necessidade:** leitura financeira do conjunto; OBJ-004; JOR-005.
- **Ator, pré-condições e entradas:** gestão; fonte demonstrativa e data de referência identificada; acessar Visão Geral.
- **Resultado:** valores conciliáveis com vendas, parcelas e pagamentos da mesma sessão; próximos dias associados à janela de sete dias, após PEN-004.
- **Exceções:** sem dados, totais zerados e mensagem apropriada; não contabilizar entrada como recebimento por decisão implícita (PEN-002); gráfico histórico é desejável, não obrigatório.
- **Prioridade:** Importante para detalhamento; existência e acesso da página são essenciais em RF-001.
- **Origem/situação:** FON-001 §7; confirmado por fonte, semântica de períodos/entrada pendente em PEN-002 e PEN-009.
- **Aceite:** CA-014, CA-020.

### RF-010 — Exibir resumo financeiro em Relatórios

- **Comportamento:** apresentar recebimentos mensais, valores em aberto, parcelas vencidas e vendas por período com dados comuns à demonstração; exibir Exportar relatório como ação apenas ilustrativa.
- **Necessidade:** conferir utilidade do resumo financeiro; OBJ-004; JOR-005.
- **Ator, pré-condições e entradas:** gestão; fonte demonstrativa disponível; acessar Relatórios.
- **Resultado:** cartões ou gráficos com períodos identificados; nenhuma geração de arquivo ou transmissão de dados.
- **Exceções:** ação ilustrativa deve informar indisponibilidade no protótipo, sem anunciar exportação concluída; seleção de períodos não especificada não é presumida.
- **Prioridade:** Importante para conteúdo; acesso à página é essencial em RF-001.
- **Origem/situação:** FON-001 §8; confirmado por fonte; períodos em PEN-009.
- **Aceite:** CA-014, CA-015.

### RF-011 — Explicitar demonstração e proteger operações locais

- **Comportamento:** exibir aviso de dados sintéticos e descarte ao recarregar; confirmar somente operações válidas, sem duplicidade, preservando valores em erro e sem alterações ao cancelar.
- **Necessidade:** confiança na avaliação e prevenção de uso real; OBJ-002, OBJ-003 e OBJ-005; JOR-002, JOR-003, JOR-004 e JOR-006.
- **Ator, pré-condições e entradas:** qualquer participante; demonstração carregada; confirmar, cancelar ou recarregar.
- **Resultado:** navegação mantém estado em memória; recarga restaura a fonte inicial; falhas não são apresentadas como sucesso nem deixam mutações parciais.
- **Exceções:** não persistir preferência ou registros; não simular rede/carregamento sem necessidade. Falhas são cenários de verificação, não uma exigência de introduzir falhas artificiais na interface.
- **Prioridade:** Essencial, delimita segurança e fidelidade do protótipo.
- **Origem/situação:** FON-001 §§10 e 13; FON-002; confirmado por fonte.
- **Aceite:** CA-007, CA-009, CA-013, CA-016, CA-017, CA-021.

### RF-012 — Manter Configurações navegável

- **Comportamento:** disponibilizar página Configurações e atalho na navegação, coerentes com o restante da demonstração.
- **Necessidade:** validar organização proposta; OBJ-005; JOR-006.
- **Ator, pré-condições e entradas:** participante; abrir Configurações.
- **Resultado:** página identificada, com explicação do caráter demonstrativo e sem controles que prometam mudanças inexistentes.
- **Exceções:** não inventar gestão de contas, integrações, regras comerciais ou persistência. HIP-004 foi aceita para a FASE-003: explicar os limites da demonstração, sem controles fictícios. A alternância global dos temas foi confirmada em PEN-006; outros conteúdos funcionais continuam fora do recorte.
- **Prioridade:** Essencial para navegação; refinamento depende de validação.
- **Origem/situação:** FON-001 §§2 e 13 e FON-007; presença confirmada por fonte, conteúdo explicativo de HIP-004 aceito para FASE-003; demais itens de PEN-012 continuam pendentes.
- **Aceite:** CA-001, CA-022.

## 8. Regras de negócio e dados conceituais

### Entidades e relações

| Conceito | Dados necessários e relação | Limites |
| --- | --- | --- |
| Venda | Identificador estável, dados do cliente daquela venda, data civil, valor total, indicação/valor de entrada, quantidade de parcelas e descrição opcional | Sem cliente mestre, unicidade de CPF ou contrato de backend |
| Dados do cliente na venda | Nome, CPF, telefone e descrição opcional | Dados sintéticos; alteração não se propaga automaticamente a outras vendas |
| Parcela | Identificador estável, venda de origem, número, valor em centavos e vencimento civil | Pertence à venda, não a módulo independente; calendário e arredondamento pendentes |
| Pagamento demonstrativo | Associação à parcela/venda, valor em centavos, data e forma | Não define cardinalidade definitiva para pagamentos parciais nem modelo de banco |
| Resumo derivado | Total pago, saldo devedor, quantidades, próximo vencimento e totais por período | Mesma fonte para todas as telas; entrada e agregações pendentes não podem ser mascaradas |
| Contexto da demonstração | Coleção sintética e data de referência visível | Sugere-se referência civil do dia da sessão; confirmação em HIP-005 |

### Regras e situações

| ID | Regra, condição e consequência | Exceções e limites | Origem e situação |
| --- | --- | --- | --- |
| RN-001 | Dados do cliente são informados em cada venda; nome, CPF e telefone são obrigatórios, descrição é opcional | Não presumir cadastro prévio, unicidade ou compartilhamento entre vendas | FON-001 §5; confirmada por fonte |
| RN-002 | Quando houver entrada, valor a parcelar = valor total − entrada; valor-base = valor a parcelar ÷ quantidade | Registrar a entrada como pagamento, limites de valores e distribuição de centavos não estão resolvidos | FON-001 §9; fórmula confirmada; PEN-002, PEN-003 e PEN-010 |
| RN-003 | A data inicial da venda é o dia do cadastro e pode ser alterada; vencimentos repetem o dia da venda nos meses seguintes | Mês sem esse dia não autoriza ajustar para dia anterior/seguinte; PEN-001 | FON-001 §9; confirmada para datas existentes |
| RN-004 | Venda totalmente paga recebe situação Quitada, sai das abertas e preserva parcelas pagas em seus detalhes | Demais situações gerais não devem ser deduzidas das parcelas sem aprovação; PEN-007 | FON-001 §§3 e 6; quitação confirmada por fonte |
| RN-005 | Parcela admite Aberto, Próximos dias, Atrasado e Paga; Próximos dias tem janela de sete dias | Limites inclusivos e vencimento hoje pendentes; não usar classificações de borda como regra definitiva | FON-001 §4; rótulos/janela confirmados, PEN-004 |
| RN-006 | Valores financeiros usam centavos inteiros e datas civis preservam o dia sem deslocamento de fuso | Representação não define arredondamento comercial ou juros | FON-002; restrição técnica confirmada |
| RN-007 | Pagamento aceito deve manter coerência entre parcela, total pago, saldo, listagens e resumos da sessão | Contabilização de entrada e pagamentos parciais pendente; demonstrar casos inequívocos sem entrada enquanto necessário | FON-001 §§4, 8 e 10; FON-002; integridade confirmada, PEN-002 e PEN-011 |
| RN-008 | Cancelamento e falha não modificam registros; repetição de confirmação da mesma operação não duplica alterações | Não implica idempotência de API futura | FON-002; restrição demonstrativa confirmada |
| RN-009 | Estado é apenas em memória, com dados sintéticos; recarga elimina mudanças da sessão | Sem exceção de persistência nesta etapa | FON-001 e FON-002; confirmada por fonte |
| RN-010 | Resumos representam os mesmos registros das listas e detalhes, com períodos e universo identificados | Efeito da busca nos cartões, contagem de cadastradas e referência mensal precisam de decisão | FON-001 §§3, 7 e 8; consistência confirmada, PEN-009 |

Exemplo financeiro confirmado por FON-001: venda fictícia de R$ 1.000,00, entrada de R$ 200,00 e quatro parcelas produz R$ 800,00 a parcelar e quatro valores-base de R$ 200,00. Isso não confirma como os R$ 200,00 de entrada entram no relatório de recebimentos. Não há regras confirmadas de juros, renegociação ou políticas de cobrança.

## 9. Requisitos não funcionais e restrições

| ID | Categoria | Condição verificável | Método de verificação | Prioridade | Origem e situação |
| --- | --- | --- | --- | --- | --- |
| RNF-001 | Idioma e apresentação | Textos, validações e nomes acessíveis em pt-BR; documento HTML com `lang="pt-BR"`; BRL e datas DD/MM/AAAA na apresentação | Inspeção das telas, mensagens e exemplos de datas/valores | Essencial | FON-001 e FON-002; confirmado por fonte |
| RNF-002 | Teclado e foco | Todas as ações principais operáveis por teclado; foco visível; modal recebe e contém foco, fecha com Escape e devolve foco ao acionador | Percurso manual sem mouse em cadastro, detalhe e recebimento | Essencial | FON-002; contenção de foco detalha a exigência de gerenciamento, proposta a validar |
| RNF-003 | Semântica e percepção | Campos com rótulos associados; botões de ícone nomeados; situações com texto além de cor; estados ativos anunciáveis | Inspeção semântica e leitura assistida; verificar contraste nos estados normal, foco e erro | Essencial | FON-001 e FON-002; confirmado por fonte; alvo WCAG 2.2 AA de contraste é proposto, não certificação |
| RNF-004 | Privacidade e isolamento | Nenhum dado pessoal real ou transmissão a serviços de dados; ausência de armazenamento persistente dos registros | Revisar fonte sintética e uso de rede/armazenamento durante operações e recarga | Essencial | FON-001 e FON-002; confirmado por fonte |
| RNF-005 | Integridade | Cada operação válida altera todos os derivados de forma coerente; erros/cancelamentos mantêm o estado anterior | Cenários CA-011 a CA-017, comparando centavos e registros antes/depois | Essencial | FON-002; confirmado por fonte |
| RNF-006 | Usabilidade e desempenho | Busca e abertura de detalhes sem espera artificial; avaliação proposta de resposta em até 300 ms com 15 vendas na máquina de demonstração | Medição local após definir ambiente; observação de tarefas | Importante | FON-001; limite numérico é HIP-006, não medição existente |
| RNF-007 | Layout e compatibilidade | Uso principal em computador, com formulários e ações utilizáveis em telas menores; tabela pode rolar sem ocultar acesso às ações | Proposta: testar 1366 × 768 e 390 × 844, teclado e zoom 200%; definir navegador em PEN-013 | Importante | FON-001 §1; tamanhos e zoom como roteiro proposto, não suporte comprovado |
| RNF-008 | Manutenibilidade e tecnologia | Angular + TypeScript; standalone, HTML separado, estado por signals, novos formulários com Signal Forms compatível; dados/cálculos fora da apresentação, tipos estritos | Revisão futura da estrutura/configuração e testes dos cálculos, sem impor versão neste PRD | Essencial | FON-002; confirmado por fonte, implementação inexistente |
| RNF-009 | Coerência visual | Temas claro e escuro, escuro inicial; alternância acessível com indicação do tema ativo, preservada entre rotas somente em memória; recarga restaura escuro; tokens e contraste consistentes | Revisão visual e por teclado das áreas existentes nos dois temas; componentes futuros herdam o mesmo contrato | Essencial | FON-001 e confirmação do solicitante em 13/11/2026; PEN-006 resolvida documentalmente |
| RNF-010 | Limite arquitetural | Ausência de backend, banco, autenticação, APIs de dados externas e persistência; sem contratos futuros inventados | Revisão de escopo e futura inspeção de dependências/código | Essencial | FON-001 e FON-002; confirmado por fonte |

Não há alegação de conformidade legal, certificação de acessibilidade, carga suportada ou segurança de produção. O controle de acesso não se aplica ao MVP sem dados reais; não deve ser simulado como proteção efetiva.

## 10. Experiência, navegação e estados de interface

**Arquitetura de informação:** navegação lateral → Visão Geral / Vendas / Relatórios / Configurações. Em Vendas: abertas → detalhes da venda e suas parcelas → modal de pagamento; Nova venda e edição no mesmo contexto funcional; Quitadas como opção interna. A escolha de página ou painel lateral para detalhes deve preservar orientação e retorno, sem exigir uma seção Clientes.

**Hierarquia visual:** título e subtítulo, ação principal, resumos pertinentes, área única de busca e tabela quando seus fluxos estiverem disponíveis. A listagem será o foco, não gráficos decorativos. Os dois temas usam superfícies e textos contrastantes, destaque discreto azul/índigo e foco perceptível; situações futuras combinam texto e cor. Na FASE-003, não antecipar tabelas, indicadores ou ações comerciais sem consumidor funcional.

| Estado | Conteúdo e comportamento esperado |
| --- | --- |
| Demonstração ativa | Aviso persistente: “Demonstração com dados fictícios. As alterações serão perdidas ao recarregar.”; perfil estático não sugere sessão autenticada |
| Coleção vazia | Explicar que não há vendas na coleção correspondente; abertas oferecem Nova venda; quitadas não oferecem quitação fictícia |
| Busca sem resultados | Informar que nenhum registro corresponde à pesquisa e permitir limpar critérios; não tratar como falha |
| Formulário inválido | Erros junto aos campos em português; manter valores; tentativa de envio revela erros e direciona foco de forma compreensível |
| Regra indefinida | Identificar a pendência que afeta a simulação e não confirmar cálculo arbitrário; bloqueio proposto em HIP-001 |
| Confirmação | Explicitar “simulado” e resultado local; não usar linguagem de cobrança/transferência real |
| Cancelamento | Fechar sem mutação, retornar foco ao acionador e preservar registro anterior |
| Falha local | Mensagem de falha, dados de entrada preservados, possibilidade de tentar novamente e nenhum sucesso ou alteração parcial |
| Operação em andamento | Impedir duplicidade somente durante a confirmação; não introduzir espera ou carregamento fictício |
| Exportação ilustrativa | Aviso de que exportação não está disponível nesta demonstração; nenhum arquivo gerado |

Foco e ordem de tabulação devem acompanhar a leitura. Modais precisam de título acessível e fechamento identificável, conter navegação de foco enquanto abertos e restaurar foco ao fechar. Elementos recolhíveis devem comunicar expansão; estados selecionados e ativos não dependem apenas de cor. Atalhos de ação não podem existir apenas ao passar o mouse.

## 11. Critérios de aceite e matriz de rastreabilidade

Os cenários abaixo são verificações planejadas, não testes executados. Cenários condicionados a decisões abertas só ficam conclusivos após registrar a decisão correspondente; hipóteses não equivalem a aceite da loja.

### CA-001 — Navegação principal
- **Requisitos:** RF-001, RF-012; RNF-002, RNF-009.
- **Dado** o protótipo aberto com aviso demonstrativo,
- **Quando** o participante percorrer por teclado Visão Geral, Vendas, Relatórios, Configurações e Quitadas,
- **Então** cada destino deve ser acessível, indicar sua localização e manter Quitadas dentro de Vendas, sem módulos independentes de clientes ou parcelas.

### CA-002 — Conteúdo da listagem
- **Requisitos:** RF-002; RNF-001.
- **Dado** o conjunto inicial sintético de 10 a 15 vendas com situações variadas,
- **Quando** abrir Vendas,
- **Então** devem aparecer as colunas e os quatro resumos previstos, valores em BRL, datas DD/MM/AAAA, acesso a Nova venda e somente vendas não quitadas.

### CA-003 — Coleções vazias
- **Requisitos:** RF-002, RF-008.
- **Dado** um conjunto de avaliação sem vendas abertas ou sem vendas quitadas, respectivamente,
- **Quando** abrir a coleção correspondente sem filtros,
- **Então** deve aparecer uma mensagem de coleção vazia, distinta de pesquisa sem resultados, sem linhas inventadas e com ação de cadastro pertinente apenas nas abertas.

### CA-004 — Busca por cada dado suportado
- **Requisito:** RF-003.
- **Dado** PEN-005 resolvida e duas vendas sintéticas com nomes semelhantes,
- **Quando** pesquisar separadamente por nome, CPF, telefone e data conforme a semântica aprovada,
- **Então** os resultados devem corresponder aos critérios, sem duplicar o campo de busca, permitindo conferir CPF/telefone nos detalhes antes de qualquer recebimento.

### CA-005 — Sem resultados e limpeza
- **Requisito:** RF-003.
- **Dado** vendas existentes e uma busca sem correspondência,
- **Quando** consultar e depois limpar a pesquisa,
- **Então** deve aparecer inicialmente “nenhum resultado” e depois a coleção original, sem perder registros nem incluir quitadas nas abertas.

### CA-006 — Cadastro inequívoco e descrição opcional
- **Requisitos:** RF-004; RN-001, RN-003.
- **Dado** um cadastro com campos obrigatórios válidos, sem entrada, divisão exata e dia existente nos meses seguintes,
- **Quando** revisar a prévia e confirmar, uma vez com descrição vazia e em outro caso com descrição preenchida,
- **Então** cada caso deve gerar uma única venda com suas parcelas; descrição vazia não deve impedir cadastro e descrição preenchida deve aparecer no detalhe. A data inicial deve ser o dia local do cadastro e aceitar alteração.

### CA-007 — Campos inválidos
- **Requisitos:** RF-004, RF-007, RF-011; RNF-001.
- **Dado** um formulário com campo obrigatório ausente ou valor inválido segundo a regra aprovada,
- **Quando** tentar confirmar inclusive pelo caminho de envio,
- **Então** erros em português devem ser revelados junto aos campos, valores preservados e nenhum registro criado ou pagamento efetivado; foco deve facilitar a correção.

### CA-008 — Fórmula da entrada
- **Requisitos:** RF-004; RN-002, RN-006.
- **Dado** valor de R$ 1.000,00, entrada de R$ 200,00 e quatro parcelas,
- **Quando** calcular a prévia,
- **Então** devem ser mostrados R$ 800,00 a parcelar e quatro valores-base de R$ 200,00, sem presumir que a entrada já foi registrada nos recebimentos. A confirmação financeira completa depende de PEN-002.

### CA-009 — Casos financeiros indefinidos
- **Requisitos:** RF-004, RF-011; RN-002, RN-003.
- **Dado** HIP-001 aceita para demonstração e pendências não resolvidas sobre centavos ou mês sem o dia da venda,
- **Quando** informar um caso afetado,
- **Então** o protótipo deve explicar a limitação, preservar campos e impedir confirmação desse caso, sem ajustar vencimento ou distribuir centavos silenciosamente. Após decisão, revisar este critério preservando seu ID e histórico.

### CA-010 — Detalhe no contexto da venda
- **Requisito:** RF-005; RN-001, RN-005.
- **Dado** duas vendas fictícias com nomes semelhantes e uma delas com parcelas já pagas,
- **Quando** selecionar o cliente de uma venda,
- **Então** devem aparecer apenas seus dados e parcelas, inclusive as pagas, com situações textuais e datas/formas existentes, sem cadastro independente de cliente.

### CA-011 — Pagamento integral e quitação
- **Requisitos:** RF-005, RF-007, RF-008; RN-004, RN-007; RNF-005.
- **Dado** HIP-003 aceita e venda demonstrativa sem entrada, com uma última parcela não paga e sem ambiguidade de saldo,
- **Quando** registrar uma vez o pagamento integral com data e forma permitidas,
- **Então** a parcela deve ficar Paga com os dados informados, saldo da venda zerado, situação Quitada, venda removida das abertas e incluída uma única vez em Quitadas, mantendo parcelas e atualizando os resumos correspondentes.

### CA-012 — Edição consistente
- **Requisitos:** RF-006; RN-006, RN-008.
- **Dado** PEN-008 resolvida ou HIP-002 aceita e uma venda elegível para a alteração,
- **Quando** editar um campo permitido e confirmar,
- **Então** detalhe, listagem e derivados afetados devem refletir a mesma versão, sem reescrever pagamentos existentes ou permitir mudanças financeiras ainda não autorizadas.

### CA-013 — Duplicidade e parcela já paga
- **Requisitos:** RF-007, RF-011; RN-008.
- **Dado** um pagamento válido em confirmação,
- **Quando** repetir o acionamento de confirmar e depois tentar pagar novamente a parcela liquidada,
- **Então** deve existir apenas um lançamento aceito e nenhum segundo recebimento para a parcela paga nesse fluxo, com ação indisponível ou explicação correspondente.

### CA-014 — Resumos e saldos consistentes
- **Requisitos:** RF-002, RF-008, RF-009, RF-010; RN-007, RN-010; RNF-005.
- **Dado** PEN-002 e PEN-009 resolvidas ou cenário sem entrada com universo/períodos explicitamente definidos para avaliação,
- **Quando** comparar detalhes, abertas, quitadas, Visão Geral e Relatórios antes e depois de uma mutação válida,
- **Então** saldos e recebimentos devem reconciliar em centavos sem duplicação; conjunto vazio deve produzir totais zerados e períodos devem estar identificados.

### CA-015 — Exportação somente ilustrativa
- **Requisito:** RF-010; RNF-010.
- **Dado** Relatórios aberto,
- **Quando** encontrar ou acionar Exportar relatório,
- **Então** seu caráter ilustrativo deve estar explícito, sem gerar arquivo, chamar serviço externo ou anunciar exportação concluída.

### CA-016 — Cancelamento sem alteração
- **Requisitos:** RF-004, RF-006, RF-007, RF-011; RN-008; RNF-002.
- **Dado** um cadastro, edição ou modal de pagamento com valores alterados mas não confirmados,
- **Quando** cancelar, inclusive por Escape no modal,
- **Então** registros, saldos e resumos devem permanecer como antes e o foco deve retornar ao acionador correspondente.

### CA-017 — Falha sem sucesso ou alteração parcial
- **Requisitos:** RF-004, RF-006, RF-007, RF-011; RN-008; RNF-005.
- **Dado** falha controlada no caminho de confirmação em ambiente de teste,
- **Quando** tentar cadastrar, editar ou registrar pagamento,
- **Então** deve aparecer falha compreensível, nenhum sucesso, dados anteriores intactos, entradas preservadas e possibilidade de nova tentativa sem estado de envio travado. Não é necessário expor um simulador de falhas ao usuário.

### CA-018 — Registro ausente e retorno
- **Requisitos:** RF-001, RF-005.
- **Dado** um acesso a identificador de venda inexistente na sessão,
- **Quando** abrir detalhes ou edição,
- **Então** deve aparecer indicação de registro não encontrado e caminho de volta para Vendas, sem inventar dados nem interromper a navegação.

### CA-019 — Combinação e interpretação da pesquisa
- **Requisito:** RF-003.
- **Dado** decisão registrada em PEN-005 sobre combinação de critérios, normalização de CPF/telefone e data exata ou período,
- **Quando** avaliar entradas equivalentes e critérios combinados previstos nessa decisão,
- **Então** os resultados devem seguir essa semântica, e entradas inválidas não devem receber interpretação silenciosa incompatível com a decisão.

### CA-020 — Limites de vencimento
- **Requisitos:** RF-005, RF-009; RN-003, RN-005, RN-006.
- **Dado** PEN-001 e PEN-004 resolvidas e data civil de referência identificada,
- **Quando** avaliar ontem, hoje, os limites da janela de sete dias, dia posterior à janela e meses com dia inexistente,
- **Então** vencimentos e situações devem seguir exatamente as decisões aprovadas, sem alteração por fuso, mantendo parcelas pagas como Paga independentemente da data.

### CA-021 — Isolamento da sessão
- **Requisito:** RF-011; RN-009; RNF-004, RNF-010.
- **Dado** aviso demonstrativo visível e uma alteração sintética aceita,
- **Quando** navegar entre módulos e depois recarregar a página,
- **Então** a navegação deve preservar a alteração apenas na sessão em memória e a recarga deve restaurar os dados iniciais, sem salvar registros no navegador/arquivo, transmitir dados pessoais ou exigir login.

### CA-022 — Configurações sem promessa indevida
- **Requisito:** RF-012; RNF-009.
- **Dado** o conteúdo mínimo de HIP-004 aceito para a FASE-003,
- **Quando** acessar Configurações pela navegação ou atalho,
- **Então** deve aparecer a página identificada, explicando dados fictícios, memória, descarte ao recarregar e ausência de uso operacional, sem opções fictícias de conta, integração ou persistência; os dois temas devem ser aplicados de forma consistente.

### CA-023 — Temas globais e recarga
- **Requisitos:** RNF-009; RF-001, RF-011, RF-012.
- **Dado** a estrutura navegável aberta em uma nova sessão,
- **Quando** alternar o tema por teclado, percorrer os destinos e recarregar,
- **Então** deve iniciar em escuro, comunicar o tema ativo e manter a escolha entre rotas; após recarga, deve voltar ao escuro, sem consultar ou gravar preferência persistente.

### Matriz de rastreabilidade

| Objetivo | Jornada | Requisito/regra | Fonte ou hipótese | Critérios de aceite |
| --- | --- | --- | --- | --- |
| OBJ-001, OBJ-005 | JOR-001, JOR-006 | RF-001; RNF-002, RNF-009 | FON-001, FON-002 | CA-001, CA-018 |
| OBJ-001 | JOR-001 | RF-002; RN-004, RN-010 | FON-001 | CA-002, CA-003, CA-014 |
| OBJ-001 | JOR-001 | RF-003 | FON-001, FON-003, FON-004 | CA-004, CA-005, CA-019 |
| OBJ-002 | JOR-002 | RF-004; RN-001, RN-002, RN-003, RN-006 | FON-001, FON-002, FON-003, FON-004, HIP-001 | CA-006 a CA-009, CA-016, CA-017 |
| OBJ-001, OBJ-003 | JOR-001, JOR-004 | RF-005; RN-005 | FON-001 | CA-010, CA-011, CA-018, CA-020 |
| OBJ-002 | JOR-003 | RF-006; RN-008 | FON-001, FON-002, HIP-002 | CA-012, CA-016, CA-017 |
| OBJ-003 | JOR-004 | RF-007; RN-007, RN-008 | FON-001, FON-002, FON-004, HIP-003 | CA-007, CA-011, CA-013, CA-016, CA-017 |
| OBJ-003 | JOR-004 | RF-008; RN-004 | FON-001 | CA-003, CA-011, CA-014 |
| OBJ-004 | JOR-005 | RF-009; RN-005, RN-010 | FON-001, HIP-005 | CA-014, CA-020 |
| OBJ-004 | JOR-005 | RF-010; RN-010 | FON-001 | CA-014, CA-015 |
| OBJ-002, OBJ-003, OBJ-005 | JOR-002, JOR-003, JOR-004, JOR-006 | RF-011; RN-008, RN-009 | FON-001, FON-002 | CA-007, CA-009, CA-013, CA-016, CA-017, CA-021 |
| OBJ-005 | JOR-006 | RF-012 | FON-001, HIP-004 | CA-001, CA-022 |
| OBJ-005 | JOR-006 | RNF-009; RF-001/011/012 | FON-007; PEN-006 resolvida documentalmente | CA-023 |

RNF-001 a RNF-005, RNF-009 e RNF-010 também são transversais aos cenários pertinentes. RNF-006 a RNF-008 têm métodos próprios na seção 9: medições e inspeções futuras, não resultados deste PRD.

## 12. Métricas de sucesso e plano de validação

Não há linha de base medida. As metas abaixo são sugestões para discussão, sem promessa de desempenho ou aprovação. Coleta manual em sessão de avaliação, sem telemetria ou integração.

| ID | Indicador | Método de coleta/avaliação | Referência atual | Meta e situação | Momento de avaliação |
| --- | --- | --- | --- | --- | --- |
| MET-001 | Localização da venda correta | Observar busca por dado informado e conferência entre nomes semelhantes; registrar conclusão, ajuda e tempo | Não medida; relatos divergem quanto à dificuldade de consulta | Proposta: ao menos 80% das tentativas sem ajuda e nenhuma confirmação de venda errada | Avaliação do fluxo de consulta |
| MET-002 | Cadastro correto e compreensão da prévia | Conferir campos, entrada, calendário e capacidade de corrigir erro antes de confirmar | Não medida; entrevista relata trabalho de conferência | Proposta: ao menos 80% das tentativas válidas concluídas sem ajuda, sem divergência financeira nos casos suportados | Após decisões críticas de parcelamento |
| MET-003 | Recebimento simulado correto | Observar escolha da parcela e conferência do saldo e da quitação | Não medida | Proposta: nenhuma baixa na venda/parcela errada e nenhuma duplicidade nas tarefas avaliadas | Avaliação do pagamento |
| MET-004 | Compreensão dos indicadores | Pedir explicação de saldo em aberto, atraso e recebido no mês, usando os registros sintéticos | Não medida | Proposta: ao menos 80% das respostas corretas segundo roteiro definido | Avaliação de Visão Geral e Relatórios |
| MET-005 | Navegação e reconhecimento dos limites | Percurso por teclado e pergunta sobre uso de dados reais e recarga | Não medida | Proposta: todos os participantes reconhecem a demonstração e a perda de alterações; nenhuma barreira impeditiva nas tarefas essenciais | Início e encerramento da sessão |

**Participantes previstos:** funcionários que cadastram/recebem e pessoa responsável pela gestão, convidados a confirmar. Quantidade, disponibilidade e consentimento para registrar observações dependem de PEN-014. Não apresentar avaliações com amostra pequena como prova estatística; registrar tentativas, participantes e contexto junto dos percentuais.

**Roteiro proposto:** explicar que nada é real; localizar uma venda entre nomes semelhantes; cadastrar venda simples sem entrada; corrigir campo inválido e cancelar uma edição; conferir prévia com entrada sem alegar recebimento; registrar pagamento integral de parcela elegível; conferir migração para Quitadas; interpretar resumos; navegar por teclado; recarregar e explicar o descarte. Casos de borda só entram no roteiro conclusivo após as decisões correspondentes.

**Evidências:** notas de observação, tempos manuais sem meta inicial, pedidos de ajuda, erros de seleção, compreensão dos valores e comentários sobre comparação com a planilha, sem copiar dados pessoais. Respostas reconstruídas das entrevistas devem ser confirmadas com os participantes antes de servirem como evidência definitiva.

**Condição proposta para aceitar ou revisar:** primeiro eliminar falhas de integridade, identificação e barreiras de acesso; depois discutir metas de conclusão e compreensão com as partes interessadas. Falha nesses pontos exige revisão, não compensação por aparência. Aprovação formal, critérios finais e responsáveis permanecem em PEN-014.

## 13. Dependências, riscos e mitigação

| ID | Risco ou dependência | Impacto | Probabilidade ou incerteza | Mitigação | Responsável, se confirmado |
| --- | --- | --- | --- | --- | --- |
| RIS-001 | Regras de entrada, centavos e calendário indefinidas | Prévia ou saldo incorreto, validação enganosa | Conhecidamente abertas; frequência de casos não medida | Resolver PEN-001 a PEN-003; demonstrar casos inequívocos e sinalizar limitações | Não confirmado |
| RIS-002 | Busca e classificação sem limites aprovados | Venda não encontrada ou vencimento classificado de forma indevida | PEN-004, PEN-005 e PEN-007 abertas | Registrar exemplos de borda e decisão antes do aceite conclusivo | Não confirmado |
| RIS-003 | Inferir problemas universais de entrevistas reconstruídas | Priorizar solução que não simplifica o trabalho | Limitação explícita das fontes | Confirmar relatos; comparar tarefas e observar cadastro e consulta separadamente | Não confirmado |
| RIS-004 | Confundir MVP com sistema operacional ou substituto da franquia | Uso de dados reais, perda de registros ou escopo excessivo | Não medida | Aviso persistente, dados sintéticos e exclusões explícitas; verificar compreensão | Não confirmado |
| RIS-005 | Alterar venda com pagamentos sem política definida | Histórico reescrito e divergência de saldos | Regra aberta | PEN-008 e restrição proposta em HIP-002 | Não confirmado |
| RIS-006 | Divergência histórica sobre temas | Retrabalho visual e aprovação ambígua | Conciliação documental realizada em 13/11/2026 | Manter PRD/TDD/SDD alinhados e verificar CA-023; implementação ainda ausente | Solicitante confirmou a direção, sem aceite da ótica |
| RIS-007 | Protótipo mais trabalhoso que a planilha | Baixa aceitação e mais tempo de atendimento | Preocupação expressa em FON-004, sem medição | Observar tarefas reais representadas por dados sintéticos, não apenas preferência estética | Não confirmado |
| RIS-008 | Ambiente e estrutura incompletos interpretados como implementação | Planejamento baseado em entrega inexistente | Há pastas e saídas sem código verificável | Separar inspeção atual de planejamento; definir ambiente antes de implementar | Não confirmado |
| RIS-009 | Resumos fixos divergem das mutações locais | Demonstração perde credibilidade | Não medida | Fonte comum e comparação em centavos após cadastro, edição e pagamento | Não confirmado |

## 14. Hipóteses, pendências e decisões necessárias

### Hipóteses propostas, não regras confirmadas

| ID | Hipótese | Impacto no produto | Como validar ou decidir | Situação |
| --- | --- | --- | --- | --- |
| HIP-001 | Permitir roteiro parcial com casos inequívocos e bloquear confirmação quando calendário, centavos ou entrada exigirem decisão ausente | Permite demonstração sem impor política financeira, mas reduz cobertura | Validar restrição com solicitante e equipe; depois substituir pela decisão de domínio | Proposta, não aprovada |
| HIP-002 | Até definir edição, não permitir alterações financeiras que reescrevam parcelas pagas; limitar correções ao que preserve histórico | Reduz risco, mas pode restringir tarefa esperada | Discutir exemplos de correção com a equipe e resolver PEN-008 | Proposta, não aprovada |
| HIP-003 | Primeiro roteiro de pagamento contempla apenas quitação integral de uma parcela elegível, sem entrada | Valida interação sem inventar parcialidade, excedente ou conciliação | Confirmar recorte e formas demonstrativas em PEN-011 | Proposta, não aprovada |
| HIP-004 | Configurações explica limites da demonstração, sem controles fictícios | Mantém página navegável sem inventar configurações | Conteúdo confirmado pelo solicitante para FASE-003; verificar CA-022 | Aceita para esse recorte em 13/11/2026, não implementada |
| HIP-005 | Usar a data civil local da sessão como referência exibida para mês corrente e vencimentos, com dados sintéticos adequados a ela | Facilita demonstração atualizada; exige consistência do conjunto | Confirmar referência fixa ou dinâmica em PEN-009 | Proposta, não aprovada |
| HIP-006 | Resposta local em até 300 ms com 15 vendas e metas de tarefas da seção 12 são adequadas para a avaliação inicial | Define critérios provisórios de desempenho e usabilidade | Medir no ambiente escolhido e negociar metas com participantes | Proposta, não medida |

### Pendências e conflitos

| ID | Dúvida ou conflito | Impacto no produto | Como validar ou decidir | Situação |
| --- | --- | --- | --- | --- |
| PEN-001 | Como vencer em mês sem o dia da venda? | Bloqueia regra completa de calendário, inclusive venda no dia 31 | Solicitar exemplos e decisão explícita; não ajustar automaticamente | Aberta; crítica para casos afetados |
| PEN-002 | Como registrar entrada e exibi-la em total pago, saldo e recebimentos? Entrada exige data e forma? | Bloqueia confirmação completa de venda com entrada e respectivos resumos | Validar fluxo e exemplos reconciliados, distinguindo entrada de parcela | Aberta; crítica financeira |
| PEN-003 | Como distribuir diferenças de centavos? | Bloqueia parcelamentos não divisíveis exatamente | Aprovar exemplos com soma preservada em centavos | Aberta; crítica para casos afetados |
| PEN-004 | Quais limites inclusivos da janela de sete dias e qual situação no vencimento hoje? | Afeta parcelas, próximos pagamentos e atrasos | Aprovar tabela de datas relativa à referência, incluindo bordas | Aberta; crítica de classificação |
| PEN-005 | Como combinar critérios e pesquisar data: dia exato ou período? Como normalizar acentos, CPF e telefone? | Bloqueia semântica conclusiva de busca | Validar exemplos positivos, negativos e entradas formatadas | Aberta; crítica do fluxo de consulta |
| PEN-006 | Divergência histórica claro versus dois temas | Direção visual e alternância | Solicitante confirmou claro/escuro, escuro inicial e memória; PRD conciliado com TDD nesta revisão | Resolvida documentalmente em 13/11/2026; implementação e verificação pendentes |
| PEN-007 | Quais situações gerais de vendas não quitadas e como agregá-las? | Impede rotular venda como atrasada/próxima por inferência | Confirmar nomes e regras, ou rótulo provisório explicitamente demonstrativo | Aberta; não inferir agregação |
| PEN-008 | Quais campos podem ser editados antes/depois de pagamentos e como tratar repercussões? | Bloqueia edição financeira completa | Validar cenários de correção e preservação de histórico | Aberta; crítica para RF-006 completo |
| PEN-009 | Qual data de referência, definição dos períodos, universo dos resumos e efeito de filtros? “Vendas cadastradas” inclui quitadas? | Afeta consistência e interpretação dos indicadores | Aprovar exemplos e rótulos explícitos, sem escolher silenciosamente | Aberta; crítica para números conclusivos |
| PEN-010 | Quais validações de CPF/telefone e limites demonstrativos de valores, entrada e quantidade? | Afeta cadastro e envio inválido | Separar formato obrigatório de regra comercial; não presumir CPF único ou limite da loja | Aberta; detalhamento necessário antes de implementação |
| PEN-011 | Pagamento parcial/excedente, antecipação, datas e formas aceitas entram na demonstração? | Afeta elegibilidade e cálculo de saldo | Validar recorte HIP-003 e cenários aceitos, sem implementar estorno por inferência | Aberta; crítica para ampliar recebimento |
| PEN-012 | Conteúdos em Configurações e filtros em Quitadas | Afeta telas secundárias | HIP-004 aceita para página explicativa na FASE-003; filtros de Quitadas e outros controles não definidos | Parcialmente resolvida em 13/11/2026; filtros continuam abertos e fora da FASE-003 |
| PEN-013 | Qual ambiente de avaliação, navegador e dimensões mínimas? | Impede afirmar compatibilidade e desempenho medidos | Definir computador/navegador e executar roteiro proposto | Aberta; não bloqueia rascunho |
| PEN-014 | Quem participa, aprova e quais metas finais? Quais trechos reconstruídos serão confirmados? | Impede alegar validação ou aprovação formal | Agendar avaliação sem prazo inventado e registrar decisões e evidências | Aberta; crítica para aprovação |

**Decisões confirmadas e seus limites:** nome Mercadão dos Óculos - Vendas em Aberto, quatro módulos, dados do cliente no cadastro da venda, parcelas no detalhe e Quitadas dentro de Vendas vêm de FON-001. O limite de memória e a arquitetura futura vêm de FON-002. A tarefa atual é exclusivamente documentação (FON-006). Essas decisões não confirmam hipóteses, regras pendentes, aprovação da loja ou conclusão de desenvolvimento.

Nenhuma pendência impede salvar este rascunho. As pendências críticas impedem aprovar o comportamento completo afetado ou implementá-lo por suposição; a geração deste documento não é autorização para iniciar implementação.

## 15. Entregas e próximos passos

1. **PRD disponível para discussão:** este documento preenchido, com fontes, critérios e limites. Conclusão documental não equivale a aceite do produto.
2. **Decisões de produto registradas:** resolver conflitos e regras críticas com exemplos, incluindo calendário, entrada, centavos, busca, situações e edição; validar ou rejeitar hipóteses. Depende da equipe e do solicitante, sem responsáveis ou datas presumidos.
3. **PRD revisado e validado:** registrar decisões, preservar IDs, atualizar critérios condicionais e obter definição de aprovadores e metas. Alterações de README, entrevistas e OpenSpec exigem tarefa própria, não fazem parte desta entrega.
4. **Planejamento posterior de implementação:** somente mediante solicitação explícita, delimitar a mudança de frontend, ambiente, versões e sequência de entrega; não incluir infraestrutura futura por conveniência.
5. **Implementação e avaliação futuras:** mediante autorização, construir o MVP, executar verificações de código e interface e realizar sessões com dados sintéticos. Registrar resultados reais separadamente das metas propostas.

Na revisão inicial, este PRD foi uma entrega independente, sem alterações em código ou outros artefatos. A revisão 1.1 integra o planejamento da mudança `fase-003`, com atualização do TDD e criação de artefatos OpenSpec separadamente. Não instala dependências, não implementa o produto e não reexecuta testes de aplicação ou build. A validação documental da mudança será registrada em seus artefatos, sem extrapolar as evidências anteriores da base.

## 16. Glossário e histórico de revisões

| Termo | Definição neste documento |
| --- | --- |
| MVP visual / protótipo | Demonstração navegável para avaliar interface e fluxos, sem capacidade operacional de produção |
| Venda em aberto | Venda com valor ainda a liquidar; não significa necessariamente atraso |
| Quitada | Venda totalmente paga, consultada em página interna de Vendas |
| Parcela Paga | Parcela liquidada que permanece visível no detalhe da venda |
| Próximos dias | Situação de parcela associada a janela de sete dias, com limites ainda pendentes |
| Entrada | Valor descontado antes da divisão do restante; sua contabilização como pagamento não foi definida |
| Saldo devedor | Valor restante da venda; interpretação com entrada depende de decisão explícita |
| Fonte demonstrativa | Dados sintéticos e operações locais compartilhados pelas telas, fora dos componentes de apresentação |
| Confirmado por fonte | Conteúdo documentado em referência local; não indica aprovação, teste ou implementação |
| Hipótese | Proposta necessária à discussão, ainda sem confirmação |
| Pendência | Questão que precisa de decisão antes de concluir o comportamento afetado |

| Versão | Data | Alteração | Motivo |
| --- | --- | --- | --- |
| 1.0 | 11/11/2026 | Criação do PRD com IDs iniciais, fontes locais, escopo, jornadas, requisitos, aceite, hipóteses e pendências | Atender à solicitação de transformar o README em documento de produto sem implementar código |
| 1.1 | 13/11/2026 | Conciliação de PEN-006, aceite delimitado de HIP-004/PEN-012, CA-023 e recorte da FASE-003; atualização do estado da base | Confirmações do solicitante na exploração e no planejamento; sem implementação ou aceite da ótica |
