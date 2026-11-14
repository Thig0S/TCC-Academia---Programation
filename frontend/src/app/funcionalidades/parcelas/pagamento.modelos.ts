export const FORMAS_PAGAMENTO = [
  'Dinheiro',
  'Pix',
  'Cartão de débito',
  'Cartão de crédito',
] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export interface EntradaDemonstrativa {
  readonly valorCentavos: number;
  readonly data: string;
  readonly forma: FormaPagamento;
}

export interface AlocacaoPagamento {
  readonly parcelaId: string;
  readonly valorCentavos: number;
}

export interface PagamentoDemonstrativo extends EntradaDemonstrativa {
  readonly id: string;
  readonly alocacoes: readonly AlocacaoPagamento[];
}

export interface ComandoPagamento {
  readonly vendaId: string;
  readonly parcelaIds: readonly string[];
  readonly valorCentavos: number;
  readonly data: string;
  readonly forma: string;
}

export function formaAceita(forma: string): forma is FormaPagamento {
  return FORMAS_PAGAMENTO.some((aceita) => aceita === forma);
}
