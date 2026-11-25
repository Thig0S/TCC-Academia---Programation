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
    readonly statusAdministrativo?: ProjecaoVenda['statusAdministrativo'];
    readonly total?: number;
    readonly totalEfetivo?: number;
    readonly saldo?: number;
  } = {},
): ProjecaoVenda {
  return {
    id,
    statusAdministrativo: opcoes.statusAdministrativo ?? 'Ativo',
    cliente: { nome: id, cpf: '90000000175', telefone: '00900000001', descricao: null },
    dataVenda,
    valorTotalCentavos: opcoes.total ?? 1000,
    valorTotalEfetivoCentavos: opcoes.totalEfetivo ?? opcoes.total ?? 1000,
    entrada: opcoes.entrada ?? null,
    recebimentos: opcoes.recebimentos ?? [],
    parcelas: opcoes.parcelas ?? [],
    totalPagoCentavos: (opcoes.recebimentos ?? []).reduce(
      (total, item) => total + item.valorCentavos,
      0,
    ),
    saldoCentavos: opcoes.saldo ?? 1000,
    quantidadePaga: (opcoes.parcelas ?? []).filter((item) => item.situacao === 'Paga').length,
    proximoVencimento:
      opcoes.parcelas
        ?.filter((item) => item.situacao !== 'Paga')
        .map((item) => item.vencimento)
        .sort()[0] ?? null,
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
    expect(resultado.recebimentosDiarios).toHaveLength(31);
    expect(resultado.recebimentosDiarios[0]).toEqual({ data: '2027-03-01', totalCentavos: 100 });
    expect(resultado.recebimentosDiarios[30]).toEqual({ data: '2027-03-31', totalCentavos: 300 });
    expect(resultado.recebimentosDiarios.reduce((soma, item) => soma + item.totalCentavos, 0)).toBe(
      resultado.totalRecebidoCentavos,
    );
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

  it('identifica pagamentos individuais sem reclassificar entradas ou lotes legados', () => {
    const individual = {
      ...recebimento('individual', '2027-03-15', 150, 1, ['parcela-individual']),
      origem: 'individual' as const,
      acrescimoCentavos: 50,
      observacao: 'ajuste',
    };
    const movimento = venda('origens', '2027-03-01', {
      entrada: { data: '2027-03-01', forma: 'Pix', valorCentavos: 100 },
      parcelas: [
        parcela('entrada', 1, '2027-03-01', 'Paga', 100),
        parcela('parcela-individual', 2, '2027-04-01', 'Paga', 100),
        parcela('parcela-lote-1', 3, '2027-05-01', 'Paga', 100),
        parcela('parcela-lote-2', 4, '2027-06-01', 'Paga', 100),
      ],
      recebimentos: [
        recebimento('entrada', '2027-03-01', 100, 1, ['entrada']),
        individual,
        recebimento('lote', '2027-03-20', 200, 2, ['parcela-lote-1', 'parcela-lote-2']),
      ],
    });

    const resultado = calcularRelatorio([movimento], '2027-03-31');
    expect(
      resultado.recebimentos.map(({ origem, valorCentavos }) => [origem, valorCentavos]),
    ).toEqual([
      ['Entrada', 100],
      ['Individual', 150],
      ['Lote', 200],
    ]);
    expect(resultado.totalRecebidoCentavos).toBe(450);
    expect(resultado.recebimentosDiarios[0].totalCentavos).toBe(100);
    expect(resultado.recebimentosDiarios[14].totalCentavos).toBe(150);
    expect(resultado.recebimentosDiarios[19].totalCentavos).toBe(200);
    expect(resultado.recebimentosDiarios[1].totalCentavos).toBe(0);
  });

  it('mantém recebimentos de todos os status e restringe vendas e posições às Ativas', () => {
    const pagamentoComAcrescimo = {
      ...recebimento('individual-ativo', '2027-03-10', 4000, 1, ['paga-ativa']),
      origem: 'individual' as const,
      acrescimoCentavos: 1000,
      observacao: '',
    };
    const ativa = venda('ativa', '2027-03-05', {
      total: 10000,
      totalEfetivo: 11000,
      saldo: 7000,
      recebimentos: [pagamentoComAcrescimo],
      parcelas: [
        parcela('paga-ativa', 1, '2027-03-05', 'Paga', 3000),
        parcela('atrasada-ativa', 2, '2027-02-01', 'Atrasado', 3000),
        parcela('pendente-ativa', 3, '2027-04-01', 'Aberto', 4000),
      ],
    });
    const inativa = venda('inativa', '2027-03-06', {
      statusAdministrativo: 'Inativo',
      total: 10000,
      saldo: 8000,
      recebimentos: [recebimento('recebido-inativa', '2027-03-11', 2000)],
      parcelas: [
        parcela('paga-inativa', 1, '2027-03-06', 'Paga', 2000),
        parcela('atrasada-inativa', 2, '2027-02-02', 'Atrasado', 8000),
      ],
    });
    const prejuizo = venda('prejuizo', '2027-03-07', {
      statusAdministrativo: 'Prejuízo',
      total: 9000,
      saldo: 8000,
      entrada: { data: '2027-03-07', forma: 'Dinheiro', valorCentavos: 1000 },
      recebimentos: [recebimento('entrada-prejuizo', '2027-03-07', 1000, 1, ['paga-prejuizo'])],
      parcelas: [
        parcela('paga-prejuizo', 1, '2027-03-07', 'Paga', 1000),
        parcela('atrasada-prejuizo', 2, '2027-02-03', 'Atrasado', 8000),
      ],
    });

    const resultado = calcularRelatorio([ativa, inativa, prejuizo], '2027-03-31');

    expect(resultado.recebimentos.map((item) => item.venda.id)).toEqual([
      'ativa',
      'inativa',
      'prejuizo',
    ]);
    expect(resultado.totalRecebidoCentavos).toBe(7000);
    expect(resultado.vendasDoMes.map((item) => item.id)).toEqual(['ativa']);
    expect(resultado.totalVendasMesCentavos).toBe(11000);
    expect(resultado.saldos.map((item) => item.venda.id)).toEqual(['ativa']);
    expect(resultado.saldos[0]).toMatchObject({
      saldoCentavos: 7000,
      primeiroVencimentoPendente: '2027-02-01',
    });
    expect(resultado.parcelasAtrasadas.map((item) => [item.venda.id, item.parcela.id])).toEqual([
      ['ativa', 'atrasada-ativa'],
    ]);
    expect(resultado.totalAtrasadoCentavos).toBe(3000);
    expect(resultado.parcelasPrejuizo.map((item) => [item.venda.id, item.incluirNoTotal])).toEqual([
      ['prejuizo', false],
    ]);
    expect(resultado.totalPrejuizoCentavos).toBe(0);
    expect(resultado.recebimentosDiarios[6].totalCentavos).toBe(1000);
    expect(resultado.recebimentosDiarios[9].totalCentavos).toBe(4000);
    expect(resultado.recebimentosDiarios[10].totalCentavos).toBe(2000);
    expect(resultado.recebimentosDiarios.reduce((soma, item) => soma + item.totalCentavos, 0)).toBe(
      resultado.recebimentos.reduce((soma, item) => soma + item.valorCentavos, 0),
    );

    const reativada = calcularRelatorio(
      [ativa, { ...inativa, statusAdministrativo: 'Ativo' }, prejuizo],
      '2027-03-31',
    );
    expect(reativada.recebimentos.map((item) => item.id)).toEqual(
      resultado.recebimentos.map((item) => item.id),
    );
    expect(reativada.totalRecebidoCentavos).toBe(resultado.totalRecebidoCentavos);
    expect(reativada.vendasDoMes.map((item) => item.id)).toEqual(['ativa', 'inativa']);
    expect(reativada.totalVendasMesCentavos).toBe(21000);
    expect(reativada.totalEmAbertoCentavos).toBe(15000);
  });

  it('separa parcelas de Prejuízo com pagamentos anteriores sem somá-las ao total', () => {
    const semPagamento = venda('sem-pagamento', '2027-01-01', {
      statusAdministrativo: 'Prejuízo',
      total: 1000,
      saldo: 1000,
      parcelas: [
        parcela('sem-pagamento-1', 1, '2027-02-01', 'Atrasado', 300),
        parcela('sem-pagamento-2', 2, '2027-03-01', 'Atrasado', 700),
      ],
    });
    const comEntrada = venda('com-entrada', '2027-03-02', {
      statusAdministrativo: 'Prejuízo',
      total: 1000,
      saldo: 800,
      entrada: { data: '2027-03-02', forma: 'Pix', valorCentavos: 200 },
      recebimentos: [recebimento('entrada', '2027-03-02', 200, 1, ['entrada-paga'])],
      parcelas: [
        parcela('entrada-paga', 1, '2027-03-02', 'Paga', 200),
        parcela('entrada-pendente', 2, '2027-03-02', 'Atrasado', 800),
      ],
    });
    const parcialmentePaga = venda('parcial', '2027-01-03', {
      statusAdministrativo: 'Prejuízo',
      total: 1000,
      saldo: 600,
      recebimentos: [recebimento('pagamento-parcial', '2027-02-03', 400, 1, ['parcial-paga'])],
      parcelas: [
        parcela('parcial-paga', 1, '2027-01-03', 'Paga', 400),
        parcela('parcial-pendente', 2, '2027-03-03', 'Atrasado', 600),
      ],
    });

    const resultado = calcularRelatorio([semPagamento, comEntrada, parcialmentePaga], '2027-03-31');

    expect(
      resultado.parcelasPrejuizo.map((item) => [
        item.venda.id,
        item.parcela.id,
        item.incluirNoTotal,
      ]),
    ).toEqual([
      ['sem-pagamento', 'sem-pagamento-1', true],
      ['sem-pagamento', 'sem-pagamento-2', true],
      ['com-entrada', 'entrada-pendente', false],
      ['parcial', 'parcial-pendente', false],
    ]);
    expect(resultado.totalPrejuizoCentavos).toBe(1000);
    expect(resultado.totalEmAbertoCentavos).toBe(0);
    expect(resultado.totalAtrasadoCentavos).toBe(0);
    expect(resultado.recebimentos.map((item) => item.venda.id)).toEqual(['com-entrada']);
    expect(resultado.totalRecebidoCentavos).toBe(200);
  });

  it('ordena saldos pelo primeiro vencimento e parcelas atrasadas por vencimento estável', () => {
    const primeiro = venda('primeiro-na-origem', '2027-01-01', {
      saldo: 500,
      parcelas: [
        parcela('mais-distante', 2, '2027-04-20', 'Aberto', 300),
        parcela('primeiro-pendente', 1, '2027-04-01', 'Atrasado', 200),
        parcela('atrasada-mais-tarde', 3, '2027-04-20', 'Atrasado', 300),
      ],
    });
    const empatada = venda('empatada', '2027-01-02', {
      saldo: 200,
      parcelas: [parcela('atrasada-empatada', 1, '2027-04-01', 'Atrasado', 200)],
    });
    const semVencimento = venda('sem-vencimento', '2027-01-03', { saldo: 100 });

    const resultado = calcularRelatorio([primeiro, empatada, semVencimento], '2027-05-31');

    expect(
      resultado.saldos.map((item) => [item.venda.id, item.primeiroVencimentoPendente]),
    ).toEqual([
      ['primeiro-na-origem', '2027-04-01'],
      ['empatada', '2027-04-01'],
      ['sem-vencimento', null],
    ]);
    expect(resultado.parcelasAtrasadas.map((item) => [item.venda.id, item.parcela.id])).toEqual([
      ['primeiro-na-origem', 'primeiro-pendente'],
      ['empatada', 'atrasada-empatada'],
      ['primeiro-na-origem', 'atrasada-mais-tarde'],
    ]);
  });

  it('move o mesmo recebimento entre meses após alteração de data sem alterar status ou valor-base', () => {
    const recebimentoAtual = recebimento('recebimento-estavel', '2027-03-31', 250);
    const original = venda('movida', '2027-01-01', {
      statusAdministrativo: 'Inativo',
      recebimentos: [recebimentoAtual],
      parcelas: [parcela('parcela', 1, '2027-01-01', 'Paga', 250)],
      total: 1000,
      totalEfetivo: 1000,
      saldo: 750,
    });
    const corrigida = {
      ...original,
      statusAdministrativo: 'Ativo' as const,
      recebimentos: [{ ...recebimentoAtual, data: '2027-04-01' }],
    };

    const marco = calcularRelatorio([original], '2027-03-31');
    const abril = calcularRelatorio([corrigida], '2027-04-30');

    expect(marco.recebimentos.map((item) => item.id)).toEqual([
      'movida/recebimento/recebimento-estavel',
    ]);
    expect(marco.vendasDoMes).toHaveLength(0);
    expect(marco.totalRecebidoCentavos).toBe(250);
    expect(abril.recebimentos.map((item) => item.id)).toEqual([
      'movida/recebimento/recebimento-estavel',
    ]);
    expect(abril.recebimentos[0].data).toBe('2027-04-01');
    expect(abril.vendasDoMes.map((item) => item.id)).toEqual([]);
    expect(abril.totalRecebidoCentavos).toBe(250);
    expect(marco.recebimentosDiarios[30].totalCentavos).toBe(250);
    expect(abril.recebimentosDiarios[0].totalCentavos).toBe(250);
    expect(
      marco.recebimentosDiarios.map((item) => item.totalCentavos).reduce((a, b) => a + b, 0),
    ).toBe(250);
    expect(
      abril.recebimentosDiarios.map((item) => item.totalCentavos).reduce((a, b) => a + b, 0),
    ).toBe(250);
    expect(abril.totalVendasMesCentavos).toBe(0);
    expect(corrigida.valorTotalCentavos).toBe(1000);
  });

  it.each([
    ['2024-02-29', '2024-02-01', '2024-02-29'],
    ['0001-01-01', '0001-01-01', '0001-01-31'],
    ['9999-12-31', '9999-12-01', '9999-12-31'],
  ])('deriva mês civil completo na referência %s', (referencia, inicio, fim) => {
    expect(calcularRelatorio([], referencia)).toMatchObject({ inicioMes: inicio, fimMes: fim });
  });

  it('seleciona mês opcional com limites inclusivos sem alterar as posições da referência', () => {
    const ativa = venda('ativa', '2027-01-31', {
      saldo: 700,
      parcelas: [parcela('atrasada', 1, '2027-01-31', 'Atrasado', 300)],
      recebimentos: [
        recebimento('antes', '2026-12-31', 10),
        recebimento('inicio', '2027-01-01', 20),
        recebimento('fim', '2027-01-31', 30),
        recebimento('depois', '2027-02-01', 40),
      ],
    });
    const inativa = venda('inativa', '2027-01-15', {
      statusAdministrativo: 'Inativo',
      recebimentos: [recebimento('inativa', '2027-01-15', 50)],
    });

    const padrao = calcularRelatorio([ativa, inativa], '2027-01-31');
    const janeiro = calcularRelatorio([ativa, inativa], '2027-03-15', '2027-01-01');

    expect(janeiro).toMatchObject({
      inicioMes: '2027-01-01',
      fimMes: '2027-01-31',
      totalRecebidoCentavos: 100,
      quantidadeVendasMes: 1,
      totalVendasMesCentavos: 1000,
    });
    expect(janeiro.recebimentos.map((item) => item.id)).toEqual([
      'ativa/recebimento/inicio',
      'ativa/recebimento/fim',
      'inativa/recebimento/inativa',
    ]);
    expect(janeiro.saldos).toEqual(padrao.saldos);
    expect(janeiro.parcelasAtrasadas).toEqual(padrao.parcelasAtrasadas);
    expect(janeiro.parcelasPrejuizo).toEqual(padrao.parcelasPrejuizo);
    expect([
      janeiro.totalEmAbertoCentavos,
      janeiro.totalAtrasadoCentavos,
      janeiro.totalPrejuizoCentavos,
    ]).toEqual([
      padrao.totalEmAbertoCentavos,
      padrao.totalAtrasadoCentavos,
      padrao.totalPrejuizoCentavos,
    ]);
    expect(calcularRelatorio([], '2027-01-15', '2028-06-01')).toMatchObject({
      inicioMes: '2028-06-01',
      fimMes: '2028-06-30',
      recebimentos: [],
      vendasDoMes: [],
      totalRecebidoCentavos: 0,
    });
    const vazio = calcularRelatorio([], '2027-01-15', '2028-02-01');
    expect(vazio.recebimentosDiarios).toHaveLength(29);
    expect(vazio.recebimentosDiarios.every((item) => item.totalCentavos === 0)).toBe(true);
  });

  it.each([
    ['2024-02-01', '2024-02-29'],
    ['2023-02-01', '2023-02-28'],
    ['2027-12-01', '2027-12-31'],
    ['2028-01-01', '2028-01-31'],
    ['0001-01-01', '0001-01-31'],
    ['9999-12-01', '9999-12-31'],
  ])('aceita período mensal nos limites civis %s–%s', (inicio, fim) => {
    expect(calcularRelatorio([], '2027-06-15', inicio)).toMatchObject({
      inicioMes: inicio,
      fimMes: fim,
    });
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
      parcelasPrejuizo: [],
      totalRecebidoCentavos: 0,
      quantidadeVendasMes: 0,
      totalVendasMesCentavos: 0,
      totalEmAbertoCentavos: 0,
      totalAtrasadoCentavos: 0,
      totalPrejuizoCentavos: 0,
    });

    const excesso = [
      venda('um', '2027-03-01', { total: Number.MAX_SAFE_INTEGER }),
      venda('dois', '2027-03-02', { total: 1 }),
    ];
    expect(() => calcularRelatorio(excesso, '2027-03-31')).toThrow(RangeError);
  });
});
