import * as parcelas from './parcela.calculos';
import * as calculos from '../vendas/venda.calculos';
import { Venda } from '../vendas/venda.modelos';
import { prepararCadastro } from '../vendas/venda.validacoes';
import { ComandoPagamento, FORMAS_PAGAMENTO } from './pagamento.modelos';
import { prepararPagamento, selecionarParcelas } from './pagamento.validacoes';

const referencia = '2027-01-31';
function venda(id = 'v1'): Venda {
  const r = prepararCadastro({ cliente: { nome: 'DEMO', cpf: 'CPF-DEMO', telefone: 'TEL-DEMO' }, valorTotalCentavos: 100000, quantidadeParcelas: 4, dataVenda: '2027-01-01', entrada: { valorCentavos: 20000, data: '2027-01-01', forma: 'Pix' } }, referencia, id);
  if (r.tipo !== 'sucesso') throw new Error(r.mensagem);
  return r.valor;
}
function comando(v = venda(), quantidade = 3): ComandoPagamento {
  return { vendaId: v.id, parcelaIds: v.parcelas.slice(0, quantidade).map((p) => p.id), valorCentavos: quantidade * 20000, data: referencia, forma: 'Pix' };
}
function aceitar(vendas: readonly Venda[], c: ComandoPagamento, id = 'r1'): readonly Venda[] {
  const r = prepararPagamento(vendas, c, referencia, id);
  expect(r.tipo).toBe('sucesso');
  if (r.tipo !== 'sucesso') throw new Error(r.mensagem);
  return r.valor;
}

