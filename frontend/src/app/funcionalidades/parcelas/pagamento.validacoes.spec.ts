import { TestBed } from '@angular/core/testing';
import { PreparadorRecebimento } from '../../nucleo/demonstracao/preparador-recebimento';
import * as calculos from '../vendas/venda.calculos';
import { Venda } from '../vendas/venda.modelos';
import { prepararCadastro } from '../vendas/venda.validacoes';
import { ComandoPagamento, FORMAS_PAGAMENTO } from './pagamento.modelos';
import {
  OperacoesPreparacaoRecebimento,
  prepararPagamento,
  selecionarParcelas,
} from './pagamento.validacoes';
import { prepararPagamentoHistorico } from '../../nucleo/demonstracao/preparar-pagamento-historico';
import { criarDadosDemonstrativos } from '../../nucleo/demonstracao/dados-demonstrativos';

const referencia = '2027-01-31';
function venda(id = 'v1', dataReferencia = referencia, valorTotalCentavos = 100000): Venda {
  const resultado = prepararCadastro(
    {
      cliente: { nome: 'DEMO', cpf: '90000000175', telefone: '00900000001' },
      valorTotalCentavos,
      quantidadeParcelas: 5,
      dataVenda: dataReferencia === referencia ? '2027-01-01' : '2027-01-01',
      entrada: { valorCentavos: 20000, data: '2027-01-01', forma: 'Pix' },
    },
    dataReferencia,
    id,
  );
  if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
  return resultado.valor;
}
function comando(
  v = venda(),
  indiceParcela = 1,
  data = referencia,
  opcoes: { readonly valorCentavos?: number; readonly observacao?: string } = {},
): ComandoPagamento {
  return {
    vendaId: v.id,
    parcelaId: v.parcelas[indiceParcela].id,
    data,
    forma: 'Pix',
    valorCentavos: opcoes.valorCentavos ?? v.parcelas[indiceParcela].valorCentavos,
    observacao: opcoes.observacao ?? '',
  };
}
function aceitar(vendas: readonly Venda[], c: ComandoPagamento, id = 'r1'): readonly Venda[] {
  const resultado = prepararPagamento(vendas, c, referencia, id);
  expect(resultado.tipo).toBe('sucesso');
  if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
  return resultado.valor;
}

