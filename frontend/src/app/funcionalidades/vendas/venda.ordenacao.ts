import { compararDatasCivis } from './data-civil';
import { ProjecaoVenda } from './venda.calculos';

export const CRITERIOS_ORDENACAO_VENDAS = [
  { valor: 'original', rotulo: 'Ordem atual' },
  { valor: 'cliente', rotulo: 'Cliente (A–Z)' },
  { valor: 'data-venda', rotulo: 'Data da venda (mais antiga)' },
  { valor: 'vencimento', rotulo: 'Primeiro vencimento (mais próximo)' },
] as const;

export type CriterioOrdenacaoVenda = (typeof CRITERIOS_ORDENACAO_VENDAS)[number]['valor'];

const comparadorCliente = new Intl.Collator('pt-BR', { sensitivity: 'base' });

function compararId(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Ordena uma cópia da consulta; ausência de critério preserva a ordem da coleção de origem. */
export function ordenarVendas(
  vendas: readonly ProjecaoVenda[],
  criterio: CriterioOrdenacaoVenda = 'original',
): readonly ProjecaoVenda[] {
  return [...vendas].sort((a, b) => {
    if (criterio === 'cliente') {
      return comparadorCliente.compare(a.cliente.nome, b.cliente.nome) || compararId(a.id, b.id);
    }
    if (criterio === 'data-venda') {
      return compararDatasCivis(a.dataVenda, b.dataVenda) || compararId(a.id, b.id);
    }
    if (criterio === 'vencimento') {
      if (a.proximoVencimento === null && b.proximoVencimento !== null) return 1;
      if (a.proximoVencimento !== null && b.proximoVencimento === null) return -1;
      if (a.proximoVencimento !== null && b.proximoVencimento !== null) {
        const comparacao = compararDatasCivis(a.proximoVencimento, b.proximoVencimento);
        if (comparacao !== 0) return comparacao;
      }
      return compararId(a.id, b.id);
    }
    return 0;
  });
}
