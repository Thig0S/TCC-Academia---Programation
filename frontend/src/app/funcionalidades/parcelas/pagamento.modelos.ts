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

interface PagamentoDemonstrativoBase extends EntradaDemonstrativa {
  readonly id: string;
  readonly alocacoes: readonly AlocacaoPagamento[];
}

/** Recebimento antigo: entrada ou lote histórico, sem metadados individuais. */
export interface PagamentoHistoricoDemonstrativo extends PagamentoDemonstrativoBase {
  readonly origem?: never;
  readonly acrescimoCentavos?: never;
  readonly observacao?: never;
}

/** Registro criado pela baixa individual; sua alocação contém o valor efetivamente recebido. */
export interface PagamentoIndividualDemonstrativo extends PagamentoDemonstrativoBase {
  readonly origem: 'individual';
  readonly acrescimoCentavos: number;
  readonly observacao: string;
}

export type PagamentoDemonstrativo =
  PagamentoHistoricoDemonstrativo | PagamentoIndividualDemonstrativo;

export interface ComandoPagamento {
  readonly vendaId: string;
  readonly parcelaId: string;
  readonly data: string;
  readonly forma: string;
  /** Ausente nos fluxos anteriores; até a UI de valor manual, o núcleo usa o valor-base. */
  readonly valorCentavos?: number;
  readonly observacao?: string;
}

export interface ComandoCorrecaoPagamento {
  readonly vendaId: string;
  readonly recebimentoId: string;
  readonly valorCentavos: number;
  readonly data: string;
  readonly forma: string;
  readonly observacao: string;
}

export function formaAceita(forma: string): forma is FormaPagamento {
  return FORMAS_PAGAMENTO.some((aceita) => aceita === forma);
}
