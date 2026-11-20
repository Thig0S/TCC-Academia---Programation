import { ProjecaoParcela } from '../parcelas/parcela.calculos';
import { ProjecaoVenda } from '../vendas/venda.calculos';

export interface ParcelaResumoVisaoGeral {
  readonly venda: ProjecaoVenda;
  readonly parcela: ProjecaoParcela;
}

/** Seleciona até cinco vendas recentes, sem alterar a ordem da fonte em caso de empate. */
export function selecionarVendasRecentes(
  vendas: readonly ProjecaoVenda[],
): readonly ProjecaoVenda[] {
  return vendas
    .map((venda, indice) => ({ venda, indice }))
    .sort((a, b) => b.venda.dataVenda.localeCompare(a.venda.dataVenda) || a.indice - b.indice)
    .slice(0, 5)
    .map(({ venda }) => venda);
}

/** Seleciona parcelas pendentes dentro da janela já classificada pela projeção financeira. */
export function selecionarParcelasProximas(
  vendas: readonly ProjecaoVenda[],
): readonly ParcelaResumoVisaoGeral[] {
  return selecionarParcelas(vendas, 'Próximos dias');
}

/** Seleciona parcelas pendentes vencidas, preservando a ordem de origem nos empates. */
export function selecionarParcelasAtrasadas(
  vendas: readonly ProjecaoVenda[],
): readonly ParcelaResumoVisaoGeral[] {
  return selecionarParcelas(vendas, 'Atrasado');
}

function selecionarParcelas(
  vendas: readonly ProjecaoVenda[],
  situacao: ProjecaoParcela['situacao'],
): readonly ParcelaResumoVisaoGeral[] {
  return vendas
    .flatMap((venda, indiceVenda) =>
      venda.parcelas.map((parcela, indiceParcela) => ({
        venda,
        parcela,
        indiceVenda,
        indiceParcela,
      })),
    )
    .filter(({ parcela }) => parcela.situacao === situacao)
    .sort(
      (a, b) =>
        a.parcela.vencimento.localeCompare(b.parcela.vencimento) ||
        a.indiceVenda - b.indiceVenda ||
        a.indiceParcela - b.indiceParcela,
    )
    .slice(0, 5)
    .map(({ venda, parcela }) => ({ venda, parcela }));
}
