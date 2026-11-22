import { prepararPagamento } from '../../funcionalidades/parcelas/pagamento.validacoes';
import { adicionarMeses, interpretarDataCivil } from '../../funcionalidades/vendas/data-civil';
import { somarCentavos } from '../../funcionalidades/vendas/dinheiro';
import { projetarVendas } from '../../funcionalidades/vendas/venda.calculos';
import { Resultado, Venda } from '../../funcionalidades/vendas/venda.modelos';
import { prepararCadastro } from '../../funcionalidades/vendas/venda.validacoes';
import { criarIdentificacaoSintetica } from './identificacao-sintetica';

function exigirSucesso<T>(resultado: Resultado<T>): T {
  if (resultado.tipo !== 'sucesso') throw new RangeError(resultado.mensagem);
  return resultado.valor;
}

/** Dados gerados sem fonte pessoal externa; números válidos podem coincidir com titulares. */
export function criarDadosDemonstrativos(referencia: string): readonly Venda[] {
  const { ano, mes, dia } = interpretarDataCivil(referencia);
  const indiceReferencia = (ano - 1) * 12 + mes - 1;
  const ultimoMes = 9999 * 12 - 1;
  const anterior = adicionarMeses(referencia, indiceReferencia === 0 ? 0 : -1);
  // Se o mês anterior não tem o dia-base, dois meses antes o preservam.
  const distanciaProxima = interpretarDataCivil(anterior).dia === dia ? 1 : 2;
  let vendas: readonly Venda[] = [];
  for (let indice = 0; indice < 12; indice++) {
    const grupo = indice % 4;
    const meses = grupo === 0 ? 0 : grupo === 1 ? distanciaProxima : 3;
    const indiceVenda = Math.max(0, Math.min(ultimoMes - 1, indiceReferencia - meses));
    let dataVenda = adicionarMeses(referencia, indiceVenda - indiceReferencia);
    if ((grupo === 1 && indiceReferencia === 0) || (grupo === 2 && indiceReferencia === 1)) {
      dataVenda = '0001-01-01';
    }
    // O dia 31 de dezembro exige outubro como dia-base: novembro só tem 30 dias.
    const ultimoDezembro = ano === 9999 && mes === 12;
    const historicoDezembro = ultimoDezembro && (grupo === 0 || (grupo === 1 && dia === 31));
    if (historicoDezembro) dataVenda = '9999-10-31';
    const partesVenda = interpretarDataCivil(dataVenda);
    const mesVenda = (partesVenda.ano - 1) * 12 + partesVenda.mes - 1;
    const id = `seed/venda/${indice + 1}`;
    const comEntrada = indice % 2 === 0;
    const quantidadeFuturas = Math.min(4, ultimoMes - mesVenda);
    const quantidadeParcelas = quantidadeFuturas + (comEntrada ? 1 : 0);
    const venda = exigirSucesso(
      prepararCadastro(
        {
          cliente: {
            nome: `Cliente DEMO ${indice < 6 ? 'Aurora' : 'Aurora Azul'} ${indice + 1}`,
            ...criarIdentificacaoSintetica(indice + 1),
            descricao: 'Registro gerado sinteticamente; não representa titularidade verificada.',
          },
          dataVenda,
          valorTotalCentavos: comEntrada ? 100000 : 80000,
          quantidadeParcelas,
          entrada: comEntrada ? { valorCentavos: 20000, data: dataVenda, forma: 'Pix' } : null,
        },
        referencia,
        id,
      ),
    );
    vendas = [...vendas, venda];
    const quantidadePaga =
      grupo === 3
        ? quantidadeParcelas
        : historicoDezembro
          ? 1
          : grupo === 1
            ? Math.max(0, indiceReferencia - mesVenda - 1)
            : 0;
    if (quantidadePaga > 0) {
      const pagas = new Set(
        venda.recebimentos.flatMap((recebimento) =>
          recebimento.alocacoes.map((alocacao) => alocacao.parcelaId),
        ),
      );
      const futurasPendentes = venda.parcelas.filter((parcela) => !pagas.has(parcela.id));
      const parcelasPagamento = futurasPendentes.slice(0, quantidadePaga);
      vendas = exigirSucesso(
        prepararPagamento(
          vendas,
          {
            vendaId: id,
            parcelaIds: parcelasPagamento.map((parcela) => parcela.id),
            valorCentavos: somarCentavos(parcelasPagamento.map((parcela) => parcela.valorCentavos)),
            data: referencia,
            forma: 'Dinheiro',
          },
          referencia,
          `seed/recebimento/${indice + 1}`,
        ),
      );
    }
  }
  projetarVendas(vendas, referencia);
  return vendas;
}
