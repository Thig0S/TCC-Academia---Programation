import { EntradaDemonstrativa, PagamentoDemonstrativo } from '../parcelas/pagamento.modelos';
import { Parcela } from '../parcelas/parcela.modelos';

export interface DadosClienteVenda {
  readonly nome: string;
  readonly cpf: string;
  readonly telefone: string;
  readonly descricao: string | null;
}

export const STATUS_ADMINISTRATIVOS_VENDA = ['Ativo', 'Inativo', 'Prejuízo'] as const;
export type StatusAdministrativoVenda = (typeof STATUS_ADMINISTRATIVOS_VENDA)[number];

export function statusAdministrativoValido(valor: unknown): valor is StatusAdministrativoVenda {
  return STATUS_ADMINISTRATIVOS_VENDA.some((status) => status === valor);
}

export interface Venda {
  readonly id: string;
  readonly statusAdministrativo: StatusAdministrativoVenda;
  readonly cliente: DadosClienteVenda;
  readonly dataVenda: string;
  readonly valorTotalCentavos: number;
  readonly entrada: EntradaDemonstrativa | null;
  readonly parcelas: readonly Parcela[];
  readonly recebimentos: readonly PagamentoDemonstrativo[];
}

export interface ComandoCadastro {
  readonly cliente: {
    readonly nome: string;
    readonly cpf: string;
    readonly telefone: string;
    readonly descricao?: string | null;
  };
  readonly dataVenda: string;
  readonly valorTotalCentavos: number;
  readonly quantidadeParcelas: number;
  readonly entrada: {
    readonly valorCentavos: number;
    readonly data: string;
    readonly forma: string;
  } | null;
}

/** Correção por venda, sem campos financeiros ou temporais editáveis. */
export interface ComandoEdicaoCliente {
  readonly vendaId: string;
  readonly cliente: ComandoCadastro['cliente'];
}

export interface ComandoMudancaStatus {
  readonly vendaId: string;
  readonly status: StatusAdministrativoVenda;
}

export interface ErroValidacaoResultado {
  readonly codigo: string;
  readonly mensagem: string;
  readonly campo: string | null;
}

export type Resultado<T> =
  | { readonly tipo: 'sucesso'; readonly valor: T; readonly mensagem: string }
  | {
      readonly tipo: 'validacao' | 'inexistencia' | 'inelegibilidade' | 'falha';
      readonly codigo: string;
      readonly mensagem: string;
      readonly campo?: string;
      readonly erros?: readonly ErroValidacaoResultado[];
    };

export type SituacaoVenda = 'Quitada' | 'Atrasada' | 'Próximos dias' | 'Em aberto';
