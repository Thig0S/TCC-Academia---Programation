import { compararDatasCivis } from '../../funcionalidades/vendas/data-civil';
import { somarCentavos, validarCentavos } from '../../funcionalidades/vendas/dinheiro';
import { projetarVendas, validarVenda } from '../../funcionalidades/vendas/venda.calculos';
import { Resultado, Venda } from '../../funcionalidades/vendas/venda.modelos';
import { AlocacaoPagamento, formaAceita } from '../../funcionalidades/parcelas/pagamento.modelos';
import { prepararAlocacao } from '../../funcionalidades/parcelas/parcela.calculos';
import { Parcela } from '../../funcionalidades/parcelas/parcela.modelos';

/** Comando restrito à construção dos lotes históricos sintéticos do seed. */
export interface PreparacaoPagamentoHistorico {
  readonly vendaId: string;
  readonly parcelaIds: readonly string[];
  readonly valorCentavos: number;
  readonly data: string;
  readonly forma: string;
}

/** Constrói recebimentos históricos em lote; não deve ser usado por comandos da sessão. */
export function prepararPagamentoHistorico(
  vendas: readonly Venda[],
  comando: PreparacaoPagamentoHistorico,
  referencia: string,
  recebimentoId: string,
  operacoes: {
    readonly alocar: (parcela: Parcela) => AlocacaoPagamento;
    readonly validarConjunto: (vendas: readonly Venda[], referencia: string) => void;
  } = {
    alocar: prepararAlocacao,
    validarConjunto: (conjunto, data) => {
      projetarVendas(conjunto, data);
    },
  },
): Resultado<readonly Venda[]> {
  try {
    const venda = vendas.find((item) => item.id === comando.vendaId);
    if (!venda)
      return {
        tipo: 'inexistencia',
        codigo: 'venda-inexistente',
        mensagem: 'Venda demonstrativa não encontrada.',
      };

    validarVenda(venda, referencia);
    const pagos = new Set(
      venda.recebimentos.flatMap((recebimento) =>
        recebimento.alocacoes.map((alocacao) => alocacao.parcelaId),
      ),
    );
    const pendentes = venda.parcelas
      .filter((parcela) => !pagos.has(parcela.id))
      .sort((a, b) => a.numero - b.numero);
    const ids = new Set(comando.parcelaIds);
    const parcelas = pendentes.slice(0, comando.parcelaIds.length);
    if (
      !comando.parcelaIds.length ||
      ids.size !== comando.parcelaIds.length ||
      parcelas.length !== comando.parcelaIds.length ||
      !parcelas.every((parcela) => ids.has(parcela.id))
    )
      return {
        tipo: 'inelegibilidade',
        codigo: 'selecao-nao-sequencial',
        mensagem: 'Selecione parcelas únicas e consecutivas desde a primeira pendente desta venda.',
      };

    const valor = somarCentavos(parcelas.map((parcela) => parcela.valorCentavos));
    if (validarCentavos(comando.valorCentavos) !== valor)
      return {
        tipo: 'validacao',
        codigo: 'valor-nao-integral',
        mensagem: 'O valor recebido deve ser exatamente a soma integral das parcelas selecionadas.',
      };
    if (
      !formaAceita(comando.forma) ||
      compararDatasCivis(comando.data, venda.dataVenda) < 0 ||
      compararDatasCivis(comando.data, referencia) > 0
    )
      return {
        tipo: 'validacao',
        codigo: 'dados-recebimento-invalidos',
        mensagem: 'Informe uma forma aceita e data entre a venda e a referência da sessão.',
      };

    const recebimento = {
      id: recebimentoId,
      data: comando.data,
      forma: comando.forma,
      valorCentavos: valor,
      alocacoes: parcelas.map((parcela) => operacoes.alocar(parcela)),
    };
    const preparadas = vendas.map((item) =>
      item.id === venda.id ? { ...item, recebimentos: [...item.recebimentos, recebimento] } : item,
    );
    operacoes.validarConjunto(preparadas, referencia);
    return {
      tipo: 'sucesso',
      valor: preparadas,
      mensagem: 'Recebimento histórico sintético preparado integralmente.',
    };
  } catch (erro) {
    return erro instanceof RangeError
      ? { tipo: 'validacao', codigo: 'recebimento-invalido', mensagem: erro.message }
      : {
          tipo: 'falha',
          codigo: 'falha-preparacao-lote-historico',
          mensagem:
            'Não foi possível preparar o recebimento histórico. Nenhuma parcela foi alterada.',
        };
  }
}
