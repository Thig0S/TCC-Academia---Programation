import { prepararPagamento } from '../../funcionalidades/parcelas/pagamento.validacoes';
import { adicionarMeses, interpretarDataCivil } from '../../funcionalidades/vendas/data-civil';
import { projetarVendas } from '../../funcionalidades/vendas/venda.calculos';
import { Resultado, Venda } from '../../funcionalidades/vendas/venda.modelos';
import { prepararCadastro } from '../../funcionalidades/vendas/venda.validacoes';

function exigirSucesso<T>(resultado: Resultado<T>): T {
  if (resultado.tipo !== 'sucesso') throw new RangeError(resultado.mensagem);
  return resultado.valor;
}

/** Dados inteiramente inventados, sem identificação pessoal plausível ou fonte externa. */
export function criarDadosDemonstrativos(referencia: string): readonly Venda[] {
  const dia = interpretarDataCivil(referencia).dia;
  const anterior = adicionarMeses(referencia, -1);
  // Se o mês anterior não tem o dia-base, dois meses antes o preservam.
  const distanciaProxima = interpretarDataCivil(anterior).dia === dia ? 1 : 2;
  let vendas: readonly Venda[] = [];
  for (let indice = 0; indice < 12; indice++) {
    const grupo = indice % 4;
    const meses = grupo === 0 ? 0 : grupo === 1 ? distanciaProxima : 3;
    const dataVenda = adicionarMeses(referencia, -meses);
    const id = `seed/venda/${indice + 1}`;
    const comEntrada = indice % 2 === 0;
    const venda = exigirSucesso(
      prepararCadastro(
        {
          cliente: {
            nome: `Cliente DEMO ${indice < 6 ? 'Aurora' : 'Aurora Azul'} ${indice + 1}`,
            cpf: `CPF-DEMO-${indice + 1}`,
            telefone: `TEL-DEMO-${indice + 1}`,
            descricao: 'Registro sintético para demonstração, sem dados pessoais reais.',
          },
          dataVenda,
          valorTotalCentavos: comEntrada ? 100000 : 80000,
          quantidadeParcelas: 4,
          entrada: comEntrada ? { valorCentavos: 20000, data: dataVenda, forma: 'Pix' } : null,
        },
        referencia,
        id,
      ),
    );
    vendas = [...vendas, venda];
    const quantidadePaga = grupo === 3 ? 4 : grupo === 1 ? distanciaProxima - 1 : 0;
    if (quantidadePaga > 0) {
      vendas = exigirSucesso(
        prepararPagamento(
          vendas,
          {
            vendaId: id,
            parcelaIds: venda.parcelas.slice(0, quantidadePaga).map((parcela) => parcela.id),
            valorCentavos: quantidadePaga * 20000,
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
