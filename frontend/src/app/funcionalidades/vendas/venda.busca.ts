import { interpretarDataCivil } from './data-civil';
import { VendaResumoLeitura } from '../../nucleo/dados/modelos-leitura';
import { SituacaoVenda } from './venda.modelos';

type VendaPesquisavel = Pick<
  VendaResumoLeitura,
  'id' | 'cliente' | 'dataVenda' | 'situacao' | 'proximoVencimento'
>;

export type FiltroSituacaoVenda = 'Todas' | Exclude<SituacaoVenda, 'Quitada'>;

function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

function correspondeTexto(venda: VendaPesquisavel, termo: string): boolean {
  const consulta = normalizarTexto(termo);
  if (
    [venda.cliente.nome, venda.cliente.cpf, venda.cliente.telefone].some((campo) =>
      normalizarTexto(campo).includes(consulta),
    )
  ) {
    return true;
  }

  if (!/^[\d.\-()+\s]+$/.test(termo) || !/\d/.test(termo)) return false;
  const digitosConsulta = somenteDigitos(termo);
  return [venda.cliente.cpf, venda.cliente.telefone].some((campo) =>
    somenteDigitos(campo).includes(digitosConsulta),
  );
}

/** Filtra somente a coleção recebida, preservando ordem e sem alterar as projeções. */
export function buscarVendas<T extends VendaPesquisavel>(
  vendas: readonly T[],
  termo: string,
  situacao: FiltroSituacaoVenda = 'Todas',
): readonly T[] {
  const consulta = termo.trim();
  const ehDataCompleta = /^\d{2}\/\d{2}\/\d{4}$/.test(consulta);
  let dataCivil: string | null = null;

  if (ehDataCompleta) {
    dataCivil = `${consulta.slice(6, 10)}-${consulta.slice(3, 5)}-${consulta.slice(0, 2)}`;
    try {
      interpretarDataCivil(dataCivil);
    } catch {
      return [];
    }
  }

  return vendas.filter((venda) => {
    if (situacao !== 'Todas' && venda.situacao !== situacao) return false;
    if (!consulta) return true;
    if (dataCivil !== null) return venda.dataVenda === dataCivil;
    return correspondeTexto(venda, consulta);
  });
}
