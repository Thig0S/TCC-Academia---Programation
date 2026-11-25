# Tasks

Base: PRD/FON-040/RF-023/CA-046–048 → TDD/DEC-037 → `proposal.md`,
`specs/dominio-vendas/spec.md` e `design.md`/D1–D6. O planejamento foi revisado e o
apply foi explicitamente autorizado; registrar cada tarefa como concluída somente
após implementar seu escopo e executar as verificações aplicáveis. Sem decisões
bloqueantes conhecidas no recorte.

Convenção de entrega: cada funcionalidade coerente leva código, MSTest, atualização
do catálogo de paridade e do README/tarefa, verificação direcionada e commit próprio
em português (`feat: ...`, `test: ...`, `docs: ...`), na mesma feature branch. Não
acumular funcionalidades independentes em commit único ou abrir PR por grupo.
Executar builds/testes sequencialmente para não disputar saídas intermediárias.

## 1. Valores, contratos e identificação — DOM-01

- [x] 1.1 Adicionar referência direta a Dominio em UnitTests e resultado mínimo de domínio com variantes sucesso/falha e erros tipados de D4; verificar build, testes de código/categoria/campo/ausência de valor em falha e grafo sem novas dependências de produção. Documentar contrato e iniciar catálogo sintético em `backend/tests/VendasEmAberto.UnitTests/Dominio/catalogo-paridade.md`, ligado às specs.
- [x] 1.2 Implementar dinheiro em centavos long com limite comum 9.007.199.254.740.991 e operações verificadas; testar zero, positivo, negativo, limite, limite+1, soma insegura e subtração inválida em MSTest. Acrescentar entradas/saídas explícitas ao catálogo e contrato ao README antes do commit da funcionalidade.
- [x] 1.3 Implementar operações civis com DateOnly e referência explícita, geração da base original e pré-validação do alcance; testar bissextos 1900/2000, 31/janeiro→fevereiro→31/março, calendário 0001/9999, janela por diferença de dias e eventual parse ISO estrito. Atualizar catálogo/README e verificar testes sem relógio/fuso.
- [x] 1.4 Implementar dados de cliente imutáveis, CPF/telefone locais e formas restritas; testar normalização permitida, dígitos ASCII, verificadores, repetidos, +55/letras, nome obrigatório e descrição vazia. Registrar no catálogo casos equivalentes às validações TypeScript e verificar MSTest sem rede ou unicidade de CPF.

## 2. Agregado, cadastro, entrada e histórico — DOM-02

- [x] 2.1 Implementar raiz e coleções protegidas com IDs fornecidos, criação validada e cadastro sem entrada; testar mínimo de um centavo, N=1, 10.000/3, futuras maiores que saldo, total inválido, IDs vazios/duplicados e data futura. Testar tentativas de mutação por aliases de entrada/saída; atualizar catálogo/README com invariantes e executar MSTest antes do commit.
- [x] 2.2 Implementar entrada como parcela 1 paga nas N parcelas; testar 200.000/10 com entrada 50.000, mínimo total 2/entrada 1/N=2, N=1 inválido, entrada zero/integral/sem forma ou data distinta, novembro/9999 com única futura. Conferir soma-base, recebido único e saldo sem duplicação em MSTest e documentar no catálogo/README.
- [x] 2.3 Implementar reconstrução integralmente validada com origens explícitas Entrada/Individual/HistoricoLote; testar lote de uma e várias parcelas, entrada 20.000+lote 40.000 na venda 200.000/10, sequência, vínculo, soma, data/forma e IDs inválidos. Verificar rejeição integral e proteção de alocações; documentar catálogo/README e ausência de comando público de nova baixa em lote/importação.

## 3. Edição restrita do cliente — DOM-03

- [x] 3.1 Implementar edição dos quatro campos sem reconstruir contrato ou propagar por CPF; testar Ativa, Inativa, Prejuízo, quitada e com recebimentos, cliente inválido e preservação de todas as finanças/IDs/datas. Comparar estado original e outra venda antes/depois em MSTest; incluir casos no catálogo e contrato no README no commit da edição.

## 4. Baixa e correção individuais — DOM-04

- [x] 4.1 Implementar baixa na primeira pendente da Ativa com referência e ID explícitos; testar antecipação, quatro formas, data nas duas bordas, valor-base/maior/menor, origem Individual, salto, parcela paga/entrada, ID em uso e repetição sem deslocar alvo. Verificar base 10.000 recebida 11.000 sem alterar saldo futuro, código/campo e ausência de mutação em falhas; atualizar catálogo/README e executar MSTest.
- [x] 4.2 Aplicar observação opcional com até 20 escalares Unicode, normalizando ausência; testar 20 e 21, pares UTF-16 e preservação do conteúdo no recebimento. Registrar contagem compatível com frontend no catálogo/README e executar MSTest sem depender de string.Length como contagem.
- [x] 4.3 Implementar correção do mesmo Individual de Ativa, inclusive quitada, preservando IDs e base; usar vendas conhecidas apenas para distinguir ID de outra venda/inexistente e retornar a raiz corrigida. Testar 11.000→10.500 sobre base 10.000, alteração de mês/data/forma/nota, repetição sem registro extra, limite Unicode e mínimo-base. Recusar entrada/lote/inexistente/de outra venda e Inativa/Prejuízo; conferir estado original e outros registros íntegros em MSTest e atualizar catálogo/README.

