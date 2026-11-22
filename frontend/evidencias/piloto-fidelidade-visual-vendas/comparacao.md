# Comparação visual do piloto — capturas sintéticas

As capturas de Vendas usam a mesma fixture de dez vendas. Cada par mostra a
baseline à esquerda e a hierarquia final à direita, no mesmo viewport e tema.

## Vendas abertas

### 1366×768 · claro

| Antes | Depois |
| --- | --- |
| ![Baseline Vendas desktop clara](baseline/vendas-1366x768-light.png) | ![Piloto Vendas desktop claro](hierarquia/vendas-1366x768-light.png) |

### 1366×768 · escuro

| Antes | Depois |
| --- | --- |
| ![Baseline Vendas desktop escura](baseline/vendas-1366x768-dark.png) | ![Piloto Vendas desktop escuro](hierarquia/vendas-1366x768-dark.png) |

### 390×844 · claro

| Antes | Depois |
| --- | --- |
| ![Baseline Vendas mobile clara](baseline/vendas-390x844-light.png) | ![Piloto Vendas mobile claro](hierarquia/vendas-390x844-light.png) |

### 390×844 · escuro

| Antes | Depois |
| --- | --- |
| ![Baseline Vendas mobile escura](baseline/vendas-390x844-dark.png) | ![Piloto Vendas mobile escuro](hierarquia/vendas-390x844-dark.png) |

## Quitadas · controle de não regressão

Quitadas não recebeu a variante visual do piloto. Os PNGs abaixo foram capturados
depois da implementação para conferir as combinações de tema e viewport; a
equivalência de estilos foi verificada em E2E contra os valores anteriores da
variante compartilhada.

| Viewport/tema | Captura posterior |
| --- | --- |
| 1366×768 · claro | ![Quitadas desktop clara](quitadas-verificacao/quitadas-1366x768-light.png) |
| 1366×768 · escuro | ![Quitadas desktop escura](quitadas-verificacao/quitadas-1366x768-dark.png) |
| 390×844 · claro | ![Quitadas mobile clara](quitadas-verificacao/quitadas-390x844-light.png) |
| 390×844 · escuro | ![Quitadas mobile escura](quitadas-verificacao/quitadas-390x844-dark.png) |

Referência estética principal: [mockup Mercadão](../../../references/a_clean_modern_dashboard_ui_using_the_mercadão_do.png).
Os cards de KPI, busca global, filtro por data e ações ilustrativas do mockup foram
intencionalmente omitidos; ver `frontend/README.md` e o delta OpenSpec para os
contratos preservados.
