# Tasks

> Somente planejamento autorizado nesta solicitação. Requer revisão dos artefatos
> e nova autorização de apply antes de executar qualquer tarefa abaixo. Reutilizar
> PRD 1.17/FON-015, RN-007/011/012/013/015/017/024, CA-008/033/034/035 e
> TDD 1.21/DEC-026/FASE-010 a FASE-013. Não confundir artefatos completos com
> implementação comprovada. Manter todas as entregas na branch dedicada derivada
> da main com o PR #20 integrado.
>
> Cada funcionalidade coerente leva testes, documentação/resultados reais em
> `frontend/README.md`, tarefa correspondente e commit individual em português.
> Não acumular funcionalidades independentes no commit final. Não abrir PR antes
> da conclusão integral da Change, nem alterar arquivos/referências alheios.

## 1. Núcleo financeiro e recebimento canônico — FASE-010

- [x] 1.1 Atualizar preparação de cadastro para N total/M futuras, limites de centavos/calendário e entrada como parcela 1 com recebimento integral na data da venda, namespaces sem colisão e IDs opacos estáveis de futuras. Verificar unitários de cadastro/calendário/parcelas para R$ 2.000/10 com entrada R$ 200/R$ 500, sem entrada N=1, com entrada N=1 inválido, R$ 0,02/2 com entrada R$ 0,01, limites seguros e 31/01/anos bissextos/novembro de 9999. Registrar comportamento planejado vs resultado real no README, sem publicar agregado híbrido.
- [x] 1.2 Adequar validação integral e projeções em `venda.calculos.ts` para vínculo metadado/recebimento da entrada, soma única de recebimentos, quantidade paga incluindo entrada, saldo e próximo vencimento. Verificar unitários que rejeitem entrada ausente/duplicada/inconsistente, metadado órfão, alocações parciais/repetidas, saltos e totais inseguros; conferir soma de todas as parcelas=total, pendentes=saldo e pago=soma dos recebimentos, sem mutação nas falhas. Registrar evidências no README com a entrega do núcleo.
- [x] 1.3 Atualizar a consulta por período e `relatorios.calculos.ts` para somar/listar os recebimentos uma vez, identificando a entrada pelo vínculo da parcela 1, sem linha adicional do metadado. Verificar unitários de Relatórios/resumo/período, mês com entrada R$ 200 e lote R$ 400 → R$ 600, bordas inclusivas, meses distintos, vazio e referências extremas; registrar resultados no README e preservar análises/ordem existentes.
- [x] 1.4 Verificar serviço e preparação de recebimento sob o novo agregado: cadastro com entrada publica uma vez e consome um ID de operação; prévia e rejeições não consomem ID. Acrescentar testes de serviço/integração para rejeitar novo pagamento da entrada e comando obsoleto, falha antes de publicar, cópias defensivas, edição só do cliente e quitação das restantes. Registrar resultado real no README; concluir commit(s) coerente(s) de núcleo com seus testes/documentação.

## 2. Seed e fixtures compatíveis — FASE-011

- [x] 2.1 Adaptar `dados-demonstrativos.ts` para K futuras históricas e N=K+1 com entrada, pagando apenas prefixos pendentes após a parcela de entrada. Verificar testes do seed para 12 vendas, IDs/vínculos únicos preservados, total/pago/saldo/recebido por período e vencimentos pendentes equivalentes ao contrato anterior na mesma referência, inclusive 0001-01-01, fevereiro/0001, dias 28/29/30/31 e dezembro/9999; manter situações possíveis e documentar resultados no README.
- [x] 2.2 Atualizar fixtures de `src/testing/paginacao-fixture.ts` e dados de testes que assumem entrada separada ou N futuras; cenários de dez parcelas contam a entrada entre as dez. Verificar testes de fixture e consumidores para 0/1/10/11/21 vendas e detalhe 1/10/11 parcelas, referência estável e ausência de migração/storage; registrar ajustes/resultados no README e criar commit próprio da entrega coerente de seed/fixtures com seus testes.

## 3. Cadastro, prévia e consultas — FASE-012

