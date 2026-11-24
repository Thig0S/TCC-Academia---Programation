import { ProjecaoVenda } from './venda.calculos';
import { CriterioOrdenacaoVenda, ordenarVendas } from './venda.ordenacao';

function venda(
  id: string,
  nome: string,
  dataVenda: string,
  proximoVencimento: string | null,
): ProjecaoVenda {
  return {
    id,
    statusAdministrativo: 'Ativo',
    cliente: { nome, cpf: '90000000175', telefone: '00900000001', descricao: null },
    dataVenda,
    valorTotalCentavos: 10000,
    valorTotalEfetivoCentavos: 10000,
    entrada: null,
    parcelas: [],
    recebimentos: [],
    totalPagoCentavos: 0,
    saldoCentavos: 10000,
    quantidadePaga: 0,
    proximoVencimento,
    situacao: 'Em aberto',
  };
}

describe('ordenarVendas', () => {
  it.each([
    ['cliente', ['id-a', 'id-z', 'id-b']],
    ['data-venda', ['id-a', 'id-b', 'id-z']],
    ['vencimento', ['id-a', 'id-z', 'id-b']],
  ] as const)('ordena por %s na direção definida e desempata por ID crescente', (criterio, ids) => {
    const vendas = [
      venda('id-z', 'Ágata', '2027-02-01', '2027-02-20'),
      venda('id-b', 'Bruno', '2027-02-01', null),
      venda('id-a', 'agata', '2027-01-01', '2027-02-20'),
    ];

    expect(
      ordenarVendas(vendas, criterio as CriterioOrdenacaoVenda).map((item) => item.id),
    ).toEqual(ids);
    expect(vendas.map((item) => item.id)).toEqual(['id-z', 'id-b', 'id-a']);
  });

  it('ordena datas civis crescentes e põe vencimentos ausentes depois dos existentes', () => {
    const vendas = [
      venda('id-mais-tarde', 'A', '2027-01-01', '2027-03-01'),
      venda('id-sem-data', 'B', '2027-01-01', null),
      venda('id-anterior', 'C', '2026-12-31', '2027-02-01'),
      venda('id-sem-data-2', 'D', '2026-12-31', null),
    ];

    expect(ordenarVendas(vendas, 'data-venda').map((item) => item.id)).toEqual([
      'id-anterior',
      'id-sem-data-2',
      'id-mais-tarde',
      'id-sem-data',
    ]);
    expect(ordenarVendas(vendas, 'vencimento').map((item) => item.id)).toEqual([
      'id-anterior',
      'id-mais-tarde',
      'id-sem-data',
      'id-sem-data-2',
    ]);
  });

  it('mantém ordem de origem no critério inicial, sempre sem mutar a coleção', () => {
    const vendas = [
      venda('b', 'Bruno', '2027-01-01', null),
      venda('a', 'Ágata', '2026-01-01', '2026-02-01'),
    ];
    const original = [...vendas];

    const resultado = ordenarVendas(vendas);

    expect(resultado).not.toBe(vendas);
    expect(resultado).toEqual(original);
    expect(vendas).toEqual(original);
  });
});
