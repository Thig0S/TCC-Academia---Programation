# Tasks

Planejamento de 14/11/2026. Apply ainda não autorizado; todas as caixas permanecem
desmarcadas. Referências: PRD 1.3 (RN-011 a RN-017, CA-008/009/011/013/014/017/020/024/025),
TDD 1.6 (FASE-004, DEC-004/005/008/011/015/016), `design.md` e as três deltas desta Change.
Cada funcionalidade deverá incluir testes, evidências e commit coerente na mesma branch;
nenhum grupo autoriza abrir PR antecipado ou implementar telas das fases seguintes.

## 1. Dinheiro e datas civis

- [x] 1.1 Revalidar autorização de apply, `feature/fase-004`, estado do diretório e versões no manifesto/lockfile; conferir PRD 1.3/TDD 1.6 e deltas antes de editar código, preservando alterações alheias; registrar base e recorte em `frontend/README.md`, sem upgrades ou novas dependências. Verificar por `git status`, leitura do manifesto e diff limitado ao núcleo planejado.
- [x] 1.2 Implementar funções puras de centavos seguros, soma/subtração, parse textual pt-BR estrito e formatação necessária ao domínio conforme design; criar testes de entradas válidas, agrupamento, ambiguidade, negativo, frações de centavo e overflow individual/agregado. Verificar com a suíte unitária existente, sem converter decimal financeiro por arredondamento de float.
- [x] 1.3 Implementar validação, parse, comparação, apresentação e aritmética mensal de datas civis gregorianas 0001–9999, preservando o dia-base; testar 31/01 em ano comum/bissexto, 1900/2000, datas inválidas, limite superior e alcance de parcelas antes de alocar arrays. Verificar a suíte em pelo menos dois fusos efetivamente distintos, registrando método e fuso observado, não apenas a variável configurada.
- [x] 1.4 Registrar em `frontend/README.md` contratos técnicos, comandos, resultados reais e limitações desse grupo; executar `npm.cmd run format:check`, `npm.cmd run build` e `npm.cmd test -- --watch=false` em `frontend/`, revisar o diff e criar commit individual coerente dos utilitários com testes e documentação, atualizando somente as tarefas efetivamente concluídas.

## 2. Modelos, parcelamento e projeções de venda

- [x] 2.1 Definir modelos readonly de venda, cliente próprio, parcela, entrada opcional, recebimento e alocação, além dos resultados discriminados; criar preparação pura do cadastro com presença de nome/CPF/telefone e descrição opcional, sem máscara/checksum/unicidade ou edição. Verificar build estrito e testes de identificação ausente, descrição vazia, duas vendas de mesmo cliente e ausência explícita de entrada/data/forma.
- [x] 2.2 Implementar parcelamento com resto de centavos nas primeiras parcelas e validações de total, entrada, quantidade, data não futura e parcelas mínimas; registrar entrada separada na data da venda com forma aceita. Verificar CA-008/009 com R$ 100/3, venda de R$ 1.000 com entrada de R$ 200 e quatro parcelas, limites de zero/negativo/entrada integral/quantidade excessiva e soma exata; não publicar estado nesta função pura.
- [x] 2.3 Implementar cálculos puros de pago, saldo, quantidade paga, próximo vencimento, situações e coleções abertas/quitadas; verificar ontem/hoje/+7/+8, prevalência Paga e Quitada, atraso sobre proximidade, parcela paga com data/forma derivadas e ausência de próximo vencimento ao quitar, reconciliando saldo com soma pendente em centavos.
- [x] 2.4 Implementar resumos globais e consultas por intervalo civil inclusivo, validando datas e ordem; testar primeiro/último dia do mês, referência mensal não equivalente a 30 dias, entrada e recebimentos em períodos distintos, contagem incluindo quitadas, vazio zero e isolamento de qualquer critério de lista, conforme CA-014/025. Verificar overflow de soma antes de aceitar projeções do agregado.
- [x] 2.5 Documentar modelos, regras e pendências remanescentes em `frontend/README.md`; executar formatação, build e unitários/componentes nos scripts existentes, registrar resultados reais e criar commit individual do domínio de vendas com seus testes/documentação. Confirmar pelo diff que páginas, rotas e dependências não foram antecipadas.

