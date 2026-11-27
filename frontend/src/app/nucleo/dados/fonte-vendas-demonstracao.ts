import { Injectable, inject } from '@angular/core';
import { defer, Observable, of } from 'rxjs';
import {
  calcularRelatorio,
  DadosRelatorio,
  ParcelaAtrasadaRelatorio,
  ParcelaPrejuizoRelatorio,
  RecebimentoRelatorio,
  SaldoRelatorio,
} from '../../funcionalidades/relatorios/relatorios.calculos';
import {
  selecionarParcelasAtrasadas,
  selecionarParcelasProximas,
  selecionarVendasRecentes,
} from '../../funcionalidades/visao-geral/visao-geral.calculos';
import { projetarVenda, ProjecaoVenda } from '../../funcionalidades/vendas/venda.calculos';
import {
  ComandoCadastro,
  ComandoEdicaoCliente,
  ComandoMudancaStatus,
  Resultado,
  Venda,
} from '../../funcionalidades/vendas/venda.modelos';
import {
  formaAceita,
  PagamentoDemonstrativo,
  ComandoCorrecaoPagamento,
  ComandoPagamento,
} from '../../funcionalidades/parcelas/pagamento.modelos';
import { ProjecaoParcela } from '../../funcionalidades/parcelas/parcela.calculos';
import { subtrairCentavos, somarCentavos } from '../../funcionalidades/vendas/dinheiro';
import { ServicoDemonstracao } from '../demonstracao/servico-demonstracao';
import {
  ColecaoVendas,
  FormaPagamentoLeitura,
  IndicadoresVisaoGeralLeitura,
  ParcelaAtrasadaMensalLeitura,
  ParcelaLeitura,
  ParcelaPrejuizoMensalLeitura,
  ParcelaVisaoGeralLeitura,
  RecebimentoLeitura,
  RecebimentoMensalLeitura,
  RelatorioMensalLeitura,
  SaldoMensalLeitura,
  VendaDetalheLeitura,
  VendaResumoLeitura,
  VisaoGeralLeitura,
} from './modelos-leitura';
import { FonteVendas } from './fonte-vendas';

function mapearForma(forma: string): FormaPagamentoLeitura {
  if (!formaAceita(forma)) throw new RangeError('Forma de pagamento demonstrativa inválida.');
  return forma;
}

function mapearResumo(venda: ProjecaoVenda, referencia: string): VendaResumoLeitura {
  return {
    id: venda.id,
    cliente: { ...venda.cliente },
    dataVenda: venda.dataVenda,
    statusAdministrativo: venda.statusAdministrativo,
    situacao: venda.situacao,
    valorTotalCentavos: venda.valorTotalCentavos,
    acrescimosCentavos: subtrairCentavos(venda.valorTotalEfetivoCentavos, venda.valorTotalCentavos),
    valorTotalEfetivoCentavos: venda.valorTotalEfetivoCentavos,
    totalRecebidoCentavos: venda.totalPagoCentavos,
    saldoCentavos: venda.saldoCentavos,
    quantidadePaga: venda.quantidadePaga,
    quantidadeParcelas: venda.parcelas.length,
    proximoVencimento: venda.proximoVencimento,
    revisao: null,
    referencia,
  };
}

function recebimentosDaParcela(
  venda: ProjecaoVenda,
  parcela: ProjecaoParcela,
): readonly PagamentoDemonstrativo[] {
  return venda.recebimentos.filter((recebimento) =>
    recebimento.alocacoes.some((alocacao) => alocacao.parcelaId === parcela.id),
  );
}

function mapearParcela(venda: ProjecaoVenda, parcela: ProjecaoParcela): ParcelaLeitura {
  const recebimentos = recebimentosDaParcela(venda, parcela);
  const acrescimoCentavos = somarCentavos(
    recebimentos.map((recebimento) =>
      recebimento.origem === 'individual' ? recebimento.acrescimoCentavos : 0,
    ),
  );
  const valorEfetivoCentavos = somarCentavos([parcela.valorCentavos, acrescimoCentavos]);
  const valorRecebidoCentavos = somarCentavos(
    recebimentos.flatMap((recebimento) =>
      recebimento.alocacoes
        .filter((alocacao) => alocacao.parcelaId === parcela.id)
        .map((alocacao) => alocacao.valorCentavos),
    ),
  );

  return {
    id: parcela.id,
    numero: parcela.numero,
    valorBaseCentavos: parcela.valorCentavos,
    acrescimoCentavos,
    valorEfetivoCentavos,
    valorRecebidoCentavos,
    saldoCentavos: subtrairCentavos(valorEfetivoCentavos, valorRecebidoCentavos),
    vencimento: parcela.vencimento,
    situacao: parcela.situacao,
    dataPagamento: parcela.dataPagamento,
    formaPagamento: parcela.formaPagamento,
  };
}

