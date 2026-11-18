import { projetarParcela } from '../parcelas/parcela.calculos';
import { PagamentoDemonstrativo } from '../parcelas/pagamento.modelos';
import {
  consultarPeriodo,
  projetarVenda,
  projetarVendas,
  resumirVendas,
  separarVendas,
} from './venda.calculos';
import { Venda } from './venda.modelos';
import { prepararCadastro } from './venda.validacoes';

function venda(id = 'v1', dataVenda = '2027-01-01', entrada = true): Venda {
  const resultado = prepararCadastro(
    {
      cliente: { nome: 'DEMO', cpf: '90000000175', telefone: '00900000001' },
      dataVenda,
      valorTotalCentavos: 100000,
      quantidadeParcelas: 4,
      entrada: entrada ? { valorCentavos: 20000, data: dataVenda, forma: 'Pix' } : null,
    },
    '2027-05-31',
    id,
  );
  if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
  return resultado.valor;
}
function pagar(v: Venda, quantidade: number, data = '2027-03-31'): Venda {
  const alocacoes = v.parcelas
    .slice(0, quantidade)
    .map((p) => ({ parcelaId: p.id, valorCentavos: p.valorCentavos }));
  return {
    ...v,
    recebimentos: [
      {
        id: `${v.id}/r1`,
        data,
        forma: 'Pix',
        valorCentavos: alocacoes.reduce((s, a) => s + a.valorCentavos, 0),
        alocacoes,
      },
    ],
  };
}

describe('Projeções financeiras puras', () => {
  it.each([
    ['2027-03-30', 'Atrasado'],
    ['2027-03-31', 'Próximos dias'],
    ['2027-04-07', 'Próximos dias'],
    ['2027-04-08', 'Aberto'],
  ])('classifica %s como %s', (vencimento, situacao) => {
    const p = { id: 'p1', numero: 1, valorCentavos: 20000, vencimento };
    expect(projetarParcela(p, [], '2027-03-31')).toMatchObject({
      situacao,
      dataPagamento: null,
      formaPagamento: null,
    });
    const r: PagamentoDemonstrativo = {
      id: 'r1',
      valorCentavos: 20000,
      data: '2027-03-01',
      forma: 'Dinheiro',
      alocacoes: [{ parcelaId: 'p1', valorCentavos: 20000 }],
    };
    expect(projetarParcela(p, [r], '2027-03-31')).toMatchObject({
      situacao: 'Paga',
      dataPagamento: r.data,
      formaPagamento: r.forma,
    });
  });

  it.each([
    ['2027-11-10', '2027-11-10', 'Próximos dias'],
    ['2027-11-10', '2027-11-11', 'Atrasado'],
    ['2027-05-01', '2027-04-24', 'Próximos dias'],
    ['2027-05-01', '2027-04-23', 'Aberto'],
    ['2028-01-01', '2027-12-25', 'Próximos dias'],
    ['2028-01-01', '2027-12-24', 'Aberto'],
  ])(
    'classifica vencimento %s na referência civil %s como %s',
    (vencimento, referencia, situacao) => {
      expect(
        projetarParcela(
          { id: 'p-limite', numero: 1, valorCentavos: 10000, vencimento },
          [],
          referencia,
        ).situacao,
      ).toBe(situacao);
    },
  );

  it('concilia entrada, duas parcelas pagas e próximo vencimento sem dupla contagem', () => {
    const projecao = projetarVenda(pagar(venda(), 2), '2027-03-31');
    expect(projecao).toMatchObject({
      totalPagoCentavos: 60000,
      saldoCentavos: 40000,
      quantidadePaga: 2,
      proximoVencimento: '2027-04-01',
      situacao: 'Próximos dias',
    });
    expect(
      projecao.parcelas
        .filter((p) => p.situacao !== 'Paga')
        .reduce((s, p) => s + p.valorCentavos, 0),
    ).toBe(projecao.saldoCentavos);
    expect(projetarVenda(venda(), '2027-03-01').situacao).toBe('Atrasada');
    expect(projetarVenda(venda('nova', '2027-03-31'), '2027-03-31').situacao).toBe('Em aberto');
  });

  it('reconcilia atraso no dia seguinte ao vencimento e mantém parcela paga fora do atraso', () => {
    const preparada = prepararCadastro(
      {
        cliente: { nome: 'Cliente DEMO limite', cpf: '90000000175', telefone: '00900000001' },
        dataVenda: '2027-10-10',
        valorTotalCentavos: 100000,
        quantidadeParcelas: 4,
        entrada: null,
      },
      '2028-02-01',
      'venda-limite-civil',
    );
    if (preparada.tipo !== 'sucesso') throw new Error(preparada.mensagem);

    const noVencimento = projetarVenda(preparada.valor, '2027-11-10');
    expect(noVencimento).toMatchObject({
      situacao: 'Próximos dias',
      proximoVencimento: '2027-11-10',
    });
    expect(noVencimento.parcelas[0].situacao).toBe('Próximos dias');
    expect(resumirVendas([preparada.valor], '2027-11-10').valoresEmAtrasoCentavos).toBe(0);

    const noDiaSeguinte = projetarVenda(preparada.valor, '2027-11-11');
    expect(noDiaSeguinte).toMatchObject({ situacao: 'Atrasada', proximoVencimento: '2027-11-10' });
    expect(noDiaSeguinte.parcelas[0].situacao).toBe('Atrasado');
    expect(resumirVendas([preparada.valor], '2027-11-11')).toMatchObject({
      totalEmAbertoCentavos: 100000,
      valoresEmAtrasoCentavos: 25000,
      recebidoNoMesCentavos: 0,
      vendasCadastradas: 1,
    });

    const comParcelaPaga = pagar(preparada.valor, 1, '2027-11-10');
    const depoisDePagar = projetarVenda(comParcelaPaga, '2027-11-11');
    expect(depoisDePagar).toMatchObject({
      situacao: 'Em aberto',
      totalPagoCentavos: 25000,
      saldoCentavos: 75000,
      quantidadePaga: 1,
      proximoVencimento: '2027-12-10',
    });
    expect(depoisDePagar.parcelas[0]).toMatchObject({
      situacao: 'Paga',
      dataPagamento: '2027-11-10',
      formaPagamento: 'Pix',
    });
    expect(resumirVendas([comParcelaPaga], '2027-11-11').valoresEmAtrasoCentavos).toBe(0);
  });

  it('deriva quitação, ausência de vencimento e separação de coleções sem mover registros', () => {
    const quitada = pagar(venda(), 4);
    const projecoes = projetarVendas([quitada, venda('v2')], '2027-03-31');
    expect(projecoes[0]).toMatchObject({
      saldoCentavos: 0,
      totalPagoCentavos: 100000,
      quantidadePaga: 4,
      proximoVencimento: null,
      situacao: 'Quitada',
    });
    const colecoes = separarVendas(projecoes);
    expect(colecoes.abertas.map((v) => v.id)).toEqual(['v2']);
    expect(colecoes.quitadas.map((v) => v.id)).toEqual(['v1']);
    expect(colecoes.quitadas[0]).toBe(projecoes[0]);
  });

  it('rejeita conjunto com overflow e histórico inconsistente', () => {
    const maximo = prepararCadastro(
      {
        ...venda('max', '2027-01-01', false),
        valorTotalCentavos: Number.MAX_SAFE_INTEGER,
        quantidadeParcelas: 1,
      },
      '2027-03-31',
      'max',
    );
    if (maximo.tipo !== 'sucesso') throw new Error(maximo.mensagem);
    expect(() => projetarVendas([maximo.valor, venda()], '2027-03-31')).toThrow(RangeError);
    expect(() => projetarVendas([venda(), venda()], '2027-03-31')).toThrow(RangeError);
    const paga = pagar(venda(), 2);
    expect(() =>
      projetarVenda(
        { ...paga, recebimentos: [...paga.recebimentos, ...paga.recebimentos] },
        '2027-03-31',
      ),
    ).toThrow(RangeError);
    expect(() =>
      projetarVenda(
        { ...paga, parcelas: paga.parcelas.map((p) => ({ ...p, valorCentavos: 1 })) },
        '2027-03-31',
      ),
    ).toThrow(RangeError);
  });
});

