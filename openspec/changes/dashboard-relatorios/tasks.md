# Tasks

PRD/FON-018/RF-017/CA-039, TDD/DEC-029, `proposal.md`, delta e `design.md`. **Planejamento apenas:** a Change `feedback-luighi` e seus contratos não estão integrados nesta branch. Nenhum item foi aplicado.

## 1. Pré-condição e reconciliação antes do apply

- [ ] 1.1 Conferir merge real de `feedback-luighi` e seus critérios na `main`, atualizar esta branch para a `main` integrada sem descartar trabalho e verificar que status, seções de Prejuízo, identificação e valores efetivos existem; se não existirem, manter apply bloqueado (D1; CA-038/039).
- [ ] 1.2 Comparar PRD/TDD/delta com o código e a spec principal integrada, ajustar primeiro os artefatos afetados se houver divergência e executar `openspec validate dashboard-relatorios --strict`; documentar referências/resultado real antes de qualquer mudança de código (D1; CA-039).

## 2. Projeções contextuais do dashboard

- [ ] 2.1 Derivar cinco valores dos relatórios integrados sem repetir regras financeiras, e séries por data efetiva de recebimentos no mês, comparação saldo Ativo/Prejuízo elegível e vencidas Ativas por vencimento na referência; testar centavos, bordas, data corrigida, entrada, Inativas/Prejuízo e vencidas de meses anteriores com igualdade aos totais das tabelas (D2; CA-039).
- [ ] 2.2 Derivar resumos de cobrança com cliente, CPF, telefone, primeiro vencimento, valor/situação e ID sem cortar a coleção detalhada; testar nomes similares, múltiplas parcelas por venda, ID íntegro, empates e estados vazios, registrando verificações em `frontend/README.md` (D2; CA-039).

## 3. Cartões e gráficos acessíveis

- [ ] 3.1 Apresentar cinco cartões contextuais com rótulos “no mês”/“na referência”, sem copiar a faixa global da Visão Geral; testar valores, atualizações após pagamento/status, estados vazios, dois temas e viewports e documentar resultados (D3; CA-039).
- [ ] 3.2 Apresentar três gráficos com título, unidade/legenda, rótulos e tabela/texto equivalente, sem manipulação exclusiva por ponteiro; testar leitura por teclado, vazio, contraste, tela estreita e reconciliação de cada categoria com dados detalhados, registrando observações em `frontend/README.md` (D3; CA-039).

## 4. Cobrança e acesso integral aos detalhes

- [ ] 4.1 Integrar resumos por cliente e links para a venda correta, mantendo as cinco tabelas integrais na mesma aba abaixo ou em expansão acessível; testar foco, estado da expansão, rolagem contida, linhas de prejuízo não somadas, dados sem truncamento e vazio por seção nos dois temas/viewports; documentar evidências (D3; CA-039).

## 5. Regressão e conclusão da Change

- [ ] 5.1 Executar testes unitários/componentes, E2E da aplicação e fixture aplicável, builds, formatação e `openspec validate dashboard-relatorios --strict`; registrar comandos, resultados, avisos e limites reais sem alegar verificação não executada (CA-039).
- [ ] 5.2 Inspecionar cenário integrado em 1366×768 e 390×844 nos temas claro/escuro, foco/teclado, equivalentes textuais, contraste e zoom nativo 200% quando verificável; conciliar PRD/TDD/SDD e tarefas com evidências reais, conferir diff restrito à Change sem reivindicar aceite da ótica ou merge (CA-039).

## Workflow follow-up

- Fazer commits por funcionalidade com seus testes/documentação na branch `feature/dashboard-relatorios` somente após a pré-condição para o apply; nunca antecipar trabalho da Change `feedback-luighi`.
- Abrir um PR independente para a `main` apenas após concluir todas as tarefas autorizadas e verificações aplicáveis, usando `.github/pull_request_template.md`; não abrir PR por planejamento parcial.
- Sincronizar/arquivar a Change no fluxo apropriado após implementação/revisão; mesclar somente com autorização explícita do usuário.