## 5. Situação administrativa — DOM-05

- [x] 5.1 Implementar mudanças administrativas com matriz completa e no-op do status atual; testar Ativo→Inativo/Prejuízo, retornos a Ativo, transições diretas proibidas, enum inválido e Prejuízo em quitada. Verificar preservação de parcelas/recebimentos/datas/base e estado original, sem estorno/exclusão; adicionar casos ao catálogo/README e executar MSTest antes do commit.

## 6. Projeções, conjunto e períodos — DOM-06

- [x] 6.1 Implementar projeções puras de parcela/venda com base, acréscimo, efetivo, recebido, saldo, pagas/N e próximo vencimento; testar identidade saldo=bases pendentes=efetivo−pago, precedência e ontem/hoje/+7/+8, MaxValue, quitação e ausência de próximo vencimento. Incluir entrada/lote/correção e consulta sem mutação em MSTest, catálogo e README.
- [x] 6.2 Implementar validação/aceitação pura do conjunto candidato com unicidade global e somas seguras antes de sucesso; testar colisões entre tipos/vendas, soma insegura em venda oculta, cadastro/baixa/correção localmente válidos mas globalmente inválidos e preservação integral do conjunto anterior. Verificar que candidato rejeitado não é publicado, incluindo descarte e falha técnica sem classificação comercial; documentar fronteira no catálogo/README e executar MSTest.
- [ ] 6.3 Implementar separação de abertas/quitadas Ativas, Inativas e Prejuízo, resumos globais e períodos civis inclusivos; testar vazios, intervalo invertido, bordas do período, reativação, recebimentos de todos os status e totais operacionais só Ativas. Conferir consulta sem efeitos colaterais e soma exata no catálogo/README e MSTest.
- [ ] 6.4 Implementar relatório mensal puro com mês opcional, série diária, posições e Prejuízo separado; testar mês padrão/selecionado/vazio, 28–31 dias, bissexto, dezembro/janeiro e extremos, soma diária=mensal, correção entre meses, entrada/lote sem duplicar, Prejuízo com/sem pagamentos, ordenação estável das posições e invariância da posição/referência ao trocar mês. Registrar casos e resultados no catálogo/README, sem componentes UI, e executar MSTest.

## 7. Regressão integrada e evidências — DOM-07

- [ ] 7.1 Auditar cobertura do catálogo entregue por funcionalidade contra CA-046/047 e todos os cenários do delta, explicitando fonte/regra, entrada, saída e teste correspondente; verificar não haver caso essencial sem teste nem oráculo circular. Conferir reconstrução sintética, ausência de leitura XLSX, pacotes novos, handlers, mudanças Angular/seed ou endpoints de negócio; registrar resultado da revisão no README.
- [ ] 7.2 Executar em `backend/` com SDK selecionado por global.json: `dotnet --info`, `dotnet restore VendasEmAberto.slnx --locked-mode`, `dotnet build VendasEmAberto.slnx -c Release --no-restore`, `dotnet test --solution VendasEmAberto.slnx -c Release --no-build` e `dotnet format VendasEmAberto.slnx --verify-no-changes --no-restore`. Verificar testes de domínio e técnicos descobertos/não vazios e saída de sucesso, grafo/lockfiles sem dependência indevida; registrar versões, comandos e contagens reais no README, sem reutilizar resultados históricos como execução atual.
- [ ] 7.3 Repetir smoke real sem launch profile: listener loopback, `/health` 200/text/plain/Healthy, `/vendas` 404 e encerramento liberando porta; preservar os testes técnicos de rejeição de endpoint e falha genérica. Verificar que nenhum processo iniciado pelo smoke permanece, sem encerrar processos alheios; registrar evidência e limitações no README.
- [ ] 7.4 Com API desligada, executar em `frontend/` `npm.cmd test -- --watch=false` e `npm.cmd run build`; verificar independência e não regressão conforme CA-048. Registrar resultados reais e E2E/zoom não executados por não haver alteração de UI, sem alegar homologação operacional.
- [ ] 7.5 Revisar rastreabilidade PRD→TDD→SDD→testes/evidências e o diff restrito; executar `openspec validate fase-002-dominio --strict` e `git diff --check`, registrar resultados e limitações no README/tasks. Conferir conclusão de todo o escopo antes de preparar PR e manter a alteração preexistente de `.gitignore` fora do staging/commits.

## Workflow follow-up

- Após apply integral e verificações, publicar a mesma feature branch e abrir
  **um único PR** para main com `.github/pull_request_template.md`, referências
  PRD/TDD/SDD, resultados reais, verificações não executadas e limitações.
- Não abrir PR apenas pelo planejamento. Revisão e autorização explícita são
  necessárias para merge; não usar push direto em main.
- Sync/archive, quando solicitados, são etapas próprias; não sincronizar nem
  arquivar `fase-001-backend`/`dashboard-relatorios` para concluir esta Change.
- Aplicacao/slices, persistência e importação/desktop exigem propostas e autorização
  próprias; licenças MediatR/FluentResults devem ser resolvidas antes de sua adoção.
