import { compararDatasCivis } from '../vendas/data-civil';
import { validarCentavos } from '../vendas/dinheiro';
import { projetarVendas, validarVenda } from '../vendas/venda.calculos';
import { Resultado, Venda } from '../vendas/venda.modelos';
import {
  AlocacaoPagamento,
  ComandoCorrecaoPagamento,
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

export interface OperacoesPreparacaoCorrecaoPagamento {
  readonly validarConjunto: (vendas: readonly Venda[], referencia: string) => void;
}

const operacoesPadrao: OperacoesPreparacaoRecebimento = {
  alocar: (parcela, valorCentavos) => prepararAlocacao(parcela, valorCentavos),
  validarConjunto: (vendas, referencia) => {
    projetarVendas(vendas, referencia);
  },
};

const operacoesCorrecaoPadrao: OperacoesPreparacaoCorrecaoPagamento = {
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

/** Substitui atomicamente os dados do mesmo pagamento individual, sem criar outra identidade. */
export function prepararCorrecaoPagamento(
  vendas: readonly Venda[],
  comando: ComandoCorrecaoPagamento,
  referencia: string,
  operacoes: OperacoesPreparacaoCorrecaoPagamento = operacoesCorrecaoPadrao,
): Resultado<readonly Venda[]> {
  try {
    const campos = ['vendaId', 'recebimentoId', 'valorCentavos', 'data', 'forma', 'observacao'];
    if (
      !comando ||
      typeof comando !== 'object' ||
      Object.keys(comando).some((campo) => !campos.includes(campo)) ||
      !campos.every((campo) => Object.hasOwn(comando, campo)) ||
      typeof comando.vendaId !== 'string' ||
      typeof comando.recebimentoId !== 'string' ||
      typeof comando.valorCentavos !== 'number' ||
      typeof comando.data !== 'string' ||
      typeof comando.forma !== 'string' ||
      typeof comando.observacao !== 'string'
    ) {
      return {
        tipo: 'validacao',
        codigo: 'comando-correcao-pagamento-invalido',
        mensagem: 'Informe venda, recebimento, valor, data, forma e observação para corrigir.',
      };
    }

    const venda = vendas.find((item) => item.id === comando.vendaId);
    if (!venda) {
      return {
        tipo: 'inexistencia',
        codigo: 'venda-inexistente',
        mensagem: 'Venda demonstrativa não encontrada.',
      };
    }
    validarVenda(venda, referencia);
    const correspondencias = vendas.flatMap((item) =>
      item.recebimentos
        .filter((recebimento) => recebimento.id === comando.recebimentoId)
        .map((recebimento) => ({ venda: item, recebimento })),
    );
    if (correspondencias.length === 0) {
      return {
        tipo: 'inexistencia',
        codigo: 'recebimento-inexistente',
        mensagem: 'O recebimento informado não existe mais.',
      };
    }
    if (correspondencias.length !== 1) {
      return {
        tipo: 'validacao',
        codigo: 'recebimento-duplicado',
        mensagem: 'O identificador do recebimento não é único; a correção foi recusada.',
      };
    }
    const alvo = correspondencias[0];
    if (alvo.venda.id !== venda.id) {
      return {
        tipo: 'inelegibilidade',
        codigo: 'recebimento-de-outra-venda',
        mensagem: 'O recebimento não pertence à venda informada.',
      };
    }
    if (venda.statusAdministrativo !== 'Ativo') {
      return {
        tipo: 'inelegibilidade',
        codigo: 'venda-nao-ativa',
        mensagem: 'Somente recebimentos de vendas Ativas podem ser corrigidos.',
      };
    }
    const recebimento = alvo.recebimento;
    if (recebimento.origem !== 'individual') {
      return {
        tipo: 'inelegibilidade',
        codigo: 'recebimento-historico-nao-editavel',
        mensagem: 'Entrada e recebimentos históricos em lote não podem ser corrigidos.',
      };
    }
    const parcelaId = recebimento.alocacoes[0]?.parcelaId;
    const parcela = venda.parcelas.find((item) => item.id === parcelaId);
    if (recebimento.alocacoes.length !== 1 || !parcela) {
      return {
        tipo: 'inelegibilidade',
        codigo: 'recebimento-individual-invalido',
        mensagem: 'O recebimento individual não está vinculado a uma única parcela válida.',
      };
    }

    const valorCentavos = validarCentavos(comando.valorCentavos);
    if (valorCentavos < parcela.valorCentavos) {
      return {
        tipo: 'validacao',
        codigo: 'valor-corrigido-inferior-ao-base',
        mensagem: 'O valor corrigido deve ser igual ou superior ao valor-base da parcela.',
      };
    }
    if (Array.from(comando.observacao).length > 20) {
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
        codigo: 'dados-correcao-pagamento-invalidos',
        mensagem: 'Informe forma aceita e data entre a venda e a referência da sessão.',
      };
    }

    const atualizado: PagamentoIndividualDemonstrativo = {
      ...recebimento,
      valorCentavos,
      data: comando.data,
      forma: comando.forma,
      observacao: comando.observacao,
      acrescimoCentavos: valorCentavos - parcela.valorCentavos,
      alocacoes: [{ parcelaId: parcela.id, valorCentavos }],
    };
    const preparadas = vendas.map((item) =>
      item.id === venda.id
        ? {
            ...item,
            recebimentos: item.recebimentos.map((registro) =>
              registro.id === recebimento.id ? atualizado : registro,
            ),
          }
        : item,
    );
    operacoes.validarConjunto(preparadas, referencia);
    return {
      tipo: 'sucesso',
      valor: preparadas,
      mensagem: 'Correção do recebimento individual preparada integralmente.',
    };
  } catch (erro) {
    return erro instanceof RangeError
      ? { tipo: 'validacao', codigo: 'correcao-pagamento-invalida', mensagem: erro.message }
      : {
          tipo: 'falha',
          codigo: 'falha-correcao-pagamento',
          mensagem: 'Não foi possível corrigir o recebimento. O estado anterior foi preservado.',
        };
  }
}