function origemRecebimento(
  venda: ProjecaoVenda,
  recebimento: PagamentoDemonstrativo,
): RecebimentoLeitura['origem'] {
  if (recebimento.origem === 'individual') return 'Individual';
  const parcelaEntrada = venda.entrada
    ? venda.parcelas.find((parcela) => parcela.numero === 1)
    : undefined;
  return parcelaEntrada &&
    recebimento.alocacoes.some((alocacao) => alocacao.parcelaId === parcelaEntrada.id)
    ? 'Entrada'
    : 'Lote';
}

function mapearRecebimento(
  venda: ProjecaoVenda,
  recebimento: PagamentoDemonstrativo,
): RecebimentoLeitura {
  return {
    id: recebimento.id,
    data: recebimento.data,
    forma: mapearForma(recebimento.forma),
    origem: origemRecebimento(venda, recebimento),
    valorCentavos: recebimento.valorCentavos,
    acrescimoCentavos: recebimento.origem === 'individual' ? recebimento.acrescimoCentavos : 0,
    observacao: recebimento.origem === 'individual' ? recebimento.observacao : '',
    alocacoes: recebimento.alocacoes.map((alocacao) => ({ ...alocacao })),
  };
}

function mapearDetalhe(venda: ProjecaoVenda, referencia: string): VendaDetalheLeitura {
  return {
    resumo: mapearResumo(venda, referencia),
    parcelas: venda.parcelas.map((parcela) => mapearParcela(venda, parcela)),
    recebimentos: venda.recebimentos.map((recebimento) => mapearRecebimento(venda, recebimento)),
  };
}

function mapearResultado<T>(
  resultado: Resultado<T>,
  converter: (valor: T) => VendaDetalheLeitura,
): Resultado<VendaDetalheLeitura> {
  if (resultado.tipo !== 'sucesso') return resultado;
  return { ...resultado, valor: converter(resultado.valor) };
}

function mapearVisaoGeral(
  referencia: string,
  resumo: IndicadoresVisaoGeralLeitura,
  vendas: readonly ProjecaoVenda[],
): VisaoGeralLeitura {
  const mapearParcelaVisao = ({
    venda,
    parcela,
  }: {
    readonly venda: ProjecaoVenda;
    readonly parcela: ProjecaoParcela;
  }): ParcelaVisaoGeralLeitura => ({
    venda: mapearResumo(venda, referencia),
    parcela: mapearParcela(venda, parcela),
  });

  return {
    referencia,
    revisao: null,
    indicadores: resumo,
    vendasRecentes: selecionarVendasRecentes(vendas).map((venda) =>
      mapearResumo(venda, referencia),
    ),
    parcelasProximas: selecionarParcelasProximas(vendas).map(mapearParcelaVisao),
    parcelasAtrasadas: selecionarParcelasAtrasadas(vendas).map(mapearParcelaVisao),
  };
}

function mapearRecebimentoMensal(
  item: RecebimentoRelatorio,
  referencia: string,
): RecebimentoMensalLeitura {
  return {
    id: item.id,
    venda: mapearResumo(item.venda, referencia),
    origem: item.origem,
    data: item.data,
    forma: mapearForma(item.forma),
    valorCentavos: item.valorCentavos,
  };
}

function mapearSaldoMensal(item: SaldoRelatorio, referencia: string): SaldoMensalLeitura {
  return {
    venda: mapearResumo(item.venda, referencia),
    saldoCentavos: item.saldoCentavos,
    primeiroVencimentoPendente: item.primeiroVencimentoPendente,
  };
}

function mapearParcelaAtrasadaMensal(
  item: ParcelaAtrasadaRelatorio,
  referencia: string,
): ParcelaAtrasadaMensalLeitura {
  return {
    venda: mapearResumo(item.venda, referencia),
    parcela: mapearParcela(item.venda, item.parcela),
  };
}

function mapearParcelaPrejuizoMensal(
  item: ParcelaPrejuizoRelatorio,
  referencia: string,
): ParcelaPrejuizoMensalLeitura {
  return {
    ...mapearParcelaAtrasadaMensal(item, referencia),
    incluirNoTotal: item.incluirNoTotal,
  };
}