## 3. Recebimento integral sequencial em lote

- [ ] 3.1 Implementar validação/preparação pura de lote da mesma venda: IDs únicos, seleção não vazia e exatamente um prefixo das parcelas pendentes por número; testar primeira pendente isolada, várias consecutivas, IDs em ordem textual diferente, salto, parcela paga, ID ausente e parcela de outra venda. Verificar todos os cenários correspondentes de `recebimentos-parcelas` por testes unitários.
- [ ] 3.2 Implementar soma integral, recebimento único com alocações, antecipação e data/forma comuns; testar R$ 600 para três parcelas de R$ 200, parcial/excedente rejeitados, quatro formas aceitas, forma ausente/desconhecida, bordas venda/referência e datas inválidas/fora do intervalo. Verificar que nenhum teste admite juros, desconto, dados bancários ou número de cartão.
- [ ] 3.3 Implementar revalidação do lote sobre o agregado atual e preparação totalmente atômica; testar comando repetido, seleção obsoleta sem deslocamento automático, venda inexistente e falha controlada na preparação de item posterior/validação final. Comparar snapshot completo antes/depois em rejeições e validar recebimento/alocações sem dupla contagem em sucesso, conforme CA-011/013/017/024.
- [ ] 3.4 Registrar em `frontend/README.md` o contrato de lote, mensagens e resultados reais; executar formatação, build e unitários/componentes, revisar que falhas são simuladas apenas em testes e criar commit individual do recebimento com testes, documentação e tarefas correspondentes, sem modal ou ação comercial na UI.

## 4. Dados sintéticos e fonte única de sessão

- [ ] 4.1 Criar fábrica pura de 12 vendas sintéticas relativas à referência, com abertas/atrasadas/próximas/quitadas, com/sem entrada e nomes semelhantes; usar regras já implementadas e identificação demonstrativa não copiada de imagens ou entrevistas. Testar invariantes de todas as vendas, datas/pagamentos históricos válidos, sequência quitada sem lacunas, equivalência para mesma referência e isolamento de objetos; conferir manualmente a ausência de dados reais.
- [ ] 4.2 Criar referência civil substituível em testes e `ServicoDemonstracao` raiz com agregado privado, projeções `computed`, consulta por ID e comandos internos de cadastro/recebimento; implementar publicação única e IDs locais sem colisão com o seed. Verificar com TestBed referência explícita, tipos de resultado/mensagens em português, sucesso único, consulta ausente versus vazio e avanço dos identificadores somente em comandos aceitos.
- [ ] 4.3 Aplicar cópia defensiva e congelamento recursivo dos objetos/arrays publicados e das consultas; testar tentativa de mutação externa, alteração posterior do rascunho, preservação do seed e de snapshots anteriores, erro sem consumir estado parcial e novo injetor com estado inicial independente. Verificar que `asReadonly()` não é a única proteção e que não há efeitos sincronizando cópias financeiras.
- [ ] 4.4 Integrar inicialização na raiz em `app.ts` sem alterar HTML, foco, rotas ou providers das páginas; testar captura da referência na abertura, estabilidade ao atravessar meia-noite simulada e renovação em nova aplicação. Seguir o teste de tema com RouterTestingHarness para comprovar a mesma fonte após navegar por todos os destinos e preservar cadastro/lote aceitos internamente; host exclusivo de teste deve observar projeções zoneless com `whenStable`, sem detecção forçada.
- [ ] 4.5 Registrar em `frontend/README.md` seed, ciclo de vida, contratos, resultados e limite dos testes de recriação versus recarga de navegador; executar formatação, build e unitários/componentes e E2E existentes nos dois viewports. Confirmar aviso/conteúdo indisponível/temas e ausência de rede de negócio/storage; criar commit individual coerente da fonte de sessão, seus testes e documentação, sem hooks globais/endpoints para E2E de negócio.

