import { ProjecaoParcela } from '../parcelas/parcela.calculos';
import { ProjecaoVenda } from '../vendas/venda.calculos';
import {
  selecionarParcelasAtrasadas,
  selecionarParcelasProximas,
  selecionarVendasRecentes,
} from './visao-geral.calculos';

function venda(
  id: string,
  dataVenda: string,
  parcelas: readonly ProjecaoParcela[] = [],
  situacao: ProjecaoVenda['situacao'] = 'Em aberto',
): ProjecaoVenda {
  return {
    id,
    cliente: { nome: id, cpf: '90000000175', telefone: '00900000001', descricao: null },
    dataVenda,
    valorTotalCentavos: 10000,
    entrada: null,
    parcelas,
    recebimentos: [],
    totalPagoCentavos: situacao === 'Quitada' ? 10000 : 0,
    saldoCentavos: situacao === 'Quitada' ? 0 : 10000,
    quantidadePaga: situacao === 'Quitada' ? parcelas.length : 0,
    proximoVencimento: parcelas[0]?.vencimento ?? null,
    situacao,
  };
}

function parcela(
  id: string,
  numero: number,
  vencimento: string,
  situacao: ProjecaoParcela['situacao'],
): ProjecaoParcela {
  return {
    id,
    numero,
    valorCentavos: 10000,
    vencimento,
    situacao,
    dataPagamento: situacao === 'Paga' ? vencimento : null,
    formaPagamento: situacao === 'Paga' ? 'Pix' : null,
  };
}

describe('Seleções da Visão Geral', () => {
  it('retorna listas vazias e limita vendas recentes depois da ordenação', () => {
    expect(selecionarVendasRecentes([])).toEqual([]);
    expect(selecionarParcelasProximas([])).toEqual([]);
    expect(selecionarParcelasAtrasadas([])).toEqual([]);

    const vendas = Array.from({ length: 7 }, (_, indice) =>
      venda(`v${indice}`, `2027-01-${String(indice + 1).padStart(2, '0')}`),
    );
    const originais = [...vendas];
    expect(selecionarVendasRecentes(vendas).map((item) => item.id)).toEqual([
      'v6',
      'v5',
      'v4',
      'v3',
      'v2',
    ]);
    expect(vendas).toEqual(originais);
    expect(selecionarVendasRecentes([vendas[0]]).map((item) => item.id)).toEqual(['v0']);
  });

  it('inclui quitadas em vendas recentes e preserva a ordem da fonte nos empates', () => {
    const fonte = [
      venda('primeira', '2027-03-01', [], 'Quitada'),
      venda('segunda', '2027-03-01'),
      venda('mais-recente', '2027-03-02'),
    ];

    expect(selecionarVendasRecentes(fonte).map((item) => item.id)).toEqual([
      'mais-recente',
      'primeira',
      'segunda',
    ]);
    expect(selecionarVendasRecentes(fonte)[1].situacao).toBe('Quitada');
  });

  it('seleciona parcelas próximas e atrasadas sem incluir pagas, ordena e limita a cinco', () => {
    const fonte = [
      venda('a', '2027-01-01', [
        parcela('ontem', 1, '2027-03-30', 'Atrasado'),
        parcela('hoje', 2, '2027-03-31', 'Próximos dias'),
        parcela('mais-sete', 3, '2027-04-07', 'Próximos dias'),
        parcela('mais-oito', 4, '2027-04-08', 'Aberto'),
        parcela('paga', 5, '2027-03-01', 'Paga'),
      ]),
      venda('b', '2027-01-02', [
        parcela('vencida-antes', 1, '2027-03-29', 'Atrasado'),
        parcela('empate', 2, '2027-03-31', 'Próximos dias'),
      ]),
    ];

    expect(selecionarParcelasProximas(fonte).map(({ parcela: item }) => item.id)).toEqual([
      'hoje',
      'empate',
      'mais-sete',
    ]);
    expect(selecionarParcelasAtrasadas(fonte).map(({ parcela: item }) => item.id)).toEqual([
      'vencida-antes',
      'ontem',
    ]);
    expect(selecionarParcelasProximas(fonte)[1].venda.id).toBe('b');
  });

  it('mantém ordem de fonte em empates, limita após ordenar e aceita bordas civis', () => {
    const datas = [
      '9999-12-31',
      '0001-01-01',
      '2027-03-31',
      '2027-03-31',
      '2027-03-31',
      '2027-03-31',
      '2027-03-31',
    ];
    const fonte = datas.map((data, indice) =>
      venda(`v${indice}`, '2027-01-01', [parcela(`p${indice}`, indice + 1, data, 'Atrasado')]),
    );
    const originais = fonte.map((item) => item.parcelas);

    expect(selecionarParcelasAtrasadas(fonte).map(({ parcela: item }) => item.id)).toEqual([
      'p1',
      'p2',
      'p3',
      'p4',
      'p5',
    ]);
    expect(selecionarParcelasAtrasadas(fonte).map(({ parcela: item }) => item.vencimento)).toEqual([
      '0001-01-01',
      '2027-03-31',
      '2027-03-31',
      '2027-03-31',
      '2027-03-31',
    ]);
    expect(fonte.map((item) => item.parcelas)).toEqual(originais);
  });
});
