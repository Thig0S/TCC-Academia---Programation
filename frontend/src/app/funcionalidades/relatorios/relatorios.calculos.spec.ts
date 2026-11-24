import { ProjecaoParcela } from '../parcelas/parcela.calculos';
import { PagamentoDemonstrativo } from '../parcelas/pagamento.modelos';
import { ProjecaoVenda } from '../vendas/venda.calculos';
import { calcularRelatorio } from './relatorios.calculos';

function parcela(
  id: string,
  numero: number,
  vencimento: string,
  situacao: ProjecaoParcela['situacao'],
  valorCentavos = 100,
): ProjecaoParcela {
  return {
    id,
    numero,
    vencimento,
    situacao,
    valorCentavos,
    dataPagamento: situacao === 'Paga' ? vencimento : null,
    formaPagamento: situacao === 'Paga' ? 'Pix' : null,
  };
}

function venda(
  id: string,
  dataVenda: string,
  opcoes: {
    readonly entrada?: ProjecaoVenda['entrada'];
    readonly recebimentos?: readonly PagamentoDemonstrativo[];
    readonly parcelas?: readonly ProjecaoParcela[];
    readonly total?: number;
    readonly saldo?: number;
  } = {},
): ProjecaoVenda {
  return {
    id,
    statusAdministrativo: 'Ativo',
    cliente: { nome: id, cpf: '90000000175', telefone: '00900000001', descricao: null },
    dataVenda,
    valorTotalCentavos: opcoes.total ?? 1000,
    entrada: opcoes.entrada ?? null,
    recebimentos: opcoes.recebimentos ?? [],
    parcelas: opcoes.parcelas ?? [],
    totalPagoCentavos: 0,
    saldoCentavos: opcoes.saldo ?? 1000,
    quantidadePaga: 0,
    proximoVencimento: null,
    situacao: (opcoes.saldo ?? 1000) === 0 ? 'Quitada' : 'Em aberto',
  };
}

function recebimento(
  id: string,
  data: string,
  valorCentavos: number,
  quantidadeAlocacoes = 1,
  parcelaIds?: readonly string[],
): PagamentoDemonstrativo {
  return {
    id,
    data,
    forma: 'Pix',
    valorCentavos,
    alocacoes: Array.from({ length: quantidadeAlocacoes }, (_, indice) => ({
      parcelaId: parcelaIds?.[indice] ?? `parcela-${id}-${indice}`,
      valorCentavos: Math.floor(valorCentavos / quantidadeAlocacoes),
    })),
  };
}