function mapearRelatorioMensal(
  relatorio: DadosRelatorio,
  referencia: string,
): RelatorioMensalLeitura {
  return {
    referencia,
    revisao: null,
    inicioMes: relatorio.inicioMes,
    fimMes: relatorio.fimMes,
    recebimentos: relatorio.recebimentos.map((item) => mapearRecebimentoMensal(item, referencia)),
    recebimentosDiarios: relatorio.recebimentosDiarios.map((item) => ({ ...item })),
    vendasDoMes: relatorio.vendasDoMes.map((venda) => mapearResumo(venda, referencia)),
    saldos: relatorio.saldos.map((item) => mapearSaldoMensal(item, referencia)),
    parcelasAtrasadas: relatorio.parcelasAtrasadas.map((item) =>
      mapearParcelaAtrasadaMensal(item, referencia),
    ),
    parcelasPrejuizo: relatorio.parcelasPrejuizo.map((item) =>
      mapearParcelaPrejuizoMensal(item, referencia),
    ),
    totalRecebidoCentavos: relatorio.totalRecebidoCentavos,
    quantidadeVendasMes: relatorio.quantidadeVendasMes,
    totalVendasMesCentavos: relatorio.totalVendasMesCentavos,
    totalEmAbertoCentavos: relatorio.totalEmAbertoCentavos,
    totalAtrasadoCentavos: relatorio.totalAtrasadoCentavos,
    totalPrejuizoCentavos: relatorio.totalPrejuizoCentavos,
  };
}

@Injectable({ providedIn: 'root' })
export class FonteVendasDemonstracao implements FonteVendas {
  private readonly servico = inject(ServicoDemonstracao);
  readonly referencia = this.servico.referencia;

  consultarColecao(colecao: ColecaoVendas): Observable<readonly VendaResumoLeitura[]> {
    return defer(() => {
      const vendas = {
        abertas: this.servico.abertas(),
        quitadas: this.servico.quitadas(),
        inativas: this.servico.inativas(),
        prejuizos: this.servico.prejuizos(),
      }[colecao];
      return of(vendas.map((venda) => mapearResumo(venda, this.referencia)));
    });
  }

  consultarVenda(id: string): Observable<Resultado<VendaDetalheLeitura>> {
    return defer(() =>
      of(
        mapearResultado(this.servico.consultarVenda(id), (venda) =>
          mapearDetalhe(venda, this.referencia),
        ),
      ),
    );
  }

  consultarVisaoGeral(): Observable<VisaoGeralLeitura> {
    return defer(() => {
      const resumo = this.servico.resumo();
      const indicadores: IndicadoresVisaoGeralLeitura = {
        totalEmAbertoCentavos: resumo.totalEmAbertoCentavos,
        valoresEmAtrasoCentavos: resumo.valoresEmAtrasoCentavos,
        recebidoNoMesCentavos: resumo.recebidoNoMesCentavos,
        vendasCadastradas: resumo.vendasCadastradas,
      };
      return of(mapearVisaoGeral(this.referencia, indicadores, this.servico.vendas()));
    });
  }

  consultarRelatorioMensal(mes: string): Observable<RelatorioMensalLeitura> {
    return defer(() =>
      of(
        mapearRelatorioMensal(
          calcularRelatorio(this.servico.vendas(), this.referencia, mes),
          this.referencia,
        ),
      ),
    );
  }

  cadastrarVenda(comando: ComandoCadastro): Observable<Resultado<VendaDetalheLeitura>> {
    return this.executarComando(() => this.servico.cadastrarVenda(comando));
  }

  editarCliente(comando: ComandoEdicaoCliente): Observable<Resultado<VendaDetalheLeitura>> {
    return this.executarComando(() => this.servico.editarCliente(comando));
  }

  alterarStatus(comando: ComandoMudancaStatus): Observable<Resultado<VendaDetalheLeitura>> {
    return this.executarComando(() => this.servico.alterarStatus(comando));
  }

  registrarPagamento(comando: ComandoPagamento): Observable<Resultado<VendaDetalheLeitura>> {
    return this.executarComando(() => this.servico.registrarPagamento(comando));
  }

  corrigirPagamento(comando: ComandoCorrecaoPagamento): Observable<Resultado<VendaDetalheLeitura>> {
    return this.executarComando(() => this.servico.corrigirPagamento(comando));
  }

  private executarComando(
    executar: () => Resultado<Venda>,
  ): Observable<Resultado<VendaDetalheLeitura>> {
    return defer(() =>
      of(
        mapearResultado(executar(), (venda) =>
          mapearDetalhe(projetarVenda(venda, this.referencia), this.referencia),
        ),
      ),
    );
  }
}