describe('Pagamento individual sequencial', () => {
  afterEach(() => vi.restoreAllMocks());

  it('registra pagamento individual a valor-base, com origem explícita e uma alocação integral', () => {
    const original = venda('v1', referencia, 100003);
    const preparada = aceitar([original], comando(original));
    const recebimento = preparada[0].recebimentos[1];
    expect(recebimento).toMatchObject({
      origem: 'individual',
      acrescimoCentavos: 0,
      observacao: '',
    });
    expect(recebimento.valorCentavos).toBe(original.parcelas[1].valorCentavos);
    expect(recebimento.alocacoes).toEqual([
      { parcelaId: original.parcelas[1].id, valorCentavos: original.parcelas[1].valorCentavos },
    ]);
    expect(original.recebimentos).toHaveLength(1);
  });

  it('reconcilia acréscimo em centavos sem alterar bases nem criar crédito residual', () => {
    const original = venda('centavos', referencia, 100003);
    const parcelaBase = original.parcelas[1].valorCentavos;
    const valorRecebido = parcelaBase + 7;
    const preparada = aceitar(
      [original],
      comando(original, 1, referencia, { valorCentavos: valorRecebido, observacao: 'ajuste 7c' }),
    );
    const recebimento = preparada[0].recebimentos[1];
    expect(recebimento).toMatchObject({
      origem: 'individual',
      valorCentavos: valorRecebido,
      acrescimoCentavos: 7,
      observacao: 'ajuste 7c',
      alocacoes: [{ parcelaId: original.parcelas[1].id, valorCentavos: valorRecebido }],
    });
    expect(preparada[0].parcelas).toEqual(original.parcelas);
    expect(original.parcelas[1].valorCentavos).toBe(parcelaBase);

    const projetada = calculos.projetarVenda(preparada[0], referencia);
    const saldoBasePendente = original.parcelas
      .slice(2)
      .reduce((total, parcela) => total + parcela.valorCentavos, 0);
    expect(projetada.valorTotalCentavos).toBe(100003);
    expect(projetada.valorTotalEfetivoCentavos).toBe(100010);
    expect(projetada.totalPagoCentavos).toBe(20000 + valorRecebido);
    expect(projetada.saldoCentavos).toBe(saldoBasePendente);
    expect(projetada.valorTotalEfetivoCentavos - projetada.totalPagoCentavos).toBe(
      saldoBasePendente,
    );
  });

  it('rejeita valor abaixo do base, centavos inseguros, overflow do total efetivo e nota longa sem mutar', () => {
    const original = venda();
    const valorBase = original.parcelas[1].valorCentavos;
    const comandosInvalidos = [
      comando(original, 1, referencia, { valorCentavos: valorBase - 1 }),
      comando(original, 1, referencia, { valorCentavos: Number.MAX_SAFE_INTEGER + 1 }),
      comando(original, 1, referencia, {
        valorCentavos: Number.MAX_SAFE_INTEGER,
      }),
      comando(original, 1, referencia, { observacao: '123456789012345678901' }),
    ];
    for (const invalido of comandosInvalidos) {
      const antes = structuredClone([original]);
      expect(prepararPagamento([original], invalido, referencia, 'invalido').tipo).toBe(
        'validacao',
      );
      expect([original]).toEqual(antes);
    }
  });

  it('preserva seed, entradas e lotes sem origem individual ou acréscimo', () => {
    const seed = criarDadosDemonstrativos(referencia);
    for (const vendaSeed of seed) {
      const projetada = calculos.projetarVenda(vendaSeed, referencia);
      expect(projetada.valorTotalEfetivoCentavos).toBe(vendaSeed.valorTotalCentavos);
      for (const recebimento of vendaSeed.recebimentos) {
        expect(recebimento.origem).toBeUndefined();
        expect(recebimento.acrescimoCentavos).toBeUndefined();
        expect(recebimento.observacao).toBeUndefined();
      }
    }
  });

  it.each(FORMAS_PAGAMENTO)('aceita a primeira parcela pendente com %s', (forma) => {
    const original = venda();
    const resultado = prepararPagamento(
      [original],
      { ...comando(original), forma },
      referencia,
      'r1',
    );
    expect(resultado).toMatchObject({ tipo: 'sucesso' });
    if (resultado.tipo === 'sucesso')
      expect(calculos.projetarVenda(resultado.valor[0], referencia).totalPagoCentavos).toBe(40000);
  });

  it('permite pagamento da primeira pendente futura ou atrasada, inclusive em parcelas de centavos distintos', () => {
    const futuro = venda('futuro', referencia, 100003);
    expect(futuro.parcelas[1].vencimento > referencia).toBe(true);
    const pagoFuturo = aceitar([futuro], comando(futuro));
    expect(pagoFuturo[0].recebimentos[1].valorCentavos).toBe(futuro.parcelas[1].valorCentavos);

    const refAtrasada = '2027-06-01';
    const atrasada = venda('atrasada', refAtrasada, 100003);
    expect(atrasada.parcelas[1].vencimento < refAtrasada).toBe(true);
    const resultado = prepararPagamento(
      [atrasada],
      comando(atrasada, 1, refAtrasada),
      refAtrasada,
      'r2',
    );
    expect(resultado.tipo).toBe('sucesso');
  });

  it.each([
    { parcelaId: 'ausente', tipo: 'inelegibilidade' },
    { parcelaId: 'v2/parcela/2', tipo: 'inelegibilidade' },
  ])('rejeita parcela desconhecida ou de outra venda: $parcelaId', ({ parcelaId, tipo }) => {
    const original = venda();
    const snapshot = structuredClone([original]);
    expect(
      prepararPagamento([original], { ...comando(original), parcelaId }, referencia, 'r1').tipo,
    ).toBe(tipo);
    expect([original]).toEqual(snapshot);
  });

  it('rejeita parcela paga, entrada e saltos sem mutação', () => {
    const original = venda();
    const snapshot = structuredClone([original]);
    for (const parcelaId of [original.parcelas[0].id, original.parcelas[2].id])
      expect(
        prepararPagamento([original], { ...comando(original), parcelaId }, referencia, 'r1').tipo,
      ).toBe('inelegibilidade');
    expect([original]).toEqual(snapshot);
  });

  it('retorna inexistência para venda ausente sem publicar recebimento', () => {
    expect(prepararPagamento([], comando(venda('ausente')), referencia, 'r1')).toMatchObject({
      tipo: 'inexistencia',
      codigo: 'venda-inexistente',
    });
  });

  it.each([
    { data: '2027-02-29', forma: 'Pix' },
    { data: '2026-12-31', forma: 'Pix' },
    { data: '2027-02-01', forma: 'Pix' },
    { data: referencia, forma: '' },
    { data: referencia, forma: 'Transferência' },
  ])('rejeita data ou forma inválida: %j sem mutação', (alteracao) => {
    const original = venda();
    const snapshot = structuredClone([original]);
    expect(
      prepararPagamento([original], { ...comando(original), ...alteracao }, referencia, 'r1').tipo,
    ).toBe('validacao');
    expect([original]).toEqual(snapshot);
  });

  it.each([
    { vendaId: 'v1', parcelaIds: ['p1'], valorCentavos: 20000, data: referencia, forma: 'Pix' },
    {
      vendaId: 'v1',
      parcelaIds: ['p1', 'p2'],
      valorCentavos: 40000,
      data: referencia,
      forma: 'Pix',
    },
    { vendaId: 'v1', parcelaId: 'p1', valorCentavos: '20000', data: referencia, forma: 'Pix' },
    { vendaId: 'v1', parcelaId: 'p1', data: referencia, forma: 'Pix', legado: true },
    { vendaId: 'v1', data: referencia, forma: 'Pix' },
  ])('rejeita comando legado, múltiplo ou malformado sem mutação: %j', (legado) => {
    const original = venda();
    const snapshot = structuredClone([original]);
    expect(
      prepararPagamento([original], legado as unknown as ComandoPagamento, referencia, 'r1').tipo,
    ).toBe('validacao');
    expect([original]).toEqual(snapshot);
  });

  it('não desloca comando repetido nem alvo obsoleto para a próxima parcela', () => {
    const original = venda();
    const c = comando(original);
    const depois = aceitar([original], c);
    const snapshot = structuredClone(depois);
    expect(prepararPagamento(depois, c, referencia, 'r2').tipo).toBe('inelegibilidade');
    expect(depois).toEqual(snapshot);
  });

  it.each(['2027-01-01', referencia])(
    'aceita as bordas do intervalo de datas no núcleo: %s',
    (data) => {
      const original = venda();
      const resultado = prepararPagamento([original], comando(original, 1, data), referencia, 'r1');
      expect(resultado.tipo).toBe('sucesso');
    },
  );

  it('mantém publicação atômica com falha de alocação/validação e permite nova tentativa', () => {
    const original = venda();
    const vendas = [original];
    const snapshot = structuredClone(vendas);
    const alocarFalha: OperacoesPreparacaoRecebimento = {
      alocar: vi.fn(() => {
        throw new Error('falha de alocação controlada');
      }),
      validarConjunto: vi.fn(() => undefined),
    };
    expect(prepararPagamento(vendas, comando(original), referencia, 'r1', alocarFalha).tipo).toBe(
      'falha',
    );
    expect(alocarFalha.alocar).toHaveBeenCalledTimes(1);
    expect(alocarFalha.validarConjunto).not.toHaveBeenCalled();
    expect(vendas).toEqual(snapshot);

    const validacaoFinalFalha: OperacoesPreparacaoRecebimento = {
      alocar: (parcela) => ({ parcelaId: parcela.id, valorCentavos: parcela.valorCentavos }),
      validarConjunto: vi.fn(() => {
        throw new Error('falha de validação final controlada');
      }),
    };
    expect(
      prepararPagamento(vendas, comando(original), referencia, 'r1', validacaoFinalFalha).tipo,
    ).toBe('falha');
    expect(validacaoFinalFalha.validarConjunto).toHaveBeenCalledTimes(1);
    expect(vendas).toEqual(snapshot);
    expect(aceitar(vendas, comando(original))[0].recebimentos).toHaveLength(2);
    expect(vendas).toEqual(snapshot);
  });

  it('preserva um lote histórico ao pagar individualmente a próxima parcela e reconcilia projeções', () => {
    const original = venda('hist', referencia, 100003);
    const parcelasHistoricas = original.parcelas.slice(1, 4);
    const historico = prepararPagamentoHistorico(
      [original],
      {
        vendaId: original.id,
        parcelaIds: parcelasHistoricas.map((parcela) => parcela.id),
        valorCentavos: parcelasHistoricas.reduce(
          (total, parcela) => total + parcela.valorCentavos,
          0,
        ),
        data: referencia,
        forma: 'Dinheiro',
      },
      referencia,
      'historico/lote',
    );
    expect(historico.tipo).toBe('sucesso');
    if (historico.tipo !== 'sucesso') throw new Error(historico.mensagem);
    const antes = structuredClone(historico.valor);
    const registroHistorico = structuredClone(historico.valor[0].recebimentos.at(-1));
    const proxima = original.parcelas[4];
    const resultado = prepararPagamento(
      historico.valor,
      comando(original, 4),
      referencia,
      'individual/seguinte',
    );
    expect(resultado.tipo).toBe('sucesso');
    if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
    expect(resultado.valor[0].recebimentos.at(-2)).toEqual(registroHistorico);
    expect(resultado.valor[0].recebimentos.at(-1)).toMatchObject({
      origem: 'individual',
      acrescimoCentavos: 0,
      observacao: '',
      alocacoes: [{ parcelaId: proxima.id, valorCentavos: proxima.valorCentavos }],
    });
    expect(registroHistorico?.origem).toBeUndefined();
    expect(historico.valor).toEqual(antes);
    expect(calculos.projetarVenda(resultado.valor[0], referencia)).toMatchObject({
      totalPagoCentavos: 100003,
      saldoCentavos: 0,
      quantidadePaga: original.parcelas.length,
    });
  });

  it('mantém seleção consultiva restrita à primeira pendente', () => {
    const original = venda();
    expect(selecionarParcelas(original, [original.parcelas[1].id], referencia)).toMatchObject({
      tipo: 'sucesso',
      valor: [original.parcelas[1]],
    });
    expect(selecionarParcelas(original, [original.parcelas[2].id], referencia).tipo).toBe(
      'inelegibilidade',
    );
  });

  it('mantém as operações injetáveis do preparador para a próxima tarefa de atomicidade', () => {
    const preparador = TestBed.inject(PreparadorRecebimento);
    expect(preparador.preparar([venda()], comando(), referencia, 'r1').tipo).toBe('sucesso');
  });
});
