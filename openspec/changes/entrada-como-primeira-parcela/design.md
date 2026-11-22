# Design

## Context

Motivação e fronteiras comportamentais em `proposal.md` e nas seis deltas. Reutilizar
PRD 1.17 e TDD 1.21/DEC-026 (registro central das decisões), FASE-010 a FASE-013.
Esta é uma mudança de modelo financeiro e consumidores, não apenas template.

Inspeção read-only da base integrada pelo PR #20:

- `venda.validacoes.ts` prepara N futuras a partir do saldo e `recebimentos: []`.
- `venda.calculos.ts` reconstitui cadastro na validação, valida alocações em ordem,
  soma entrada à parte para pago/período e conta pagas só pelas alocações.
- `parcela.calculos.ts` deriva pagamento dos recebimentos; reutilizá-lo para entrada.
- `dados-demonstrativos.ts` prepara vendas e paga prefixos por slices; esses slices
  não podem passar a incluir a entrada já liquidada.
- `rascunhos.ts` usa `temEntrada:boolean`, inicialmente false. O componente valida
  campos financeiros/identificação, mas não a decisão booleana.
- Cadastro usa Signal Forms e prévia sem reserva de ID, com grade lateral em 768 px.
- `relatorios.calculos.ts` cria uma linha a partir de entrada e outras dos lotes.

As specs principais ainda contêm regras históricas da entrada separada e parte do
visual anterior. A Change visual mesclada, ainda não sincronizada, também contém
“entrada separada”. Esta Change substitui esse contrato financeiro, não reverte
layout, controles de consulta, aviso removido ou tipografia. Não editar artefatos
anteriores, sincronizar ou arquivar durante este planejamento. Em sincronização
futura, aplicar o histórico visual antes desta decisão e reconciliar trechos de
entrada para não reintroduzir a regra antiga por ordem de archive.

## Goals / Non-Goals

**Goals:**
- Um agregado consistente para prévia, cadastro, seed, recebimento e consultas.
- Reutilizar pagamentos alocados, funções puras e publicação atômica existentes.
- Manter contagens coerentes com a nova semântica sem duplicar valores ou estado.

**Non-Goals:**
- Dependências novas, persistência, migração de sessão aberta, APIs, juros, parcialidade,
  estorno, alteração financeira pela edição ou cadastro integralmente quitado.
- Refatoração geral, redesenho de edição/modal/lateral ou sync/archive de outras Changes.
- Implementação e execução de testes de aplicação nesta entrega documental.

## Decisions

### D1 — Recebimento alocado como única origem financeira (DEC-026)

Escolha confirmada no Harness: entrada é parcela 1 com recebimento integral, data
e forma da venda. Conservar `Venda.entrada` como metadado para resumo e
identificação; o validador exige igualdade de valor/data/forma com o recebimento
exclusivo da primeira parcela. Não criar campo de situação persistida.

Preparar entrada, futuras e recebimento juntos em `prepararCadastro`, sem publicar
ou chamar `registrarPagamento` em segunda operação. Na prévia, os mesmos objetos
e projeções são locais. No serviço, uma confirmação aceita continua consumindo
somente um ID de operação, após validação completa; entrada não incrementa o contador
separadamente. `projetarParcela` identifica a entrada Paga como qualquer alocação.

Total pago e recebidos por período passam a somar somente `recebimentos`; não somar
entrada nem alocações novamente. `validarVenda` reconstitui o parcelamento para
comparar estrutura, valida o recebimento inicial e depois a sequência dos lotes,
rejeitando ausência/duplicidade/inconsistência da entrada, recebimento parcial,
saltos e metadado órfão. Sem entrada, não inventar recebimento ou vínculo.

Alternativas: “marcar como paga” só no template perde rastreabilidade e permite
duplicidade; contar entrada separada nas projeções exige exceções por toda a
aplicação. Ambas rejeitadas em favor do modelo alocado já existente. A duplicação
de metadados é aceita, com validação cruzada obrigatória e sem segunda contabilidade.

### D2 — N total, M futuras e IDs opacos (DEC-026)

