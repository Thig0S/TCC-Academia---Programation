# Tasks

Estas tarefas são planejamento, não autorização de implementação. Executar somente após revisão dos artefatos e pedido explícito de apply. Referências: `proposal.md`, `design.md` (D1–D5, RD-01–RD-05), delta `specs/temas-visuais/spec.md`, PRD e TDD citados nesses documentos. Nenhuma tarefa foi executada por esta proposta.

Cada funcionalidade deve incluir testes afetados, evidências e atualização de `frontend/README.md` no mesmo commit, com mensagem de tipo e descrição objetiva em português. Preservar a lateral e os contratos compactos em todos os grupos; não abrir PR entre funcionalidades.

## 1. Linha de base reproduzível — RD-01

- [x] 1.1 Capturar antes de editar todas as páginas enumeradas em D5, modal e estados auxiliares, com dados sintéticos e referência controlados, nos dois temas em 1366×768 e 390×844; verificar que cada captura registra rota, tema confirmado após renderização, viewport e cenário, incluindo detalhe/edição ausentes.
- [x] 1.2 Registrar em `frontend/README.md` a matriz de cobertura, medições iniciais de densidade/overflow e comparação da lateral; verificar que separa evidência reproduzível da inspeção exploratória desta proposta e referencia CA-028/031/032, sem alegar aceite.

## 2. Padrões comuns e listas — RD-02

- [x] 2.1 Harmonizar ações existentes e espaçamentos de cabeçalho/conteúdo sem alterar fonte global ou lateral; resolver classes concorrentes de Nova venda e verificar estilos computados, contraste normal/hover/foco e acesso por teclado nos dois temas, com testes de componentes/E2E pertinentes e resultados documentados.
- [x] 2.2 Unificar alinhamento de contagem, pesquisa e paginação entre Vendas/Quitadas e alinhar cabeçalhos/valores monetários à direita com algarismos tabulares em `tabela-vendas.html`; verificar testes de busca/filtros/paginação e fonte 18 px, line-height 20 px e padding contratado, documentando capturas e resultados da funcionalidade.
- [x] 2.3 Estender a fixture de paginação para comprovar dez vendas/paginação visíveis, casos 0/1/10/11/21 e valores de magnitudes diferentes nos dois temas; verificar ausência de overflow global, rolagem contida, lateral equivalente e CA-027/028, registrando evidências antes do commit da consulta.

## 3. Detalhe e resultados da operação — RD-02

- [x] 3.1 Refinar hierarquia de dados/saldo, ação de receber e mensagens existentes do detalhe; alinhar coluna monetária das parcelas sem remover dados ou refatorar amplamente o CSS compacto; verificar foco/contraste, entrada como parcela 1, situações, quitada sem receber e resultados com os testes afetados, documentando a entrega.
- [x] 3.2 Verificar a composição com até dez parcelas e excedente, descrição/nome extensos e estado de venda ausente; estender E2E/fixture para comprovar CA-028, rolagem interna acessível e valores preservados nos dois temas, com capturas e medições em `frontend/README.md` antes do commit do detalhe.

## 4. Cadastro e prévia — RD-03

- [x] 4.1 Refinar espaços entre identificação/dados financeiros/prévia/ações e alinhar cabeçalhos/valores monetários da prévia, mantendo sua tipografia própria; verificar duas colunas a partir de 768 px e empilhamento em 767 px, proporcionalidade dos campos, erros e ausência de overflow nos dois temas; incluir testes e evidências no commit do cadastro.
- [x] 4.2 Padronizar apresentação das mensagens e ações de cadastro sem mudar bindings ou validação; verificar erro da escolha obrigatória de entrada, Sim/Não e preservação do rascunho, prévia completa válida/inválida, parcela 1 paga, cancelamento, falha/retry e confirmação única com testes de formulário/E2E existentes e documentar resultados antes de concluir a funcionalidade.

## 5. Edição e recebimento — RD-03

