# Revisão de `refinar-design` — 22/11/2026

Capturas de testes Chromium com dados sintéticos, referência 22/11/2026 e zoom
padrão de 100%. Não são evidência de zoom nativo, aceite da ótica ou certificação.

| Captura                      | Rota/cenário                                                                            | Viewport CSS | Tema   |
| ---------------------------- | --------------------------------------------------------------------------------------- | ------------ | ------ |
| `paginacao-antes-dark.png`   | `/vendas`, fixture `?quantidade=80`, página 4, documento 472 px                         | 390×844      | Escuro |
| `paginacao-depois-dark.png`  | Mesmo cenário, controles contidos em 390 px                                             | 390×844      | Escuro |
| `paginacao-depois-light.png` | Mesmo cenário, controles contidos em 390 px                                             | 390×844      | Claro  |
| `resumos-antes-dark.png`     | `/visao-geral`, nome sem espaços e valor extenso cadastrados pela UI, documento 2177 px | 390×844      | Escuro |
| `resumos-depois-dark.png`    | Mesmo cenário, texto integral contido em 390 px                                         | 390×844      | Escuro |
| `resumos-depois-light.png`   | Mesmo cenário, texto integral contido em 390 px                                         | 390×844      | Claro  |
| `resumos-depois-desktop.png` | Mesmo cenário, quebra dentro dos painéis                                                | 1366×844     | Escuro |

Fontes: `e2e/paginacao-fixture.spec.ts`, teste “paginação extensa permanece
contida e operável em todas as larguras”, e `e2e/refinamento-visual.spec.ts`,
teste “resumos preservam nome sem espaços e valores extensos sem overflow”.
Antes: `test-results/revisao-paginacao-antes/` e `revisao-resumos-antes/`.
Depois: `test-results/revisao-paginacao-depois/` e `revisao-resumos-depois/`.
Os diretórios completos de execução são locais, ignorados pelo Git.
