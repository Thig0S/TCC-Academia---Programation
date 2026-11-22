import { ProjecaoParcela } from '../parcelas/parcela.calculos';
import { compararDatasCivis, limitesDoMes } from '../vendas/data-civil';
import { somarCentavos } from '../vendas/dinheiro';
import { consultarPeriodo, ProjecaoVenda } from '../vendas/venda.calculos';

export interface RecebimentoRelatorio {
  readonly id: string;
  readonly venda: ProjecaoVenda;
  readonly origem: 'Entrada' | 'Lote';
  readonly data: string;
  readonly forma: string;
  readonly valorCentavos: number;
}

export interface SaldoRelatorio {
  readonly venda: ProjecaoVenda;
  readonly saldoCentavos: number;
}

export interface ParcelaAtrasadaRelatorio {
  readonly venda: ProjecaoVenda;
  readonly parcela: ProjecaoParcela;
}

export interface DadosRelatorio {
  readonly inicioMes: string;
  readonly fimMes: string;
  readonly recebimentos: readonly RecebimentoRelatorio[];
  readonly vendasDoMes: readonly ProjecaoVenda[];
  readonly saldos: readonly SaldoRelatorio[];
  readonly parcelasAtrasadas: readonly ParcelaAtrasadaRelatorio[];
  readonly totalRecebidoCentavos: number;
  readonly quantidadeVendasMes: number;
  readonly totalVendasMesCentavos: number;
  readonly totalEmAbertoCentavos: number;
  readonly totalAtrasadoCentavos: number;
}

/** Deriva análises mensais e posições da referência sem alterar as projeções de origem. */
export function calcularRelatorio(
  vendas: readonly ProjecaoVenda[],
  referencia: string,
): DadosRelatorio {
  const [inicioMes, fimMes] = limitesDoMes(referencia);
  const noMes = (data: string) =>
    compararDatasCivis(data, inicioMes) >= 0 && compararDatasCivis(data, fimMes) <= 0;

  const recebimentos = vendas.flatMap((venda) => {
    const parcelaEntradaId = venda.entrada
      ? venda.parcelas.find((parcela) => parcela.numero === 1)?.id
      : undefined;
    return venda.recebimentos
      .filter((item) => noMes(item.data))
      .map((item) => ({
        id: `${venda.id}/recebimento/${item.id}`,
        venda,
        origem: item.alocacoes.some((alocacao) => alocacao.parcelaId === parcelaEntradaId)
          ? ('Entrada' as const)
          : ('Lote' as const),
        data: item.data,
        forma: item.forma,
        valorCentavos: item.valorCentavos,
      }));
  });

  const consulta = consultarPeriodo(vendas, inicioMes, fimMes);
  if (consulta.tipo !== 'sucesso') throw new RangeError(consulta.mensagem);
  const totalRecebidoCentavos = somarCentavos(recebimentos.map((item) => item.valorCentavos));
  if (totalRecebidoCentavos !== consulta.valor.recebidosCentavos) {
    throw new RangeError('O detalhamento de recebimentos diverge da consulta do período.');
  }

  const vendasDoMes = vendas.filter((venda) => noMes(venda.dataVenda));
  const saldos = vendas
    .filter((venda) => venda.saldoCentavos > 0)
    .map((venda) => ({ venda, saldoCentavos: venda.saldoCentavos }));
  const parcelasAtrasadas = vendas.flatMap((venda) =>
    venda.parcelas
      .filter((parcela) => parcela.situacao === 'Atrasado')
      .map((parcela) => ({ venda, parcela })),
  );

  return {
    inicioMes,
    fimMes,
    recebimentos,
    vendasDoMes,
    saldos,
    parcelasAtrasadas,
    totalRecebidoCentavos,
    quantidadeVendasMes: vendasDoMes.length,
    totalVendasMesCentavos: somarCentavos(vendasDoMes.map((venda) => venda.valorTotalCentavos)),
    totalEmAbertoCentavos: somarCentavos(saldos.map((item) => item.saldoCentavos)),
    totalAtrasadoCentavos: somarCentavos(
      parcelasAtrasadas.map((item) => item.parcela.valorCentavos),
    ),
  };
}
