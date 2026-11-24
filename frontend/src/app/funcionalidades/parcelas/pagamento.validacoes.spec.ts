import { TestBed } from '@angular/core/testing';
import { PreparadorRecebimento } from '../../nucleo/demonstracao/preparador-recebimento';
import * as calculos from '../vendas/venda.calculos';
import { Venda } from '../vendas/venda.modelos';
import { prepararCadastro } from '../vendas/venda.validacoes';
import { ComandoCorrecaoPagamento, ComandoPagamento, FORMAS_PAGAMENTO } from './pagamento.modelos';
import {
  OperacoesPreparacaoCorrecaoPagamento,
  OperacoesPreparacaoRecebimento,
  prepararCorrecaoPagamento,
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

function correcao(
  vendaId: string,
  recebimentoId: string,
  opcoes: Partial<Omit<ComandoCorrecaoPagamento, 'vendaId' | 'recebimentoId'>> = {},
): ComandoCorrecaoPagamento {
  return {
    vendaId,
    recebimentoId,
    valorCentavos: opcoes.valorCentavos ?? 20100,
    data: opcoes.data ?? referencia,
    forma: opcoes.forma ?? 'Dinheiro',
    observacao: opcoes.observacao ?? 'corrigido',
  };
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

describe('Correção individual por identidade estável', () => {
  afterEach(() => vi.restoreAllMocks());

  it('substitui valor, data, forma e nota no mesmo ID/alocação e move a competência', () => {
    const referenciaCorrecao = '2027-03-31';
    const original = venda('venda-correcao', referenciaCorrecao, 100003);
    const base = original.parcelas[1].valorCentavos;
    const pago = prepararPagamento(
      [original],
      comando(original, 1, '2027-01-31', {
        valorCentavos: base + 100,
        observacao: 'antes',
      }),
      referenciaCorrecao,
      'pagamento-estavel',
    );
    expect(pago.tipo).toBe('sucesso');
    if (pago.tipo !== 'sucesso') throw new Error(pago.mensagem);
    const vendaPaga = pago.valor[0];
    const recebimentoOriginal = vendaPaga.recebimentos.at(-1)!;
    const janeiroAntes = calculos.consultarPeriodo([vendaPaga], '2027-01-01', '2027-01-31');
    const fevereiroAntes = calculos.consultarPeriodo([vendaPaga], '2027-02-01', '2027-02-28');
    expect(janeiroAntes.tipo).toBe('sucesso');
    expect(fevereiroAntes.tipo).toBe('sucesso');

    const comandoCorrecao = correcao(vendaPaga.id, recebimentoOriginal.id, {
      valorCentavos: base + 50,
      data: '2027-02-15',
      forma: 'Pix',
      observacao: 'depois',
    });
    const preparada = prepararCorrecaoPagamento([vendaPaga], comandoCorrecao, referenciaCorrecao);
    expect(preparada.tipo).toBe('sucesso');
    if (preparada.tipo !== 'sucesso') throw new Error(preparada.mensagem);
    const corrigida = preparada.valor[0];
    const recebimentoCorrigido = corrigida.recebimentos.at(-1)!;
    expect(corrigida.recebimentos).toHaveLength(vendaPaga.recebimentos.length);
    expect(recebimentoCorrigido).toMatchObject({
      id: recebimentoOriginal.id,
      origem: 'individual',
      data: '2027-02-15',
      forma: 'Pix',
      valorCentavos: base + 50,
      acrescimoCentavos: 50,
      observacao: 'depois',
      alocacoes: [{ parcelaId: original.parcelas[1].id, valorCentavos: base + 50 }],
    });
    expect(corrigida.parcelas).toEqual(vendaPaga.parcelas);
    expect(corrigida.valorTotalCentavos).toBe(original.valorTotalCentavos);
    expect(calculos.projetarVenda(corrigida, referenciaCorrecao)).toMatchObject({
      valorTotalEfetivoCentavos: original.valorTotalCentavos + 50,
      totalPagoCentavos:
        calculos.projetarVenda(vendaPaga, referenciaCorrecao).totalPagoCentavos - 50,
      saldoCentavos: calculos.projetarVenda(vendaPaga, referenciaCorrecao).saldoCentavos,
    });
    expect(vendaPaga.recebimentos.at(-1)).toEqual(recebimentoOriginal);

    const janeiroDepois = calculos.consultarPeriodo([corrigida], '2027-01-01', '2027-01-31');
    const fevereiroDepois = calculos.consultarPeriodo([corrigida], '2027-02-01', '2027-02-28');
    if (
      janeiroAntes.tipo !== 'sucesso' ||
      janeiroDepois.tipo !== 'sucesso' ||
      fevereiroAntes.tipo !== 'sucesso' ||
      fevereiroDepois.tipo !== 'sucesso'
    )
      throw new Error('O período civil deveria ser válido.');
    expect(janeiroAntes.valor.recebidosCentavos - janeiroDepois.valor.recebidosCentavos).toBe(
      recebimentoOriginal.valorCentavos,
    );
    expect(fevereiroDepois.valor.recebidosCentavos - fevereiroAntes.valor.recebidosCentavos).toBe(
      base + 50,
    );
  });

  it('rejeita valor/data/forma/nota inválidos, venda não ativa e ID obsoleto sem mutação', () => {
    const original = venda('venda-correcao');
    const vendaPaga = aceitar(
      [original],
      comando(original, 1, referencia, { valorCentavos: 20100 }),
    )[0];
    const pagamento = vendaPaga.recebimentos.at(-1)!;
    const invalidas = [
      correcao(vendaPaga.id, pagamento.id, { valorCentavos: 19999 }),
      correcao(vendaPaga.id, pagamento.id, { valorCentavos: Number.MAX_SAFE_INTEGER }),
      correcao(vendaPaga.id, pagamento.id, { data: '2026-12-31' }),
      correcao(vendaPaga.id, pagamento.id, { data: '2027-02-01' }),
      correcao(vendaPaga.id, pagamento.id, { data: '2027-02-29' }),
      correcao(vendaPaga.id, pagamento.id, { forma: 'Transferência' }),
      correcao(vendaPaga.id, pagamento.id, { observacao: '123456789012345678901' }),
    ];
    for (const comandoInvalido of invalidas) {
      const snapshot = structuredClone([vendaPaga]);
      expect(prepararCorrecaoPagamento([vendaPaga], comandoInvalido, referencia).tipo).toBe(
        'validacao',
      );
      expect([vendaPaga]).toEqual(snapshot);
    }

    expect(
      prepararCorrecaoPagamento(
        [vendaPaga],
        correcao(vendaPaga.id, 'pagamento-removido'),
        referencia,
      ),
    ).toMatchObject({ tipo: 'inexistencia', codigo: 'recebimento-inexistente' });
    const outraVenda = venda('outra-venda');
    const vendaOutraPaga = aceitar(
      [outraVenda],
      comando(outraVenda),
      'pagamento-de-outra-venda',
    )[0];
    const pagamentoDeOutraVenda = vendaOutraPaga.recebimentos.at(-1)!;
    expect(
      prepararCorrecaoPagamento(
        [vendaPaga, vendaOutraPaga],
        correcao(vendaPaga.id, pagamentoDeOutraVenda.id),
        referencia,
      ),
    ).toMatchObject({
      tipo: 'inelegibilidade',
      codigo: 'recebimento-de-outra-venda',
    });
    const inativa = { ...vendaPaga, statusAdministrativo: 'Inativo' as const };
    expect(
      prepararCorrecaoPagamento([inativa], correcao(inativa.id, pagamento.id), referencia),
    ).toMatchObject({ tipo: 'inelegibilidade', codigo: 'venda-nao-ativa' });
    expect(vendaPaga.recebimentos.at(-1)).toEqual(pagamento);
  });

  it('não corrige entrada nem lote histórico e não duplica pagamento ao repetir o comando', () => {
    const original = venda('venda-historica');
    const pagoIndividual = aceitar([original], comando(original, 1), 'individual-1')[0];
    const pagamento = pagoIndividual.recebimentos.at(-1)!;
    const pedido = correcao(pagoIndividual.id, pagamento.id, {
      valorCentavos: pagamento.valorCentavos,
    });
    const umaVez = prepararCorrecaoPagamento([pagoIndividual], pedido, referencia);
    expect(umaVez.tipo).toBe('sucesso');
    if (umaVez.tipo !== 'sucesso') throw new Error(umaVez.mensagem);
    const repetida = prepararCorrecaoPagamento(umaVez.valor, pedido, referencia);
    expect(repetida.tipo).toBe('sucesso');
    if (repetida.tipo !== 'sucesso') throw new Error(repetida.mensagem);
    expect(repetida.valor[0].recebimentos).toHaveLength(pagoIndividual.recebimentos.length);
    expect(repetida.valor[0].recebimentos.map((item) => item.id)).toEqual(
      pagoIndividual.recebimentos.map((item) => item.id),
    );

    const originalLote = venda('venda-com-historico');
    const parcelasLote = originalLote.parcelas.slice(1, 3);
    const historico = prepararPagamentoHistorico(
      [originalLote],
      {
        vendaId: originalLote.id,
        parcelaIds: parcelasLote.map((parcela) => parcela.id),
        valorCentavos: parcelasLote.reduce((total, parcela) => total + parcela.valorCentavos, 0),
        data: referencia,
        forma: 'Pix',
      },
      referencia,
      'lote-historico',
    );
    expect(historico.tipo).toBe('sucesso');
    if (historico.tipo !== 'sucesso') throw new Error(historico.mensagem);
    for (const legado of historico.valor[0].recebimentos) {
      expect(
        prepararCorrecaoPagamento(
          historico.valor,
          correcao(originalLote.id, legado.id, { valorCentavos: legado.valorCentavos }),
          referencia,
        ),
      ).toMatchObject({
        tipo: 'inelegibilidade',
        codigo: 'recebimento-historico-nao-editavel',
      });
    }

    const seed = criarDadosDemonstrativos(referencia);
    for (const vendaSeed of seed) {
      for (const legado of vendaSeed.recebimentos) {
        expect(legado.origem).toBeUndefined();
      }
    }
  });

  it('preserva conjunto em falha final e permite retry válido', () => {
    const original = venda('venda-retry');
    const vendaPaga = aceitar([original], comando(original, 1), 'pagamento-retry')[0];
    const pagamento = vendaPaga.recebimentos.at(-1)!;
    const vendas = [vendaPaga];
    const antes = structuredClone(vendas);
    const operacoes: OperacoesPreparacaoCorrecaoPagamento = {
      validarConjunto: vi.fn(() => {
        throw new Error('falha de projeção controlada');
      }),
    };
    const pedido = correcao(vendaPaga.id, pagamento.id, {
      valorCentavos: pagamento.valorCentavos + 25,
    });
    expect(prepararCorrecaoPagamento(vendas, pedido, referencia, operacoes).tipo).toBe('falha');
    expect(vendas).toEqual(antes);
    expect(operacoes.validarConjunto).toHaveBeenCalledTimes(1);
    expect(prepararCorrecaoPagamento(vendas, pedido, referencia).tipo).toBe('sucesso');
    expect(vendas).toEqual(antes);
  });
});
