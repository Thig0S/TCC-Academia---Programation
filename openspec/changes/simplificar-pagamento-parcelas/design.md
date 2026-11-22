# Design

## Context

Motivação em `proposal.md` — Why. Base: PRD 1.19/FON-016, RF-005/007,
RN-016 e CA-011/013/014/016/017/024/028; TDD 1.23, DEC-027 e FASE-014 a FASE-016.
Produto confirmado na exploração; escolhas técnicas deste desenho são propostas
para revisão. Autorização atual somente documental, sem implementação.

Inspeção atual encontrou:

- `vendas/detalhes-venda` tem Receber geral, estado booleano de abertura e foco
  restaurado no botão geral ou no título das parcelas.
- `parcelas/registrar-pagamento` captura prefixo de pendentes ao abrir; rascunho
  tem quantidade, valor, data e forma; Signal Forms valida o conversor.
- `vendas/formulario-venda/rascunhos.ts` converte quantidade/valor/IDs para
  `ComandoPagamento`, hoje composto por vendaId, parcelaIds, valorCentavos, data e forma.
- `ServicoDemonstracao.registrarPagamento` usa `PreparadorRecebimento` e publica
  agregado imutável uma vez; `pagamento.validacoes.ts` valida prefixo, soma e datas.
- O seed chama a preparação pura de lotes para histórico sintético. Entrada já é
  parcela 1 paga; o histórico mantém coleção de alocações por recebimento.
- Testes de modal e E2E de formulários, matriz responsiva, refinamento e fluxo
  integrado dependem dos campos/botão a remover. `frontend/package.json` e
  `angular.json` têm scripts e alvos de build/teste da app e fixture.

Não há necessidade de dependências, novas rotas ou alteração da referência.
As deltas são contratos observáveis; os caminhos de implementação abaixo são
relativos a `frontend/src/app/`, não APIs externas.

As deltas preservam os nomes históricos de requisitos e cenários como
identificadores exigidos pelo OpenSpec para não perder rastreabilidade. Títulos
que ainda mencionam lote ou “uma ou mais” não autorizam esse comportamento em
novos pagamentos: seus textos e critérios foram atualizados para uma parcela por
confirmação. Lotes permanecem apenas como histórico compatível.

## Goals / Non-Goals

**Goals:** restringir novos pagamentos no núcleo, não só na UI; eliminar valor
externo e seleção de quantidade; preservar histórico em lote e resultados do seed;
manter publicação atômica e identidade estável do alvo durante o modal.

**Non-Goals:** migrar sessões em execução ou dados persistidos, dividir históricos,
transformar o modal compartilhado em plataforma, refazer cadastro/temas/relatórios,
adicionar backend, formas, estorno, juros ou processamento financeiro.

## Decisions

### D1 — Comando individual e valor canônico (DEC-027; FASE-014)

Redefinir `ComandoPagamento` com vendaId, parcelaId, data e forma. Eliminar lista e
valor informados pelo consumidor. O preparador localiza a venda, identifica a
primeira pendente por número usando as liquidações existentes, exige correspondência
com o ID recebido e deriva o valor integral dessa parcela. Validar data/forma,
criar um recebimento com uma alocação e validar o agregado completo antes de
`publicar`. Comandos legados com múltiplas parcelas não são alternativa de criação
pela fonte; entradas malformadas devem produzir falha tipada sem mutação.

Alternativas: manter o contrato de lote escondendo os campos deixa as restrições
apenas na interface; preencher valor automaticamente na UI mantém uma entrada
financeira redundante. A restrição no núcleo é mais explícita e verificável.
Manter centavos inteiros seguros, calendário civil e resultados tipados existentes.

### D2 — Separar criação de leitura histórica (DEC-027; FASE-014)

Manter `PagamentoDemonstrativo.alocacoes` como coleção e os validadores de agregado
capazes de ler lotes existentes. Não mudar IDs, datas, formas, valores, vínculos ou
ordem do histórico/seed. A preparação pura usada pelo seed pode ser isolada em
helper histórico com contrato próprio, sem ser exposta por comandos da sessão ou
pela UI. A fonte e `PreparadorRecebimento` passam a aceitar somente o novo comando.
Não adaptar seed dividindo seus lotes em recebimentos individuais.

Alternativa de reescrever todo o passado simplifica cardinalidade mas muda o
histórico desnecessariamente. Conservar a coleção custa manter duas fronteiras
distintas: criação individual e preparação sintética histórica. Testar que um
pagamento novo não altera nenhum recebimento anterior, além de comparar o seed
com a base nas mesmas referências, inclusive extremas.

### D3 — ID capturado e rascunho mínimo (FASE-015)

Detalhe mantém a parcela acionada por ID e o acionador para restauração de foco;
resetar abertura ao mudar o ID da rota. Não usar booleano sozinho para escolher
depois a primeira pendente. O modal recebe a parcela explícita, mostra cliente,
número, vencimento e valor BRL como conteúdo não editável e mantém somente
data/forma no rascunho. Data começa em `fonte.referencia`; forma vazia.

