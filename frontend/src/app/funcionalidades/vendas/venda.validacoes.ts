import { formaAceita } from '../parcelas/pagamento.modelos';
import { gerarVencimentos, compararDatasCivis } from './data-civil';
import { subtrairCentavos, validarCentavos } from './dinheiro';
import { prepararCliente } from './identificacao.validacoes';
import { ComandoCadastro, ComandoEdicaoCliente, Resultado, Venda } from './venda.modelos';

/** Não refaz cadastro nem parcelas; seleciona por ID e copia o histórico existente. */
export function prepararEdicaoCliente(
  vendas: readonly Venda[],
  comando: ComandoEdicaoCliente,
): Resultado<Venda> {
  try {
    const atual = vendas.find((venda) => venda.id === comando.vendaId);
    if (!atual) {
      return {
        tipo: 'inexistencia',
        codigo: 'venda-inexistente',
        mensagem: 'Venda demonstrativa não encontrada.',
      };
    }
    const cliente = prepararCliente(comando.cliente);
    if (cliente.tipo !== 'sucesso') return cliente;
    return {
      tipo: 'sucesso',
      mensagem: 'Edição dos dados do cliente preparada.',
      valor: { ...structuredClone(atual), cliente: cliente.valor },
    };
  } catch {
    return {
      tipo: 'falha',
      codigo: 'falha-preparacao-edicao',
      mensagem: 'Não foi possível preparar a edição dos dados do cliente.',
    };
  }
}

/** Prepara sem publicar. O identificador é reservado pelo chamador, não consumido aqui. */
export function prepararCadastro(
  comando: ComandoCadastro,
  referencia: string,
  id: string,
): Resultado<Venda> {
  try {
    const cliente = prepararCliente(comando.cliente);
    if (cliente.tipo !== 'sucesso') return cliente;
    const total = validarCentavos(comando.valorTotalCentavos);
    if (total === 0) throw new RangeError('O total da venda deve ser positivo.');
    if (compararDatasCivis(comando.dataVenda, referencia) > 0) {
      throw new RangeError('A data da venda não pode ser futura.');
    }
    let entrada = null;
    if (comando.entrada !== null) {
      const { valorCentavos, data, forma } = comando.entrada;
      validarCentavos(valorCentavos);
      if (
        valorCentavos === 0 ||
        valorCentavos >= total ||
        data !== comando.dataVenda ||
        !formaAceita(forma)
      ) {
        throw new RangeError(
          'Informe entrada positiva menor que o total, na data da venda e com forma aceita.',
        );
      }
      entrada = { valorCentavos, data, forma };
    }
    const saldo = subtrairCentavos(total, entrada?.valorCentavos ?? 0);
    const quantidade = comando.quantidadeParcelas;
    if (!Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > saldo) {
      throw new RangeError(
        'Informe quantidade inteira positiva, com ao menos um centavo por parcela.',
      );
    }
    const vencimentos = gerarVencimentos(comando.dataVenda, quantidade);
    const quociente = Number(BigInt(saldo) / BigInt(quantidade));
    const resto = Number(BigInt(saldo) % BigInt(quantidade));
    return {
      tipo: 'sucesso',
      mensagem: 'Venda demonstrativa preparada.',
      valor: {
        id,
        cliente: cliente.valor,
        dataVenda: comando.dataVenda,
        valorTotalCentavos: total,
        entrada,
        parcelas: vencimentos.map((vencimento, indice) => ({
          id: `${id}/parcela/${indice + 1}`,
          numero: indice + 1,
          valorCentavos: quociente + (indice < resto ? 1 : 0),
          vencimento,
        })),
        recebimentos: [],
      },
    };
  } catch (erro) {
    return erro instanceof RangeError
      ? { tipo: 'validacao', codigo: 'cadastro-invalido', mensagem: erro.message }
      : {
          tipo: 'falha',
          codigo: 'falha-preparacao',
          mensagem: 'Não foi possível preparar a venda demonstrativa.',
        };
  }
}