- [ ] 3.1 Converter `temEntrada` do rascunho para triestado explícito e iniciar sem escolha; adequar conversão/validação de N/M e preservação de valor/forma ao alternar opções, sem truthiness. Verificar unitários de rascunhos para vazio/valor desconhecido, Sim/Não, valores inativos inválidos ignorados, restauração/revalidação e ausência de comando/prévia válidos sem escolha. Registrar resultado e regra no README junto da funcionalidade.
- [ ] 3.2 Substituir a checkbox por select nativo “Possui Entrada” com opções exatas, acima de data/total/quantidade no DOM/tela, e adicionar erro associado “Informe se a venda possui entrada ou não.” à validação Signal Forms. Verificar teste de componente/cadastro com demais campos válidos, envio sem escolha, foco no select, Sim exige valor/forma, Não não envia valores ocultos, manter identificação e outros erros. Registrar resultados no README e commit da seleção obrigatória com testes/documentação.
- [ ] 3.3 Adequar prévia para projeção local fiel, com Situação textual e Entrada/Paga na parcela 1, sem efetivar recebimento, reservar ID ou manter prévia inválida. Verificar unitários/componentes de prévia, dez linhas no exemplo R$ 2.000/10, entrada desigual, mudança de dados/opção, cancelamento, falha/retry e envio único; manter caption, saldo futuro e grade lateral. Registrar resultados no README e commit próprio da prévia com seus testes.
- [ ] 3.4 Adequar detalhe e consumidores de contagens à entrada como parcela, mantendo resumo sem segunda cobrança, valores/data/forma, elegibilidade de receber e edição restrita. Verificar testes de detalhe/listas/modal/edição e integração para 1/10 → 3/10 → 10/10, sem ação de receber a entrada, seleção desde primeira pendente, aberto/quitado e nenhum efeito financeiro da edição. Registrar resultados no README e commit da funcionalidade com testes/documentação.
- [ ] 3.5 Atualizar E2E existentes que usam checkbox ou assumem entrada fora de N e acrescentar os cenários CA-008/033/034/035. Verificar nos dois temas: select por teclado, posição e foco/erro, alternância/restauração, confirmação única, cancelamento, lote/quitação, listas/Visão Geral/Relatórios e recarga. Medir 1366×768, 390×844, 767/768 px e largura intermediária, prévia lateral/empilhada, dez parcelas no detalhe, excedentes internos e ausência de overflow global; registrar capturas sintéticas, contraste e resultados no README com a entrega, sem afrouxar asserções financeiras ou de densidade.

## 4. Verificação integrada e fechamento da Change — FASE-013

- [ ] 4.1 Executar em `frontend/` a regressão integral `npm test -- --watch=false`, `npm run test:e2e` e `npm run test:e2e:paginacao-fixture`. Comparar cadastro com/sem entrada → recebimento → quitação → edição → consulta/resumos/relatórios → recarga; conferir privacidade/rede e valores/contagens reconciliados. Registrar comandos, ambiente, resultados reais, falhas/avisos e eventuais adaptações de porta explicitamente no README, sem reaproveitar contagens do PR #20.
- [ ] 4.2 Executar `npm run build`, `npx ng run vendas-em-aberto:build-paginacao-fixture` e `npm run format:check` em `frontend/`; na raiz, `openspec validate entrada-como-primeira-parcela --strict` e `git diff --check`. Registrar resultados e avisos no README; revisar diff para limitar a entrada/consumidores/testes/documentação, sem mudanças de dependência/persistência/edição financeira ou captura de dados reais. Commit de consolidação só para documentação/verificação integrada, não para acumular funcionalidades.
- [ ] 4.3 Conferir manualmente o fluxo alterado em zoom nativo 200% nos dois temas: cadastro/select/erro/prévia, detalhe/recebimento e análises afetadas. Registrar navegador/versão, escala Windows, viewport útil, cobertura por tela/tema, teclado/foco e resultado real no README; CSS zoom, viewport reduzido ou relato da Change anterior não concluem esta tarefa. Se não houver evidência suficiente, manter pendente e explicitar bloqueio; não abrir PR prematuro.

## Workflow follow-up

- Planejamento concluído não autoriza apply nem PR. Apresentar artefatos para revisão e aguardar nova solicitação de implementação.
- Após todo o apply e suas verificações concluídos, publicar a mesma feature branch e abrir um único PR para main usando `.github/pull_request_template.md`, com PRD/TDD/SDD, evidências reais e limitações. Não abrir PRs individuais por funcionalidade ou artefato.
- Merge depende de autorização explícita e revisão/checks aplicáveis. Confirmar PR mesclado e presença na main antes de declarar integração.
- Sync/archive seguem fluxo próprio. Em futura consolidação, reconciliar deltas visuais do PR #20 antes desta regra financeira e impedir reintrodução de “entrada separada”; não sincronizar/arquivar Changes anteriores neste pedido.
- PEN-013/014/HIP-006 e aceite da ótica não são concluídos por esta Change técnica.
