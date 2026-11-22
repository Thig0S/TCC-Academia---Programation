import { ComandoPagamento, formaAceita } from '../../parcelas/pagamento.modelos';
import { selecionarParcelas } from '../../parcelas/pagamento.validacoes';
import { adicionarMeses, compararDatasCivis } from '../data-civil';
import { interpretarDinheiro } from '../dinheiro';
import { cpfValido, telefoneValido } from '../identificacao.validacoes';
import { ComandoCadastro, ComandoEdicaoCliente, Venda } from '../venda.modelos';
import { prepararCadastro } from '../venda.validacoes';
import { projetarVenda } from '../venda.calculos';

export interface RascunhoCliente {
  nome: string;
  cpf: string;
  telefone: string;
  descricao: string;
}

export interface RascunhoCadastro extends RascunhoCliente {
  dataVenda: string;
  valorTotal: string;
  temEntrada: '' | 'sim' | 'nao';
  valorEntrada: string;
  formaEntrada: string;
  quantidadeParcelas: string;
}

export interface RascunhoRecebimento {
  data: string;
  forma: string;
}

export type ErrosCampos<T> = Partial<Record<keyof T, string>>;
export type Conversao<T, R> =
  | { readonly tipo: 'sucesso'; readonly comando: T }
  | { readonly tipo: 'invalido'; readonly erros: ErrosCampos<R>; readonly resumo: string | null };

export function iniciarCadastro(referencia: string): RascunhoCadastro {
  return {
    nome: '',
    cpf: '',
    telefone: '',
    descricao: '',
    dataVenda: referencia,
    valorTotal: '',
    temEntrada: '',
    valorEntrada: '',
    formaEntrada: '',
    quantidadeParcelas: '',
  };
}

export function copiarCliente(cliente: ComandoCadastro['cliente']): RascunhoCliente {
  return {
    nome: cliente.nome,
    cpf: cliente.cpf,
    telefone: cliente.telefone,
    descricao: cliente.descricao ?? '',
  };
}

export function errosCliente(rascunho: RascunhoCliente): ErrosCampos<RascunhoCliente> {
  const erros: ErrosCampos<RascunhoCliente> = {};
  if (!rascunho.nome.trim()) erros.nome = 'Informe o nome do cliente.';
  if (!cpfValido(rascunho.cpf)) erros.cpf = 'Informe CPF com 11 dígitos e verificadores válidos.';
  if (!telefoneValido(rascunho.telefone))
    erros.telefone = 'Informe telefone com DDD e 10 ou 11 dígitos, sem +55.';
  return erros;
}

function dinheiro<T>(texto: string, campo: keyof T, erros: ErrosCampos<T>): number | null {
  try {
    const valor = interpretarDinheiro(texto);
    if (valor === 0) throw new RangeError('Informe um valor maior que zero.');
    return valor;
  } catch (erro) {
    erros[campo] = erro instanceof RangeError ? erro.message : 'Informe um valor válido em reais.';
    return null;
  }
}

export function inteiroPositivo(texto: string): number | null {
  const valor = Number(texto);
  return /^\d+$/.test(texto.trim()) && Number.isSafeInteger(valor) && valor > 0 ? valor : null;
}

export function iniciarRecebimento(referencia: string): RascunhoRecebimento {
  return { data: referencia, forma: '' };
}

function erroData(data: string, inicio: string | null, fim: string): string | null {
  try {
    if (compararDatasCivis(data, fim) > 0)
      return 'A data não pode ser futura à referência da sessão.';
    if (inicio && compararDatasCivis(data, inicio) < 0)
      return 'A data não pode ser anterior à venda.';
    return null;
  } catch {
    return 'Informe uma data existente entre os anos 0001 e 9999.';
  }
}

