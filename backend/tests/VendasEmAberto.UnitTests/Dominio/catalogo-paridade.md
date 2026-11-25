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

Os próximos marcos acrescentam valores, calendário, identificação, agregado,
operações e projeções com oráculos exatos e testes correspondentes.
