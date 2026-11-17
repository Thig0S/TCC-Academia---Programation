export const VENDAS_POR_PAGINA = 10;

export interface FaixaPaginacao {
  inicio: number;
  fim: number;
  total: number;
}

export type ItemPagina = number | '...';

export function obterItensNavegacao(
  totalPaginas: number,
  paginaAtual: number,
): readonly ItemPagina[] {
  if (totalPaginas <= 5) return Array.from({ length: totalPaginas }, (_, indice) => indice + 1);

  const paginas: ItemPagina[] = [1];
  if (paginaAtual > 3) paginas.push('...');
  const inicio = Math.max(2, paginaAtual - 1);
  const fim = Math.min(totalPaginas - 1, paginaAtual + 1);
  for (let pagina = inicio; pagina <= fim; pagina++) paginas.push(pagina);
  if (paginaAtual < totalPaginas - 2) paginas.push('...');
  paginas.push(totalPaginas);
  return paginas;
}

export function obterTotalPaginas(total: number, porPagina = VENDAS_POR_PAGINA): number {
  return Math.ceil(total / porPagina);
}

export function limitarPagina(pagina: number, totalPaginas: number): number {
  return Math.min(Math.max(1, pagina), Math.max(1, totalPaginas));
}

export function obterFaixaPaginacao(
  total: number,
  pagina: number,
  porPagina = VENDAS_POR_PAGINA,
): FaixaPaginacao {
  if (total === 0) return { inicio: 0, fim: 0, total };
  return {
    inicio: (pagina - 1) * porPagina + 1,
    fim: Math.min(pagina * porPagina, total),
    total,
  };
}

export function obterPagina<T>(
  itens: readonly T[],
  pagina: number,
  porPagina = VENDAS_POR_PAGINA,
): readonly T[] {
  const inicio = (pagina - 1) * porPagina;
  return itens.slice(inicio, inicio + porPagina);
}
