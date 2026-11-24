import { ordinalCivil } from '../vendas/data-civil';
import { PagamentoDemonstrativo, FormaPagamento, AlocacaoPagamento } from './pagamento.modelos';
import { validarCentavos } from '../vendas/dinheiro';
import { Parcela, SituacaoParcela } from './parcela.modelos';

export interface ProjecaoParcela extends Parcela {
  readonly situacao: SituacaoParcela;
  readonly dataPagamento: string | null;
  readonly formaPagamento: FormaPagamento | null;
}

export function prepararAlocacao(
  parcela: Parcela,
  valorCentavos = parcela.valorCentavos,
): AlocacaoPagamento {
  return { parcelaId: parcela.id, valorCentavos: validarCentavos(valorCentavos) };
}

export function projetarParcela(
  parcela: Parcela,
  recebimentos: readonly PagamentoDemonstrativo[],
  referencia: string,
): ProjecaoParcela {
  const distancia = ordinalCivil(parcela.vencimento) - ordinalCivil(referencia);
  const pagamento = recebimentos.find((recebimento) =>
    recebimento.alocacoes.some((item) => item.parcelaId === parcela.id),
  );
  return {
    ...parcela,
    situacao: pagamento
      ? 'Paga'
      : distancia < 0
        ? 'Atrasado'
        : distancia <= 7
          ? 'Próximos dias'
          : 'Aberto',
    dataPagamento: pagamento?.data ?? null,
    formaPagamento: pagamento?.forma ?? null,
  };
}