- [x] 5.1 Refinar formulário de edição e mensagens com o padrão comum, preservando somente os quatro campos do cliente; verificar dados iniciais, erros, cancelar, falhar/repetir e sucesso sem alteração financeira, incluindo testes de componentes/E2E, capturas e documentação no commit da edição.
- [x] 5.2 Refinar conferência, campos, mensagens e ações do modal de recebimento sem mudar a seleção sequencial; verificar valor/soma, primeira pendente, quitação, envio duplicado, erro/retry, Escape, Tab/Shift+Tab e retorno de foco, com testes afetados e resultados documentados no commit do recebimento.
- [x] 5.3 Confirmar edição e modal nos dois temas, incluindo textos extensos, erro e indisponibilidade dos controles, em 390, 767, 768, 1024 e 1366 px; verificar controles e mensagens alcançáveis, contraste e rolagem sem overflow global, registrando evidência antes de concluir esses fluxos.

## 6. Visão Geral e Relatórios — RD-04

- [x] 6.1 Refinar hierarquia/espaçamento entre indicadores e resumos da Visão Geral; verificar quatro indicadores e três resumos com referências, limites de cinco, ordem, links, vazios e valores preservados, nos dois temas, com testes E2E/componentes e documentação no commit da Visão Geral.
- [x] 6.2 Harmonizar ritmo entre período, títulos, captions, totais e quatro seções de Relatórios; alinhar colunas monetárias à direita com algarismos tabulares sem alterar fonte/padding; verificar totais, períodos, ordem, links, vazios, rolagem contida e exportação indisponível, com testes de estilo/funcionais, capturas e documentação no commit de Relatórios.

## 7. Configurações e estados auxiliares — RD-04

- [x] 7.1 Refinar leitura/recuos das quatro explicações de Configurações sem controles novos; verificar temas, conteúdo demonstrativo completo, contraste, teclado e ausência de aviso global com testes pertinentes, capturas e resultados documentados no commit da funcionalidade.
- [x] 7.2 Harmonizar página inexistente, detalhe/edição ausentes, coleções vazias e busca sem resultados, sem unificar seus significados ou inventar dados; verificar mensagens e retornos existentes nos dois temas, nomes extensos e foco por E2E/componentes e registrar capturas e resultado no commit dos estados auxiliares.

## 8. Verificação integrada e entrega — RD-05

- [x] 8.1 Concluir comparação antes/depois de todos os destinos/modal e estados da matriz D5 nos dois temas; verificar que toda superfície recebeu melhoria ou justificativa de preservação, lateral equivalente, foco/contraste e movimento reduzido, sem remover dados, marca ou controles funcionais; documentar diferenças intencionais.
- [x] 8.2 Executar a matriz responsiva integrada de D5 com textos extensos e valores grandes em fixtures, confirmar limites 767/768, dez linhas/dez parcelas no desktop e regiões roláveis; verificar ausência de corte/sobreposição e overflow horizontal da página em 390, 767, 768, 1024 e 1366 px, registrando medidas reais por cenário/tema.
- [ ] 8.3 Verificar manualmente zoom nativo de 200% em todos os destinos e modal nos dois temas; registrar navegador/versão, viewport útil, alcance de campos/ações/mensagens e limitações. Se não for possível, manter a tarefa aberta e informar bloqueio, sem substituir por CSS zoom ou concluir o escopo.
- [ ] 8.4 Executar em `frontend/` os comandos de regressão de D5: unitários sem watch, build da aplicação, build da fixture, E2E da aplicação, E2E da fixture e `format:check`; verificar também consulta → cadastro com entrada → edição → recebimento/quitação → resumos → recarga, registrar resultados/avisos reais e corrigir regressões sem mudar budgets ou enfraquecer contratos.
- [ ] 8.5 Revisar rastreabilidade PRD → TDD reutilizados → SDD, marcar somente tarefas comprovadas e executar `openspec validate refinar-design --strict`; verificar que documentação final distingue entrega, limitações, verificações não executadas e ausência de aceite da ótica, e que o diff não contém alterações financeiras, dependências ou trabalho alheio.

## Workflow follow-up

- Somente após apply autorizado e conclusão integral, publicar a feature branch e abrir um único PR para `main`, usando `.github/pull_request_template.md` e evidências/referências da Change; não abrir PR apenas pelos artefatos prontos.
- Sincronizar/arquivar a Change no fluxo pertinente após conclusão e revisão, preservando seus artefatos e resultados; não executar essas operações nesta proposta.
- Mesclar somente com autorização explícita e requisitos de revisão atendidos; confirmar estado do PR e presença na `main` antes de informar integração concluída.