describe('Resumos globais e períodos inclusivos', () => {
  it('inclui primeiro/último dia, exclui outros meses e conta quitadas', () => {
    const vendas = [
      venda('entrada-marco', '2027-03-01'),
      pagar(venda('paga-marco', '2027-01-01', false), 4, '2027-03-31'),
      pagar(venda('fora', '2027-02-28'), 1, '2027-02-28'),
    ];
    expect(resumirVendas(vendas, '2027-03-31')).toEqual({
      totalEmAbertoCentavos: 140000,
      valoresEmAtrasoCentavos: 0,
      recebidoNoMesCentavos: 120000,
      vendasCadastradas: 3,
    });
    const periodo = consultarPeriodo(vendas, '2027-03-01', '2027-03-31');
    expect(periodo.tipo).toBe('sucesso');
    if (periodo.tipo === 'sucesso') {
      expect(periodo.valor.vendas.map((v) => v.id)).toEqual(['entrada-marco']);
      expect(periodo.valor.recebidosCentavos).toBe(120000);
    }
    const antes = resumirVendas(vendas, '2027-03-31');
    vendas.filter((v) => v.cliente.nome === 'inexistente');
    expect(resumirVendas(vendas, '2027-03-31')).toEqual(antes);
  });

  it('mês civil não é janela de trinta dias e atraso não inclui parcelas futuras', () => {
    const v = pagar(venda(), 1, '2027-03-01');
    expect(resumirVendas([v], '2027-03-31')).toMatchObject({
      recebidoNoMesCentavos: 20000,
      valoresEmAtrasoCentavos: 20000,
    });
    expect(resumirVendas([v], '2027-04-01').recebidoNoMesCentavos).toBe(0);
    expect(consultarPeriodo([v], '2027-01-01', '2027-01-01')).toMatchObject({
      tipo: 'sucesso',
      valor: { recebidosCentavos: 20000 },
    });
    expect(consultarPeriodo([v], '2027-03-01', '2027-03-01')).toMatchObject({
      tipo: 'sucesso',
      valor: { recebidosCentavos: 20000, vendas: [] },
    });
  });

  it('retorna zero e coleções vazias; rejeita intervalo inválido', () => {
    expect(resumirVendas([], '2027-03-31')).toEqual({
      totalEmAbertoCentavos: 0,
      valoresEmAtrasoCentavos: 0,
      recebidoNoMesCentavos: 0,
      vendasCadastradas: 0,
    });
    expect(separarVendas([])).toEqual({ abertas: [], quitadas: [] });
    expect(consultarPeriodo([], '2027-03-31', '2027-03-01').tipo).toBe('validacao');
    expect(consultarPeriodo([], '2027-02-29', '2027-03-31').tipo).toBe('validacao');
    expect(consultarPeriodo([], '2027-03-01', '2027-03-31')).toMatchObject({
      tipo: 'sucesso',
      valor: { vendas: [], recebidosCentavos: 0 },
    });
  });
});
