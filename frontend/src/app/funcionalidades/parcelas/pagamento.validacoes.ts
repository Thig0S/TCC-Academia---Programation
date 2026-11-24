import { compararDatasCivis } from '../vendas/data-civil';
import { validarCentavos } from '../vendas/dinheiro';
import { projetarVendas, validarVenda } from '../vendas/venda.calculos';
import { Resultado, Venda } from '../vendas/venda.modelos';
import {
  AlocacaoPagamento,
  ComandoPagamento,
  formaAceita,
  PagamentoIndividualDemonstrativo,
} from './pagamento.modelos';
import { prepararAlocacao } from './parcela.calculos';
import { Parcela } from './parcela.modelos';

export interface OperacoesPreparacaoRecebimento {
  readonly alocar: (parcela: Parcela, valorCentavos?: number) => AlocacaoPagamento;
  readonly validarConjunto: (vendas: readonly Venda[], referencia: string) => void;
}

const operacoesPadrao: OperacoesPreparacaoRecebimento = {
  alocar: (parcela, valorCentavos) => prepararAlocacao(parcela, valorCentavos),
  validarConjunto: (vendas, referencia) => {
    projetarVendas(vendas, referencia);
  },
};

export function selecionarParcelas(
  venda: Venda,
  ids: readonly string[],
  referencia: string,
): Resultado<readonly Parcela[]> {
  validarVenda(venda, referencia);
  const pagos = new Set(
    venda.recebimentos.flatMap((recebimento) =>
      recebimento.alocacoes.map((item) => item.parcelaId),
    ),
  );
  const pendentes = venda.parcelas
    .filter((parcela) => !pagos.has(parcela.id))
    .sort((a, b) => a.numero - b.numero);
  const selecao = new Set(ids);
  const prefixo = pendentes.slice(0, ids.length);
  if (
    !ids.length ||
    selecao.size !== ids.length ||
    prefixo.length !== ids.length ||
    !prefixo.every((parcela) => selecao.has(parcela.id))
  ) {
    return {
      tipo: 'inelegibilidade',
      codigo: 'selecao-nao-sequencial',
      mensagem: 'Selecione parcelas únicas e consecutivas desde a primeira pendente desta venda.',
    };
  }
  return {
    tipo: 'sucesso',
    valor: prefixo,
    mensagem: 'Seleção sequencial preparada sem registrar recebimento.',
  };
}

/** Revalida contra o conjunto fornecido agora. Nenhuma preparação anterior é confirmada por referência. */
export function prepararPagamento(
  vendas: readonly Venda[],
  comando: ComandoPagamento,
  referencia: string,
  recebimentoId: string,
  operacoes: OperacoesPreparacaoRecebimento = operacoesPadrao,
): Resultado<readonly Venda[]> {
  try {
    const camposRequeridos = ['vendaId', 'parcelaId', 'data', 'forma'];
    const camposOpcionais = ['valorCentavos', 'observacao'];
    if (
      !comando ||
      typeof comando !== 'object' ||
      Object.keys(comando).some(
        (campo) => !camposRequeridos.includes(campo) && !camposOpcionais.includes(campo),
      ) ||
      !camposRequeridos.every((campo) => Object.hasOwn(comando, campo)) ||
      camposRequeridos.some(
        (campo) => typeof (comando as unknown as Record<string, unknown>)[campo] !== 'string',
      ) ||
      (Object.hasOwn(comando, 'valorCentavos') && typeof comando.valorCentavos !== 'number') ||
      (Object.hasOwn(comando, 'observacao') && typeof comando.observacao !== 'string')
    )
      return {
        tipo: 'validacao',
        codigo: 'comando-pagamento-invalido',
        mensagem: 'Informe somente a venda, parcela, data, forma, valor e observação do pagamento.',
      };
    const venda = vendas.find((item) => item.id === comando.vendaId);
    if (!venda)
      return {
        tipo: 'inexistencia',
        codigo: 'venda-inexistente',
        mensagem: 'Venda demonstrativa não encontrada.',
      };
    const elegivel = selecionarParcelas(venda, [comando.parcelaId], referencia);
    if (elegivel.tipo !== 'sucesso') return elegivel;
    const parcela = elegivel.valor[0];
    const valorBase = validarCentavos(parcela.valorCentavos);
    if (!Number.isSafeInteger(valorBase) || valorBase <= 0) {
      return {
        tipo: 'validacao',
        codigo: 'valor-parcela-invalido',
        mensagem: 'A parcela não possui um valor integral válido.',
      };
    }
    const valor = validarCentavos(comando.valorCentavos ?? valorBase);
    if (valor < valorBase) {
      return {
        tipo: 'validacao',
        codigo: 'valor-recebido-inferior-ao-base',
        mensagem: 'O valor recebido deve ser igual ou superior ao valor-base da parcela.',
      };
    }
    const observacao = comando.observacao ?? '';
    if (Array.from(observacao).length > 20) {
      return {
        tipo: 'validacao',
        codigo: 'observacao-longa-demais',
        mensagem: 'A observação deve ter no máximo 20 caracteres.',
      };
    }
    if (
      !formaAceita(comando.forma) ||
      compararDatasCivis(comando.data, venda.dataVenda) < 0 ||
      compararDatasCivis(comando.data, referencia) > 0
    ) {
      return {
        tipo: 'validacao',
        codigo: 'dados-recebimento-invalidos',
        mensagem: 'Informe uma forma aceita e data entre a venda e a referência da sessão.',
      };
    }
    const acrescimoCentavos = valor - valorBase;
    const recebimento: PagamentoIndividualDemonstrativo = {
      id: recebimentoId,
      data: comando.data,
      forma: comando.forma,
      valorCentavos: valor,
      origem: 'individual',
      acrescimoCentavos,
      observacao,
      alocacoes: [operacoes.alocar(parcela, valor)],
    };
    const preparadas = vendas.map((item) =>
      item.id === venda.id ? { ...item, recebimentos: [...item.recebimentos, recebimento] } : item,
    );
    operacoes.validarConjunto(preparadas, referencia);
    return {
      tipo: 'sucesso',
      valor: preparadas,
      mensagem: 'Recebimento demonstrativo preparado integralmente.',
    };
  } catch (erro) {
    return erro instanceof RangeError
      ? { tipo: 'validacao', codigo: 'recebimento-invalido', mensagem: erro.message }
      : {
          tipo: 'falha',
          codigo: 'falha-preparacao-lote',
          mensagem: 'Não foi possível preparar o recebimento. Nenhuma parcela foi alterada.',
        };
  }
}
