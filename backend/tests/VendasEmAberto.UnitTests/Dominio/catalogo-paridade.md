# Catálogo sintético de paridade do domínio

Este catálogo registra entradas e resultados esperados independentes das
implementações C#. Os casos usam exclusivamente dados sintéticos e rastreiam a
capability `dominio-vendas` e os requisitos da Change `fase-002-dominio`.

## Casos iniciais

| Caso | Origem | Entrada sintética | Resultado esperado | Teste MSTest |
| --- | --- | --- | --- | --- |
| RES-001 | `dominio-vendas`, requisito “Resultados de domínio sem publicação parcial”, cenários “Falhar após preparar candidato” e “Descartar preparação e não confundir falha técnica” | Falha de validação de CPF com código `cpf-invalido` e campo `cpf` | A variante é falha, contém categoria/código/mensagem/campo tipados e não expõe valor de sucesso | `ResultadoDominioTests.CriarFalha_DisponibilizaErroTipadoSemValor` |
| RES-002 | `dominio-vendas`, requisito “Resultados de domínio sem publicação parcial” | Sucesso sintético contendo o inteiro `42` | A variante de sucesso disponibiliza exatamente `42` | `ResultadoDominioTests.CriarSucesso_DisponibilizaValor` |
| DIN-001 | `dominio-vendas`, requisito “Precisão financeira compatível entre consumidores”, cenário “Rejeitar valor e soma fora do limite”; `frontend/src/app/funcionalidades/vendas/dinheiro.ts` | `0`, `1` e `9.007.199.254.740.991` centavos | Todos são aceitos sem alteração | `DinheiroTests.Criar_AceitaCentavosNoIntervalo` |
| DIN-002 | Mesmas fontes de DIN-001 | `-1` centavo | Falha `Validacao/valor-invalido`, campo `valor` | `DinheiroTests.Criar_RejeitaCentavosNegativos` |
| DIN-003 | Mesmas fontes de DIN-001 | `9.007.199.254.740.992` centavos | Falha `Validacao/limite-financeiro-excedido` | `DinheiroTests.Criar_RejeitaValorAcimaDoLimiteSeguro` |
| DIN-004 | `frontend/src/app/funcionalidades/vendas/dinheiro.ts`, `somarCentavos` | `9.007.199.254.740.990 + 1` | Soma aceita e resulta exatamente no limite seguro | `DinheiroTests.Somar_AceitaLimiteExato` |
| DIN-005 | `dominio-vendas`, requisito “Precisão financeira compatível entre consumidores”, cenário “Rejeitar valor e soma fora do limite” | `9.007.199.254.740.991 + 1` | Falha `Validacao/limite-financeiro-excedido`, sem valor financeiro | `DinheiroTests.Somar_RejeitaSomaAcimaDoLimiteSeguro` |
| DIN-006 | `frontend/src/app/funcionalidades/vendas/dinheiro.ts`, `subtrairCentavos` | `10.000 − 3.333` centavos | Subtração aceita e resulta em `6.667` | `DinheiroTests.Subtrair_AceitaResultadoNaoNegativo` |
| DIN-007 | `frontend/src/app/funcionalidades/vendas/dinheiro.ts`, `subtrairCentavos` | `1 − 2` centavos | Falha `Validacao/valor-invalido`; não representa saldo negativo | `DinheiroTests.Subtrair_RejeitaResultadoNegativo` |
| DAT-001 | `dominio-vendas`, requisito “Precisão financeira compatível entre consumidores”, cenário “Preservar o dia-base e o limite de calendário”; `frontend/src/app/funcionalidades/vendas/data-civil.ts` | 31/01/2027, duas parcelas futuras | 28/02/2027 e 31/03/2027; o cálculo do segundo vencimento parte da data original | `CalendarioCivilTests.GerarVencimentos_UsaSempreDiaDaDataBaseOriginal` |
| DAT-002 | `frontend/src/app/funcionalidades/vendas/data-civil.ts`, `diasNoMes` | 31/01/1900 e 31/01/2000, um mês adiante | Fevereiro de 1900 tem 28 dias; fevereiro de 2000 tem 29 | `CalendarioCivilTests.AdicionarMeses_RespeitaAnosBissextos` |
| DAT-003 | `dominio-vendas`, requisito “Precisão financeira compatível entre consumidores”, cenário “Preservar o dia-base e o limite de calendário” | 01/12/0001 + um mês; 30/11/9999 + um mês | 01/01/0002 e 30/12/9999 são vencimentos válidos | `CalendarioCivilTests.GerarVencimentos_AceitaLimitesDoCalendario` |
| DAT-004 | Mesma origem de DAT-003; `frontend/src/app/funcionalidades/vendas/data-civil.ts`, `gerarVencimentos` | 31/12/9999 + um mês; quantidade `Int32.MaxValue` | Ambas falham tipadamente antes de alocar uma coleção de vencimentos | `CalendarioCivilTests.GerarVencimentos_RejeitaAlcanceAntesDeAlocar` |
| DAT-005 | `dominio-vendas`, requisito “Precisão financeira compatível entre consumidores”, cenário “Classificar na referência máxima”; `frontend/src/app/funcionalidades/vendas/data-civil.ts`, `ordinalCivil` | Referência 10/04/2027, janela de 7 dias; depois referência `DateOnly.MaxValue` | Hoje e +7 pertencem à janela; +8 e ontem não; referência máxima não transborda | `CalendarioCivilTests.DentroDosProximosDias_UsaDiferencaInclusivaSemAvancarReferencia` e `CalendarioCivilTests.DentroDosProximosDias_NaoTransbordaNaReferenciaMaxima` |

Os próximos marcos acrescentam valores, calendário, identificação, agregado,
operações e projeções com oráculos exatos e testes correspondentes.