Adaptar `converterRecebimento` para validar data/forma e a elegibilidade do ID,
retornando comando individual. Falhas de seleção tornam-se mensagem do formulário,
não erro de quantidade/valor removidos. Revalidar novamente no comando na hora de
confirmar; nunca mover o alvo para a seguinte nem fechar com sucesso antes da aceitação.
Alternativa de derivar continuamente a primeira pendente durante o modal pode
confirmar parcela diferente da conferida e é rejeitada.

### D4 — Ações e foco contextualizados (FASE-015)

Adicionar coluna Ações na tabela; primeira pendente por número tem Pagar, com nome
acessível que identifica parcela e venda. Posteriores exibem texto “Aguardando
parcela anterior”; pagas exibem marcador sem ação, inclusive entrada. Remover
Receber geral. Conservar tabela semântica, região rolável, estilos 18 px/20 px e
paddings; não reduzir fonte ou ocultar histórico para acomodar a coluna.

Reutilizar o Modal nativo e o callback de foco pós-render. Inicial: data. Envio
inválido: primeiro campo inválido ou mensagem focalizável de inelegibilidade.
Cancelar/Escape: acionador ainda existente; sucesso: próximo Pagar; quitação:
`#titulo-parcelas`. Se o alvo previsto não existir, usar título como fallback.
Não abrir automaticamente outra parcela. Manter contexto demonstrativo e descarte.
Alternativa de apenas desabilitar todos os botões gera ações repetidas sem explicar
a sequência, contrariando a escolha explícita de texto nas bloqueadas.

### D5 — Falhas, testes e regressão distribuídos (FASE-014 a FASE-016)

Preservar `submit`, estado de envio e guarda após sucesso; resultado de falha ou
exceção mantém modal, campos e estado financeiro e libera retry. FON-030 do TDD
consulta o comportamento de `submit`/`onInvalid`/`focusBoundControl` em fontes
oficiais Angular via Context7; isso não é execução no patch 22.2.6 instalado.
Não atualizar dependências por consequência dessa consulta.

Adaptar a fronteira `PreparadorRecebimento` para provar falha de alocação única e
validação final. Manter prova de atomicidade do helper histórico se conservado,
sem usar mocks de módulo incompatíveis com o runner (DEC-016). Testes de serviço
comparam agregado inteiro, histórico/IDs e projeções em erro, repetição e sucesso.
Componentes com DOM simulado não comprovam top layer ou contenção real: verificar
teclado, Escape, foco, contraste e dimensões também no navegador.

E2E de recebimento em lote passam a confirmar cada parcela em sua própria abertura,
permitindo datas/formas diferentes. Cobrir entrada, parcelas desiguais em centavos,
antecipação, atrasadas, quitadas, preservação de lote histórico, relatórios, filtros,
paginação e recarga. Rodar regressão da fixture, pois consumidores tipados da fonte
podem precisar do contrato novo sem mudar a configuração ou finalidade da fixture.

## Risks / Trade-offs

- Confirmação antiga pagar outra parcela --> ID capturado e revalidado; obsolescência
  rejeita sem deslocamento nem duplicidade.
- Restrição individual invalidar lotes históricos --> manter leitura plural e separar
  helper sintético, com comparação exata do histórico e resumos.
- Coluna/texto aumentar altura/largura --> medir dez parcelas no desktop, manter texto
  completo e rolagem horizontal contida; não aceitar exceção silenciosa de densidade.
- Dezenas de testes dependem do lote --> revisar os testes afetados preservando suas
  outras asserções; não trocar expectativas por sucesso vazio nem enfraquecer cobertura.
- Foco apontar para botão removido após sucesso --> restauração pós-render com destino
  por resultado e fallback remanescente.
- Evidência antiga de zoom parecer aprovação do novo modal --> repetir verificação
  nativa do fluxo alterado e registrar ambiente, origem e limites; não usar CSS zoom
  como substituto nem marcar a tarefa concluída sem evidência.

## Migration Plan

1. Revisar PRD/TDD e estes artefatos; aguardar novo pedido de apply. Nenhuma tarefa
   de implementação é concluída apenas por existir documentação.
2. FASE-014: novo comando/preparador/conversor e compatibilidade do histórico, com
   testes coerentes e commit restrito à funcionalidade; consumidores precisam
   permanecer tipados e funcionais, sem publicar contrato transitório quebrado.
3. FASE-015: integrar ação por parcela e modal simplificado com componentes/E2E,
   erros, foco e cancelamento; commit(s) por funcionalidade coerente com testes.
4. FASE-016: executar comandos existentes do TDD/manifesto, revisar ambos os temas
   em 1366×768 e 390×844 e zoom nativo 200%, registrar evidências reais em
   `frontend/README.md` e nas tarefas. Não marcar verificações não executadas.
5. Validar a Change; somente após todo o escopo concluído publicar um único PR
   usando `.github/pull_request_template.md`, referenciando PRD/TDD/SDD. Sync/archive
   não são automáticos nesta proposta. Merge exige autorização explícita.

Sem migração persistente: recarga recria a sessão/seed e descarta alterações, como
já informado. Se a implementação falhar nos critérios, pausar e revisar o desenho,
sem ocultar campos ou reduzir o escopo. Reversão futura deve ocorrer por mudança
revisada na feature/PR ou novo PR, nunca reset destrutivo de trabalho alheio.