describe('Cálculos puros dos Relatórios', () => {
  it('inclui limites mensais e recebimento de venda anterior sem somar alocações do lote', () => {
    const anterior = venda('anterior', '2027-02-28', {
      entrada: { data: '2027-02-28', forma: 'Dinheiro', valorCentavos: 200 },
      parcelas: [parcela('entrada-anterior', 1, '2027-02-28', 'Paga', 200)],
      recebimentos: [
        recebimento('entrada-anterior', '2027-02-28', 200, 1, ['entrada-anterior']),
        recebimento('lote-marco', '2027-03-31', 300, 3),
      ],
    });
    const primeiroDia = venda('primeiro', '2027-03-01', {
      entrada: { data: '2027-03-01', forma: 'Pix', valorCentavos: 100 },
      parcelas: [parcela('entrada-primeiro', 1, '2027-03-01', 'Paga', 100)],
      recebimentos: [recebimento('entrada-primeiro', '2027-03-01', 100, 1, ['entrada-primeiro'])],
    });
    const fora = venda('fora', '2027-04-01', {
      recebimentos: [recebimento('lote-abril', '2027-04-01', 400)],
    });
    const fonte = [anterior, primeiroDia, fora];
    const original = structuredClone(fonte);

    const resultado = calcularRelatorio(fonte, '2027-03-15');
    expect(resultado).toMatchObject({
      inicioMes: '2027-03-01',
      fimMes: '2027-03-31',
      totalRecebidoCentavos: 400,
      quantidadeVendasMes: 1,
      totalVendasMesCentavos: 1000,
    });
    expect(resultado.recebimentos.map((item) => [item.origem, item.venda.id, item.data])).toEqual([
      ['Lote', 'anterior', '2027-03-31'],
      ['Entrada', 'primeiro', '2027-03-01'],
    ]);
    expect(resultado.recebimentos.map((item) => item.valorCentavos)).toEqual([300, 100]);
    expect(fonte).toEqual(original);
  });

  it('reconcilia entrada e lote como dois recebimentos, sem somar o metadado', () => {
    const movimento = venda('entrada-e-lote', '2027-03-01', {
      total: 200000,
      entrada: { data: '2027-03-01', forma: 'Pix', valorCentavos: 20000 },
      parcelas: [
        parcela('p1', 1, '2027-03-01', 'Paga', 20000),
        parcela('p2', 2, '2027-04-01', 'Paga', 20000),
        parcela('p3', 3, '2027-05-01', 'Paga', 20000),
      ],
      recebimentos: [
        recebimento('entrada', '2027-03-01', 20000, 1, ['p1']),
        recebimento('lote', '2027-03-31', 40000, 2, ['p2', 'p3']),
      ],
    });

    const resultado = calcularRelatorio([movimento], '2027-03-31');
    expect(
      resultado.recebimentos.map(({ origem, valorCentavos }) => [origem, valorCentavos]),
    ).toEqual([
      ['Entrada', 20000],
      ['Lote', 40000],
    ]);
    expect(resultado.totalRecebidoCentavos).toBe(60000);
  });

  it.each([
    ['2024-02-29', '2024-02-01', '2024-02-29'],
    ['0001-01-01', '0001-01-01', '0001-01-31'],
    ['9999-12-31', '9999-12-01', '9999-12-31'],
  ])('deriva mês civil completo na referência %s', (referencia, inicio, fim) => {
    expect(calcularRelatorio([], referencia)).toMatchObject({ inicioMes: inicio, fimMes: fim });
  });

  it('inclui vendas quitadas do mês, mantém posição global e retorna coleções sem truncar', () => {
    const vendas = Array.from({ length: 7 }, (_, indice) =>
      venda(`v${indice}`, `2027-05-${String(indice + 1).padStart(2, '0')}`, {
        total: 100 + indice,
        saldo: indice === 0 ? 0 : 50 + indice,
        entrada: {
          data: `2027-05-${String(indice + 1).padStart(2, '0')}`,
          forma: 'Pix',
          valorCentavos: 10,
        },
        recebimentos: [
          recebimento(`r${indice}`, `2027-05-${String(indice + 1).padStart(2, '0')}`, 10, 1, [
            `entrada-${indice}`,
          ]),
        ],
        parcelas: [
          parcela(
            `entrada-${indice}`,
            1,
            `2027-05-${String(indice + 1).padStart(2, '0')}`,
            'Paga',
            10,
          ),
          parcela(`p${indice}`, 2, '2027-04-01', 'Atrasado', 10 + indice),
        ],
      }),
    );
    const resultado = calcularRelatorio(vendas, '2027-05-31');
    expect(resultado.vendasDoMes).toHaveLength(7);
    expect(resultado.vendasDoMes[0].saldoCentavos).toBe(0);
    expect(resultado.vendasDoMes[0].situacao).toBe('Quitada');
    expect(resultado.recebimentos).toHaveLength(7);
    expect(resultado.saldos).toHaveLength(6);
    expect(resultado.parcelasAtrasadas).toHaveLength(7);
    expect(resultado.totalRecebidoCentavos).toBe(70);
    expect(resultado.totalVendasMesCentavos).toBe(721);
    expect(resultado.totalEmAbertoCentavos).toBe(321);
    expect(resultado.totalAtrasadoCentavos).toBe(91);
  });

  it('retorna zeros e vazios e rejeita overflow sem mutar a fonte', () => {
    expect(calcularRelatorio([], '2027-03-31')).toMatchObject({
      recebimentos: [],
      vendasDoMes: [],
      saldos: [],
      parcelasAtrasadas: [],
      totalRecebidoCentavos: 0,
      quantidadeVendasMes: 0,
      totalVendasMesCentavos: 0,
      totalEmAbertoCentavos: 0,
      totalAtrasadoCentavos: 0,
    });

    const excesso = [
      venda('um', '2027-03-01', { total: Number.MAX_SAFE_INTEGER }),
      venda('dois', '2027-03-02', { total: 1 }),
    ];
    expect(() => calcularRelatorio(excesso, '2027-03-31')).toThrow(RangeError);
  });
});
