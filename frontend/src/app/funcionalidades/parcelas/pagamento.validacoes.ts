import { compararDatasCivis } from '../vendas/data-civil';
import { somarCentavos, validarCentavos } from '../vendas/dinheiro';
import { projetarVendas, validarVenda } from '../vendas/venda.calculos';
import { Resultado, Venda } from '../vendas/venda.modelos';
import { ComandoPagamento, formaAceita } from './pagamento.modelos';
import { prepararAlocacao } from './parcela.calculos';
import { Parcela } from './parcela.modelos';

export function selecionarParcelas(venda: Venda, ids: readonly string[], referencia: string): Resultado<readonly Parcela[]> {
  validarVenda(venda, referencia);
  const pagos = new Set(venda.recebimentos.flatMap((recebimento) => recebimento.alocacoes.map((item) => item.parcelaId)));
  const pendentes = venda.parcelas.filter((parcela) => !pagos.has(parcela.id)).sort((a, b) => a.numero - b.numero);
  const selecao = new Set(ids);
  const prefixo = pendentes.slice(0, ids.length);
  if (!ids.length || selecao.size !== ids.length || prefixo.length !== ids.length || !prefixo.every((parcela) => selecao.has(parcela.id))) {
    return { tipo: 'inelegibilidade', codigo: 'selecao-nao-sequencial', mensagem: 'Selecione parcelas únicas e consecutivas desde a primeira pendente desta venda.' };
  }
  return { tipo: 'sucesso', valor: prefixo, mensagem: 'Seleção sequencial preparada sem registrar recebimento.' };
}

/** Revalida contra o conjunto fornecido agora. Nenhuma preparação anterior é confirmada por referência. */
export function prepararPagamento(vendas: readonly Venda[], comando: ComandoPagamento, referencia: string, recebimentoId: string): Resultado<readonly Venda[]> {
  try {
    const venda = vendas.find((item) => item.id === comando.vendaId);
    if (!venda) return { tipo: 'inexistencia', codigo: 'venda-inexistente', mensagem: 'Venda demonstrativa não encontrada.' };
    const selecao = selecionarParcelas(venda, comando.parcelaIds, referencia);
    if (selecao.tipo !== 'sucesso') return selecao;
    const valor = somarCentavos(selecao.valor.map((parcela) => parcela.valorCentavos));
    if (validarCentavos(comando.valorCentavos) !== valor) {
      return { tipo: 'validacao', codigo: 'valor-nao-integral', mensagem: 'O valor recebido deve ser exatamente a soma integral das parcelas selecionadas.' };
    }
    if (!formaAceita(comando.forma) || compararDatasCivis(comando.data, venda.dataVenda) < 0 || compararDatasCivis(comando.data, referencia) > 0) {
      return { tipo: 'validacao', codigo: 'dados-recebimento-invalidos', mensagem: 'Informe uma forma aceita e data entre a venda e a referência da sessão.' };
    }
    const recebimento = {
      id: recebimentoId, data: comando.data, forma: comando.forma, valorCentavos: valor,
      alocacoes: selecao.valor.map(prepararAlocacao),
    };
    const preparadas = vendas.map((item) => item.id === venda.id ? { ...item, recebimentos: [...item.recebimentos, recebimento] } : item);
    projetarVendas(preparadas, referencia);
    return { tipo: 'sucesso', valor: preparadas, mensagem: 'Recebimento demonstrativo preparado integralmente.' };
  } catch (erro) {
    return erro instanceof RangeError
      ? { tipo: 'validacao', codigo: 'recebimento-invalido', mensagem: erro.message }
      : { tipo: 'falha', codigo: 'falha-preparacao-lote', mensagem: 'Não foi possível preparar o recebimento. Nenhuma parcela foi alterada.' };
  }
}
