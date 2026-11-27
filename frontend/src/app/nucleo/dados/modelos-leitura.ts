export type StatusAdministrativoLeitura = 'Ativo' | 'Inativo' | 'Prejuízo';
export type FormaPagamentoLeitura = 'Dinheiro' | 'Pix' | 'Cartão de débito' | 'Cartão de crédito';
export type SituacaoVendaLeitura = 'Quitada' | 'Atrasada' | 'Próximos dias' | 'Em aberto';
export type SituacaoParcelaLeitura = 'Paga' | 'Atrasado' | 'Próximos dias' | 'Aberto';
export type OrigemRecebimentoLeitura = 'Entrada' | 'Lote' | 'Individual';
export type ColecaoVendas = 'abertas' | 'quitadas' | 'inativas' | 'prejuizos';

export interface ClienteLeitura {
  readonly nome: string;
  readonly cpf: string;
  readonly telefone: string;
  readonly descricao: string | null;
}

/** Resumo independente da entidade de domínio, pronto para as consultas de tela. */
export interface VendaResumoLeitura {
  readonly id: string;
  readonly cliente: ClienteLeitura;
  readonly dataVenda: string;
  readonly statusAdministrativo: StatusAdministrativoLeitura;
  readonly situacao: SituacaoVendaLeitura;
  readonly valorTotalCentavos: number;
  readonly acrescimosCentavos: number;
  readonly valorTotalEfetivoCentavos: number;
  readonly totalRecebidoCentavos: number;
  readonly saldoCentavos: number;
  readonly quantidadePaga: number;
  readonly quantidadeParcelas: number;
  readonly proximoVencimento: string | null;
  readonly revisao: string | null;
  readonly referencia: string;
}

export interface ParcelaLeitura {
  readonly id: string;
  readonly numero: number;
  readonly valorBaseCentavos: number;
  readonly acrescimoCentavos: number;
  readonly valorEfetivoCentavos: number;
  readonly valorRecebidoCentavos: number;
  readonly saldoCentavos: number;
  readonly vencimento: string;
  readonly situacao: SituacaoParcelaLeitura;
  readonly dataPagamento: string | null;
  readonly formaPagamento: FormaPagamentoLeitura | null;
}

export interface AlocacaoLeitura {
  readonly parcelaId: string;
  readonly valorCentavos: number;
}

export interface RecebimentoLeitura {
  readonly id: string;
  readonly data: string;
  readonly forma: FormaPagamentoLeitura;
  readonly origem: OrigemRecebimentoLeitura;
  readonly valorCentavos: number;
  readonly acrescimoCentavos: number;
  readonly observacao: string;
  readonly alocacoes: readonly AlocacaoLeitura[];
}

export interface VendaDetalheLeitura {
  readonly resumo: VendaResumoLeitura;
  readonly parcelas: readonly ParcelaLeitura[];
  readonly recebimentos: readonly RecebimentoLeitura[];
}

export interface IndicadoresVisaoGeralLeitura {
  readonly totalEmAbertoCentavos: number;
  readonly valoresEmAtrasoCentavos: number;
  readonly recebidoNoMesCentavos: number;
  readonly vendasCadastradas: number;
}

export interface ParcelaVisaoGeralLeitura {
  readonly venda: VendaResumoLeitura;
  readonly parcela: ParcelaLeitura;
}

export interface VisaoGeralLeitura {
  readonly referencia: string;
  readonly revisao: string | null;
  readonly indicadores: IndicadoresVisaoGeralLeitura;
  readonly vendasRecentes: readonly VendaResumoLeitura[];
  readonly parcelasProximas: readonly ParcelaVisaoGeralLeitura[];
  readonly parcelasAtrasadas: readonly ParcelaVisaoGeralLeitura[];
}

export interface RecebimentoMensalLeitura {
  readonly id: string;
  readonly venda: VendaResumoLeitura;
  readonly origem: OrigemRecebimentoLeitura;
  readonly data: string;
  readonly forma: FormaPagamentoLeitura;
  readonly valorCentavos: number;
}

export interface RecebimentoDiarioLeitura {
  readonly data: string;
  readonly totalCentavos: number;
}

export interface SaldoMensalLeitura {
  readonly venda: VendaResumoLeitura;
  readonly saldoCentavos: number;
  readonly primeiroVencimentoPendente: string | null;
}

export interface ParcelaMensalLeitura {
  readonly venda: VendaResumoLeitura;
  readonly parcela: ParcelaLeitura;
}

export interface ParcelaAtrasadaMensalLeitura extends ParcelaMensalLeitura {}

export interface ParcelaPrejuizoMensalLeitura extends ParcelaMensalLeitura {
  readonly incluirNoTotal: boolean;
}

export interface RelatorioMensalLeitura {
  readonly referencia: string;
  readonly revisao: string | null;
  readonly inicioMes: string;
  readonly fimMes: string;
  readonly recebimentos: readonly RecebimentoMensalLeitura[];
  readonly recebimentosDiarios: readonly RecebimentoDiarioLeitura[];
  readonly vendasDoMes: readonly VendaResumoLeitura[];
  readonly saldos: readonly SaldoMensalLeitura[];
  readonly parcelasAtrasadas: readonly ParcelaAtrasadaMensalLeitura[];
  readonly parcelasPrejuizo: readonly ParcelaPrejuizoMensalLeitura[];
  readonly totalRecebidoCentavos: number;
  readonly quantidadeVendasMes: number;
  readonly totalVendasMesCentavos: number;
  readonly totalEmAbertoCentavos: number;
  readonly totalAtrasadoCentavos: number;
  readonly totalPrejuizoCentavos: number;
}