Validar N como inteiro seguro; com entrada M=N−1≥1, sem entrada M=N≥1. Validar M
contra saldo em centavos e calendário antes de gerar coleções. Dividir saldo por M
usando aritmética inteira existente; resto somente nas primeiras futuras. Entrada
vence no dia da venda; futuras nos meses 1 a M, preservando o dia-base.

Usar namespaces determinísticos sem colisão para entrada, por exemplo
`<vendaId>/parcela/entrada` e `<vendaId>/recebimento/entrada`. Preservar IDs das
futuras geradas anteriormente (`<vendaId>/parcela/1`, etc.), incrementando apenas
seu número exibido quando houver entrada. ID é opaco, não número de parcela.
Não extrair número de sufixo de ID em nenhum consumidor.

Alternativa de renumerar também IDs e reconstruir todos os vínculos aumenta risco
sem benefício funcional. IDs de venda e lotes existentes ficam estáveis; alocações
continuam referindo as mesmas futuras. Validar unicidade global como hoje.

### D3 — Seed uniforme sem migração persistida (DEC-026)

Manter a quantidade histórica K de futuras do seed e seus critérios por calendário;
passar K+1 ao cadastro com entrada ou K sem entrada. Pagamentos sintéticos usam o
prefixo de futuras pendentes, não `slice` incluindo entrada. O recebimento inicial
de entrada precede os históricos, que preservam valores, datas, formas e vínculos.
Assim, quantidade total/paga cresce uma unidade nas vendas com entrada, mas pago,
saldo, recebido no período, vencimentos pendentes e situações não mudam.

Atualizar fixtures normais, vazias, 0/1/10/11/21 e detalhe 1/10/11 parcelas conforme
seu propósito: cenários de densidade contam a entrada entre as linhas totais, não
somam uma décima primeira linha escondida ao cenário de dez. Nas bordas 0001–9999,
preservar referência/12 vendas/situações possíveis e gerar até quatro futuras mais
entrada, sem forçar quatro meses indisponíveis ou mudar datas pendentes.

Alternativa “só novos cadastros” foi rejeitada pelo solicitante; não manter dois
formatos financeiros em paralelo. Recarga recria o novo seed, sem migrador de storage.

### D4 — Triestado explícito e validação alcançável (DEC-026)

Rascunho proposto: `temEntrada: '' | 'sim' | 'nao'`, com vazio inicial. Select
nativo com id atual `tem-entrada`, rótulo “Possui Entrada” e os textos exatos do PRD.
Evitar truthiness: só `=== 'sim'` revela os campos e prepara entrada; só
`=== 'nao'` permite comando com `entrada:null`; vazio/desconhecido é inválido.

Adicionar erro do campo à conversão e à validação Signal Forms. Reutilizar
`ErroCampo`, `aria-describedby`, `submit`/`onInvalid` e foco no primeiro erro. O
campo fica no início de Dados da venda, antes de data/total/quantidade no DOM e na
tela; manter a identificação do cliente antes desse grupo. Validar N/M de forma
igual ao núcleo e não ajustar a quantidade informada automaticamente.

Preservar valor/forma ao mudar para Não, ocultando e ignorando validações/valores
inativos; voltar a Sim restaura e revalida. O comando interno continua com entrada
nula/objeto; ausência de decisão é condição da interface, não um boolean default.
Alternativas de checkbox ou select inicialmente Não violam a escolha obrigatória.
Não migrar de Signal Forms nem instalar biblioteca. Consulta FON-028 fundamenta
o padrão, mas compatibilidade do select com o patch instalado exige teste local.

### D5 — Prévia e consumidores sem exceção visual de pagamento (DEC-025/026)

Projetar a venda preparada localmente com a referência da sessão. Adicionar
Situação à prévia e identificar “Entrada” na linha 1, mantendo os nomes existentes
de situação (Paga, Aberto, Próximos dias, Atrasado), por texto além de cor. A prévia
deixa claro que nenhuma venda foi criada; Paga representa o resultado previsto da
entrada no futuro cadastro, não recebimento efetivado antes de confirmar.