export function converterCadastro(
  rascunho: RascunhoCadastro,
  referencia: string,
): Conversao<ComandoCadastro, RascunhoCadastro> {
  const erros: ErrosCampos<RascunhoCadastro> = errosCliente(rascunho);
  const total = dinheiro(rascunho.valorTotal, 'valorTotal', erros);
  const data = erroData(rascunho.dataVenda, null, referencia);
  if (data) erros.dataVenda = data;
  const temEntrada =
    rascunho.temEntrada === 'sim' || rascunho.temEntrada === 'nao' ? rascunho.temEntrada : null;
  if (temEntrada === null) erros.temEntrada = 'Informe se a venda possui entrada ou não.';
  const quantidade = inteiroPositivo(rascunho.quantidadeParcelas);
  if (quantidade === null)
    erros.quantidadeParcelas = 'Informe quantidade inteira positiva e segura.';
  let entrada: ComandoCadastro['entrada'] = null;
  let valorEntrada = 0;
  if (temEntrada === 'sim') {
    const valor = dinheiro(rascunho.valorEntrada, 'valorEntrada', erros);
    if (valor !== null) {
      valorEntrada = valor;
      if (total !== null && valor >= total)
        erros.valorEntrada = 'A entrada deve ser menor que o total.';
      entrada = { valorCentavos: valor, data: rascunho.dataVenda, forma: rascunho.formaEntrada };
    }
    if (!formaAceita(rascunho.formaEntrada)) erros.formaEntrada = 'Selecione a forma da entrada.';
  }
  const quantidadeFutura = quantidade === null ? null : quantidade - (temEntrada === 'sim' ? 1 : 0);
  if (temEntrada === 'sim' && quantidade !== null && quantidade < 2)
    erros.quantidadeParcelas = 'Informe ao menos duas parcelas totais quando houver entrada.';
  if (
    quantidadeFutura !== null &&
    total !== null &&
    total > valorEntrada &&
    quantidadeFutura > total - valorEntrada
  )
    erros.quantidadeParcelas = 'Cada parcela deve valer ao menos R$ 0,01.';
  if (!data && quantidadeFutura !== null && quantidadeFutura > 0) {
    try {
      adicionarMeses(rascunho.dataVenda, quantidadeFutura);
    } catch {
      erros.quantidadeParcelas =
        'Os vencimentos ultrapassam o calendário até 9999. Revise data ou quantidade.';
    }
  }
  if (Object.keys(erros).length || total === null || quantidade === null)
    return { tipo: 'invalido', erros, resumo: null };
  return {
    tipo: 'sucesso',
    comando: {
      cliente: copiarCliente(rascunho),
      dataVenda: rascunho.dataVenda,
      valorTotalCentavos: total,
      quantidadeParcelas: quantidade,
      entrada,
    },
  };
}

/** ID exclusivamente local; não reserva nem consome identificador da fonte. */
export function prepararPrevia(rascunho: RascunhoCadastro, referencia: string) {
  const conversao = converterCadastro(rascunho, referencia);
  if (conversao.tipo !== 'sucesso') return null;
  const resultado = prepararCadastro(conversao.comando, referencia, 'previa/local');
  return resultado.tipo === 'sucesso' ? projetarVenda(resultado.valor, referencia) : null;
}

export function converterEdicao(
  rascunho: RascunhoCliente,
  vendaId: string,
): Conversao<ComandoEdicaoCliente, RascunhoCliente> {
  const erros = errosCliente(rascunho);
  return Object.keys(erros).length
    ? { tipo: 'invalido', erros, resumo: null }
    : { tipo: 'sucesso', comando: { vendaId, cliente: copiarCliente(rascunho) } };
}

/** IDs são os capturados pelo formulário, jamais substituídos por novas pendências. */
export function converterRecebimento(
  rascunho: RascunhoRecebimento,
  venda: Venda,
  parcelaId: string,
  referencia: string,
): Conversao<ComandoPagamento, RascunhoRecebimento> {
  const erros: ErrosCampos<RascunhoRecebimento> = {};
  const data = erroData(rascunho.data, venda.dataVenda, referencia);
  if (data) erros.data = data;
  if (!formaAceita(rascunho.forma)) erros.forma = 'Selecione a forma do recebimento.';
  let resumo: string | null = null;
  try {
    const selecao = selecionarParcelas(venda, [parcelaId], referencia);
    if (selecao.tipo !== 'sucesso') resumo = selecao.mensagem;
  } catch {
    resumo = 'Não foi possível conferir a parcela. Feche e revise a venda.';
  }
  if (Object.keys(erros).length || resumo) return { tipo: 'invalido', erros, resumo };
  return {
    tipo: 'sucesso',
    comando: {
      vendaId: venda.id,
      parcelaId,
      data: rascunho.data,
      forma: rascunho.forma,
    },
  };
}