describe('Seleção integral sequencial', () => {
  afterEach(() => vi.restoreAllMocks());

  it('aceita a primeira pendente isolada e várias consecutivas, independentemente da ordem textual', () => {
    const v = venda();
    expect(selecionarParcelas(v, [v.parcelas[0].id], referencia)).toMatchObject({ tipo: 'sucesso', valor: [v.parcelas[0]] });
    const preparadas = aceitar([v], { ...comando(v), parcelaIds: [...comando(v).parcelaIds].reverse() });
    expect(preparadas[0].recebimentos[0].alocacoes.map((a) => a.parcelaId)).toEqual(comando(v).parcelaIds);
    const depois = aceitar([v], comando(v, 1));
    expect(selecionarParcelas(depois[0], [v.parcelas[1].id, v.parcelas[2].id], referencia).tipo).toBe('sucesso');
  });

  it.each([[], [1], [0, 2], [0, 0], [0, 4], [4]].map((indices) => ({ indices })))('rejeita seleção vazia, salto, repetição ou ausente: $indices', ({ indices }) => {
    const v = venda();
    const antes = structuredClone(v);
    expect(selecionarParcelas(v, indices.map((i) => v.parcelas[i]?.id ?? 'ausente'), referencia).tipo).toBe('inelegibilidade');
    expect(v).toEqual(antes);
  });

  it('rejeita parcela paga e parcela de outra venda', () => {
    const v = venda();
    const depois = aceitar([v], comando(v, 1));
    expect(selecionarParcelas(depois[0], [v.parcelas[0].id], referencia).tipo).toBe('inelegibilidade');
    expect(selecionarParcelas(v, [venda('v2').parcelas[0].id], referencia).tipo).toBe('inelegibilidade');
  });

  it.each(FORMAS_PAGAMENTO)('antecipa três parcelas de R$ 200 com %s e metadados comuns', (forma) => {
    const v = venda();
    const depois = aceitar([v], { ...comando(v), forma });
    const r = depois[0].recebimentos[0];
    expect(r).toMatchObject({ valorCentavos: 60000, data: referencia, forma });
    expect(r.alocacoes.map((a) => a.valorCentavos)).toEqual([20000, 20000, 20000]);
    const p = calculos.projetarVenda(depois[0], referencia);
    expect(p).toMatchObject({ totalPagoCentavos: 80000, saldoCentavos: 20000, quantidadePaga: 3 });
    expect(p.parcelas.slice(0, 3).every((p) => p.dataPagamento === referencia && p.formaPagamento === forma)).toBe(true);
    expect(calculos.resumirVendas(depois, referencia).recebidoNoMesCentavos).toBe(80000);
    expect(v.recebimentos).toEqual([]);
  });

  it.each([
    { valorCentavos: 59999 }, { valorCentavos: 60001 }, { valorCentavos: -1 }, { valorCentavos: 0.5 },
    { forma: '' }, { forma: 'Transferência' }, { data: '2027-02-29' },
    { data: '2026-12-31' }, { data: '2027-02-01' },
  ])('rejeita valor, forma ou data: %j sem mutação', (alteracao) => {
    const vendas = [venda()];
    const c = { ...comando(), ...alteracao };
    const antes = structuredClone({ vendas, c });
    expect(prepararPagamento(vendas, c, referencia, 'r1').tipo).toBe('validacao');
    expect({ vendas, c }).toEqual(antes);
  });

  it.each(['2027-01-01', referencia])('aceita a borda de data %s', (data) => {
    expect(prepararPagamento([venda()], { ...comando(), data }, referencia, 'r1').tipo).toBe('sucesso');
  });

  it('preparação descartada, repetição e seleção obsoleta não mudam o conjunto atual', () => {
    const inicial = [venda(), venda('v2')];
    const antes = structuredClone(inicial);
    const c = comando();
    const antiga = selecionarParcelas(inicial[0], c.parcelaIds, referencia);
    expect(antiga.tipo).toBe('sucesso');
    expect(inicial).toEqual(antes);
    const depois = aceitar(inicial, comando(inicial[0], 1));
    const snapshot = structuredClone(depois);
    expect(prepararPagamento(depois, comando(inicial[0], 1), referencia, 'r2').tipo).toBe('inelegibilidade');
    expect(prepararPagamento(depois, c, referencia, 'r3').tipo).toBe('inelegibilidade');
    expect(depois).toEqual(snapshot);
    expect(prepararPagamento(depois, { ...c, vendaId: 'ausente' }, referencia, 'r4').tipo).toBe('inexistencia');
    expect(depois).toEqual(snapshot);
  });

  it('falha na segunda preparação ou na validação final preserva o snapshot completo e permite tentar de novo', () => {
    const inicial = [venda(), venda('v2')];
    const snapshot = structuredClone(inicial);
    const original = parcelas.prepararAlocacao;
    vi.spyOn(parcelas, 'prepararAlocacao').mockImplementationOnce(original).mockImplementationOnce(() => { throw new Error('Falha controlada em teste'); });
    expect(prepararPagamento(inicial, comando(), referencia, 'r1').tipo).toBe('falha');
    expect(inicial).toEqual(snapshot);
    vi.restoreAllMocks();
    vi.spyOn(calculos, 'projetarVendas').mockImplementationOnce(() => { throw new Error('Falha final controlada em teste'); });
    expect(prepararPagamento(inicial, comando(), referencia, 'r1').tipo).toBe('falha');
    expect(inicial).toEqual(snapshot);
    vi.restoreAllMocks();
    const depois = aceitar(inicial, comando());
    expect(depois[0].recebimentos).toHaveLength(1);
    expect(depois[0].recebimentos[0].alocacoes).toHaveLength(3);
    expect(inicial).toEqual(snapshot);
  });

  it('quita as restantes e não aceita identificador de recebimento repetido', () => {
    const v = venda();
    const depois = aceitar([v], comando(v, 4));
    expect(calculos.projetarVenda(depois[0], referencia)).toMatchObject({ saldoCentavos: 0, situacao: 'Quitada', proximoVencimento: null });
    expect(calculos.resumirVendas(depois, referencia).recebidoNoMesCentavos).toBe(100000);
    const parcial = aceitar([v], comando(v, 1));
    const r = prepararPagamento(parcial, { ...comando(v, 1), parcelaIds: [v.parcelas[1].id] }, referencia, 'r1');
    expect(r.tipo).toBe('validacao');
  });
});