Listas e detalhe consomem contagens da mesma projeção, sem `+1` artificial no
template. Detalhe identifica entrada na primeira parcela e mantém dados financeiros
e temporais completos; resumo existente pode permanecer, sem segunda linha de cobrança.
Recebimento filtra Paga e começa na primeira pendente; testar envio direto de ID
da entrada e seleção obsoleta. Edição permanece só nome/CPF/telefone/descrição.

Relatórios itera recebimentos uma vez; reconhece a origem Entrada pelo vínculo
exclusivo da parcela 1 e os demais como Lote, preservando período, totais e ordem
estável (entrada antes dos lotes na mesma venda). Não gera linha pelo metadado.
Visão Geral continua derivada do mesmo resumo; a entrada nunca integra pendentes,
próximos dias ou atrasos. Sem novos indicadores ou análises.

Preservar duas colunas em md, empilhamento abaixo, fontes, temas, foco e regiões
roláveis. Testar 1366×768, 390×844, 767/768 px e zoom nativo 200% sem substituí-lo
por CSS zoom ou viewport reduzido. Registrar ambiente e cobertura reais; falta de
evidência é pendência, não aprovação reaproveitada do PR #20.

## Risks / Trade-offs

- [Dupla contagem] → pago/período/relatório somam recebimentos somente; testes de
  igualdade e desigualdade da entrada, lote posterior e reconciliação entre telas.
- [Histórico inválido aceito] → validar ausência, duplicidade e divergência do
  recebimento da entrada e rejeitar atomicamente agregado ou comando inválido.
- [Seed quebra com slice] → selecionar futuras pendentes e comparar com o contrato
  financeiro/temporal anterior nas mesmas referências, inclusive extremas.
- [Mudança de ID altera histórico] → IDs opacos estáveis e numeração separada;
  testar vínculos, round-trip de venda e unicidade.
- [Texto antigo reintroduzido por archive] → registrar precedência desta regra e
  revisar a ordem de sincronização em fluxo futuro próprio, sem tocar outras Changes.
- [Select aparenta Não quando vazio] → validação explícita das três opções; testes
  de envio, erro/foco, troca de opção e valores ocultos; não usar coerção booleana.

## Migration Plan

1. Após revisão e autorização nova de apply, executar FASE-010 com domínio,
   projeções/relatório e testes coerentes; não publicar versão híbrida.
2. Adaptar seed/fixtures em FASE-011 e consumidores em FASE-012, com commits
   individuais por funcionalidade e verificação aplicável, na mesma branch.
3. FASE-013 executa regressão completa e registra resultados reais em
   `frontend/README.md`. Verificar unitários, E2E aplicação/fixture, dois builds,
   formatação, OpenSpec estrito, teclado/contraste/zoom e revisão do diff.
4. Abrir PR único somente após concluir a Change; merge exige autorização.
   Sync/archive exigem fluxo próprio e não integram este pedido documental.

Não há migração de banco/storage. Atualização e recarga criam nova sessão; rollback
futuro deve ser uma revisão explícita do conjunto domínio+seed+UI/testes, nunca
mistura das duas semânticas ou descarte de trabalho alheio. Nenhum rollback executado.

## Open Questions

Nenhuma decisão bloqueante restante para o recorte. PEN-013/014/HIP-006 do PRD
permanecem globais e não resolvidas por este planejamento. Ambiente/cobertura da
verificação futura devem ser registrados no apply, não inventados agora.

## Planning Verification

Revisados o PRD, TDD, código pertinente e requisitos/cenários das seis capacidades;
conferidas rastreabilidade, fórmulas dos dois exemplos e preservação do histórico.
`openspec validate entrada-como-primeira-parcela --strict` e `git diff --check`
passaram nesta preparação documental; status reporta os quatro artefatos de
planejamento completos, não implementação. As 14 tarefas permanecem desmarcadas.
Não executados build, unitários, E2E, medição visual, zoom ou renderização Mermaid
para esta nova Change; resultados do PR #20 são anteriores, não novos testes.