## 5. Verificação integrada da Change

- [ ] 5.1 Executar instalação limpa e regressão em `frontend/`: `npm.cmd ci`, `npm.cmd run format:check`, `npm.cmd run build`, `npm.cmd test -- --watch=false` e `npm.cmd run test:e2e`; registrar códigos de saída, contagens reais, ambiente, budget e warnings. Preservar servidor alheio em porta ocupada e usar somente servidor próprio conforme configuração, sem aprovar scripts ou contornar peers silenciosamente.
- [ ] 5.2 Revisar em conjunto seed, cadastro interno, entrada e recebimentos em lote antes/depois da quitação; reconciliar todas as projeções e períodos em centavos, repetir erro/duplicidade e recriação de sessão. Registrar evidências integradas e distinguir os contratos de domínio cobertos dos CA de UI ainda dependentes das FASE-005/006/007; não declarar CA-018/021 completos nem aceite da ótica por esses testes.
- [ ] 5.3 Executar na raiz `openspec validate fase-004 --strict` e `git diff --check`, revisar diff e rastreabilidade PRD → TDD → SDD, tarefas e README conforme verificações reais; conferir que nenhuma alteração de dependência, interface comercial, persistência, edição ou regra ainda pendente foi incluída. Confirmar commits individuais por funcionalidade e escopo integral concluído antes de apresentar o único PR desta Change, nunca um PR só de planejamento.

## Evidências do planejamento

- Raiz OpenSpec local resolvida por `context --json` e `list --json`; nenhuma Change ativa existia. Branch inicial `main` limpa; `git fetch origion` e comparação confirmaram `main` alinhada à referência remota local atualizada (0/0). Criada `feature/fase-004` antes das alterações documentais.
- Regras confirmadas pelo solicitante via perguntas, registradas primeiro em PRD 1.3 e depois TDD 1.6; nenhuma resposta foi interpretada como autorização de apply. A entrada é sempre recebida na data da venda e o lote respeita ordem obrigatória com antecipação permitida.
- Fonte, testes, manifesto, rotas e configuração E2E inspecionados. Context7 consultado para Signals/readonly; detalhes no TDD/FON-019. Destinos das specs conferidos dentro da raiz real da Change, sem redirecionamento por links simbólicos.
- `openspec validate fase-004 --strict`, na raiz: aprovado. `git diff --check`: saída 0, somente avisos LF/CRLF nos documentos existentes. Revisão documental confirmou as três capacidades declaradas, artefatos de todas as dependências e tarefas sem marcação de conclusão. Nenhuma tarefa de implementação está concluída.
- Não executados nesta etapa: instalação, formatação executável do frontend, build, testes unitários/componentes/E2E, validação manual de UI, medição, aprovação de produto ou operação de merge. O código e as specs principais permanecem intactos.

## Workflow follow-up

- Apresentar estes artefatos para revisão; aguardar uma nova solicitação explícita de apply antes de implementar. Pendências de busca, edição, identificação, filtros e aceite permanecem fora do recorte.
- Durante apply autorizado, manter planejamento, funcionalidades, testes e evidências na mesma feature branch, com commits individuais coerentes em português e sem staging de trabalho alheio.
- Somente após todo o escopo implementado e verificado, apresentar um único PR para `main` com `.github/pull_request_template.md`; planejamento pronto não autoriza PR antecipado. Merge exige autorização explícita e revisões aplicáveis.
- Sincronizar deltas e arquivar somente no fluxo de conclusão solicitado; verificar o resultado sem confundir planejamento concluído com Change implementada ou integrada.
