# Catálogo sintético de paridade do domínio

Este catálogo registra entradas e resultados esperados independentes das
implementações C#. Os casos usam exclusivamente dados sintéticos e rastreiam a
capability `dominio-vendas` e os requisitos da Change `fase-002-dominio`.

## Casos iniciais

| Caso | Origem | Entrada sintética | Resultado esperado | Teste MSTest |
| --- | --- | --- | --- | --- |
| RES-001 | `dominio-vendas`, requisito “Resultados de domínio sem publicação parcial”, cenários “Falhar após preparar candidato” e “Descartar preparação e não confundir falha técnica” | Falha de validação de CPF com código `cpf-invalido` e campo `cpf` | A variante é falha, contém categoria/código/mensagem/campo tipados e não expõe valor de sucesso | `ResultadoDominioTests.CriarFalha_DisponibilizaErroTipadoSemValor` |
| RES-002 | `dominio-vendas`, requisito “Resultados de domínio sem publicação parcial” | Sucesso sintético contendo o inteiro `42` | A variante de sucesso disponibiliza exatamente `42` | `ResultadoDominioTests.CriarSucesso_DisponibilizaValor` |

Os próximos marcos acrescentam valores, calendário, identificação, agregado,
operações e projeções com oráculos exatos e testes correspondentes.
