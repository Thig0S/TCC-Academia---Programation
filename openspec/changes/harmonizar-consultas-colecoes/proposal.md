# Proposal

## Why

As telas de Vendas abertas, Quitadas, Inativas e Prejuízo oferecem buscas semelhantes, mas seus controles têm acabamentos e espaçamentos diferentes. A inconsistência visual dificulta reconhecer o mesmo padrão de consulta entre as coleções.

## What Changes

- Aplicar às buscas e ações Limpar pesquisa de Quitadas, Inativas e Prejuízo a mesma linguagem visual dos controles de Vendas abertas.
- Tratar Inativas e Prejuízo pelo template administrativo compartilhado.
- Manter busca e limpeza existentes, sem filtro por situação nessas coleções e sem adicionar outros controles.
- Preservar comportamento, acessibilidade, rotas, dados e paginação.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `consulta-vendas`: especificar consistência visual entre os controles de pesquisa das coleções.

## Impact

- PRD/FON-033/RF-017/CA-041 e TDD/DEC-031.
- Templates `listar-vendas-quitadas.html` e `listar-vendas-administrativas.html`, mais testes de componente das coleções.
- Sem alterações de domínio, serviços, rotas, dependências ou comportamento dos filtros.
