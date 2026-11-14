export interface Parcela {
  readonly id: string;
  readonly numero: number;
  readonly valorCentavos: number;
  readonly vencimento: string;
}

export type SituacaoParcela = 'Paga' | 'Atrasado' | 'Próximos dias' | 'Aberto';
