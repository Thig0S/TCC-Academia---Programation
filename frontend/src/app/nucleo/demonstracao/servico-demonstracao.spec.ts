import { TestBed } from '@angular/core/testing';
import { ComandoCadastro, Resultado } from '../../funcionalidades/vendas/venda.modelos';
import { criarDadosDemonstrativos } from './dados-demonstrativos';
import { PreparadorRecebimento } from './preparador-recebimento';
import { REFERENCIA_DEMONSTRACAO } from './referencia-demonstracao';
import { ServicoDemonstracao } from './servico-demonstracao';

const referencia = '2027-01-31';
function cadastro(): ComandoCadastro {
  return {
    cliente: { nome: 'Cliente DEMO teste', cpf: '90000000175', telefone: '00900000001' },
    dataVenda: '2027-01-01',
    valorTotalCentavos: 100000,
    quantidadeParcelas: 4,
    entrada: { valorCentavos: 20000, data: '2027-01-01', forma: 'Pix' },
  };
}
function sucesso<T>(resultado: Resultado<T>): T {
  expect(resultado.tipo).toBe('sucesso');
  if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
  return resultado.valor;
}
function iniciar(preparador = new PreparadorRecebimento()): ServicoDemonstracao {
  TestBed.configureTestingModule({
    providers: [
      { provide: REFERENCIA_DEMONSTRACAO, useValue: referencia },
      { provide: PreparadorRecebimento, useValue: preparador },
    ],
  });
  return TestBed.inject(ServicoDemonstracao);
}

describe('Fonte demonstrativa de sessão', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    { referencia: '0001-01-01', dataVenda: '0001-01-01' },
    { referencia: '2027-01-31', dataVenda: '2026-12-01' },
    { referencia: '9999-12-31', dataVenda: '9999-10-31' },
  ])('reconcilia o ciclo integrado e recria sessão em $referencia', ({ referencia, dataVenda }) => {
    const criarFonte = () => {
      TestBed.configureTestingModule({
        providers: [{ provide: REFERENCIA_DEMONSTRACAO, useValue: referencia }],
      });
      return TestBed.inject(ServicoDemonstracao);
    };
    const fonte = criarFonte();
    const seed = fonte.vendas();
    const somar = (valores: readonly number[]) => valores.reduce((a, b) => a + b, 0);
    const conferir = () => {
      const vendas = fonte.vendas();
      const recebimentos = vendas.flatMap((v) => v.recebimentos);
      for (const v of vendas) {
        const pagas = new Set(v.recebimentos.flatMap((r) => r.alocacoes.map((a) => a.parcelaId)));
        const pendentes = v.parcelas.filter((p) => !pagas.has(p.id));
        expect(v.totalPagoCentavos).toBe(somar(v.recebimentos.map((r) => r.valorCentavos)));
        expect(v.saldoCentavos).toBe(v.valorTotalCentavos - v.totalPagoCentavos);
        expect(v.saldoCentavos).toBe(somar(pendentes.map((p) => p.valorCentavos)));
        expect(v.quantidadePaga).toBe(pagas.size);
        expect(v.proximoVencimento).toBe(pendentes[0]?.vencimento ?? null);
        expect(sucesso(fonte.consultarVenda(v.id))).toEqual(v);
      }
      expect(fonte.abertas()).toEqual(vendas.filter((v) => v.saldoCentavos > 0));
      expect(fonte.quitadas()).toEqual(vendas.filter((v) => v.saldoCentavos === 0));
      const pendentes = vendas.flatMap((v) => v.parcelas.filter((p) => p.situacao !== 'Paga'));
      expect(fonte.resumo()).toEqual({
        totalEmAbertoCentavos: somar(pendentes.map((p) => p.valorCentavos)),
        valoresEmAtrasoCentavos: somar(
          pendentes.filter((p) => p.vencimento < referencia).map((p) => p.valorCentavos),
        ),
        recebidoNoMesCentavos: somar(
          recebimentos
            .filter((r) => r.data.slice(0, 7) === referencia.slice(0, 7))
            .map((r) => r.valorCentavos),
        ),
        vendasCadastradas: vendas.length,
      });
      for (const [inicio, fim] of [
        ['0001-01-01', '9999-12-31'],
        [dataVenda, dataVenda],
        [referencia, referencia],
      ]) {
        const dentro = (data: string) => data >= inicio && data <= fim;
        expect(sucesso(fonte.consultarPeriodo(inicio, fim))).toEqual({
          recebidosCentavos: somar(
            recebimentos.filter((r) => dentro(r.data)).map((r) => r.valorCentavos),
          ),
          vendas: vendas
            .filter((v) => dentro(v.dataVenda))
            .map((v) => ({
              id: v.id,
              cliente: v.cliente,
              dataVenda: v.dataVenda,
              valorTotalCentavos: v.valorTotalCentavos,
              entrada: v.entrada,
              recebimentos: v.recebimentos,
              parcelas: v.parcelas.map(({ id, numero, valorCentavos, vencimento }) => ({
                id,
                numero,
                valorCentavos,
                vencimento,
              })),
            })),
        });
      }
    };
    conferir();
    const v = sucesso(
      fonte.cadastrarVenda({
        ...cadastro(),
        dataVenda,
        quantidadeParcelas: 3,
        entrada: { valorCentavos: 20000, data: dataVenda, forma: 'Pix' },
      }),
    );
    conferir();
    const comando = {
      vendaId: v.id,
      parcelaIds: [v.parcelas[1].id],
      valorCentavos: v.parcelas[1].valorCentavos,
      data: referencia,
      forma: 'Dinheiro',
    };
    const antes = fonte.vendas();
    expect(fonte.registrarPagamento({ ...comando, valorCentavos: 39999 }).tipo).toBe('validacao');
    expect(fonte.vendas()).toBe(antes);
    conferir();
    sucesso(fonte.registrarPagamento(comando));
    conferir();
    const parcial = fonte.vendas();
    expect(fonte.registrarPagamento(comando).tipo).toBe('inelegibilidade');
    expect(fonte.vendas()).toBe(parcial);
    sucesso(
      fonte.registrarPagamento({
        ...comando,
        parcelaIds: [v.parcelas[2].id],
        valorCentavos: v.parcelas[2].valorCentavos,
      }),
    );
    conferir();
    expect(sucesso(fonte.consultarVenda(v.id))).toMatchObject({
      situacao: 'Quitada',
      saldoCentavos: 0,
    });
    TestBed.resetTestingModule();
    const nova = criarFonte();
    expect(nova.referencia).toBe(referencia);
    expect(nova.vendas()).toEqual(seed);
    expect(nova.vendas()[0]).not.toBe(seed[0]);
    expect(nova.consultarVenda(v.id).tipo).toBe('inexistencia');
  });

  it('usa referência explícita, consulta ausente distinta de período vazio e mensagens tipadas', () => {
    const fonte = iniciar();
    expect(fonte.referencia).toBe(referencia);
    expect(fonte.vendas()).toHaveLength(12);
    expect(fonte.consultarVenda('ausente')).toMatchObject({
      tipo: 'inexistencia',
      codigo: 'venda-inexistente',
    });
    expect(sucesso(fonte.consultarPeriodo('2020-01-01', '2020-01-31'))).toEqual({
      recebidosCentavos: 0,
      vendas: [],
    });
    expect(fonte.consultarPeriodo(referencia, '2027-01-01').tipo).toBe('validacao');
    expect(
      fonte.cadastrarVenda({ ...cadastro(), cliente: { nome: '', cpf: '', telefone: '' } }),
    ).toMatchObject({ tipo: 'validacao', codigo: 'identificacao-obrigatoria' });
    const v = sucesso(fonte.cadastrarVenda(cadastro()));
    expect(v.id).toBe('sessao/venda/1');
    expect(v.cliente.descricao).toBeNull();
    expect(sucesso(fonte.cadastrarVenda(cadastro())).id).toBe('sessao/venda/2');
  });

  it('publica cadastro e lote uma vez, revalida repetição e reconcilia todas as projeções', () => {
    const fonte = iniciar();
    const base = fonte.resumo();
    const v = sucesso(fonte.cadastrarVenda(cadastro()));
    const c = {
      vendaId: v.id,
      parcelaIds: v.parcelas.slice(1, 3).map((p) => p.id),
      valorCentavos: v.parcelas
        .slice(1, 3)
        .reduce((total, parcela) => total + parcela.valorCentavos, 0),
      data: referencia,
      forma: 'Pix',
    };
    expect(fonte.vendas()).toHaveLength(13);
    expect(fonte.resumo()).toMatchObject({
      totalEmAbertoCentavos: base.totalEmAbertoCentavos + 80000,
      recebidoNoMesCentavos: base.recebidoNoMesCentavos + 20000,
      vendasCadastradas: 13,
    });
    const antesDeSelecionar = fonte.vendas();
    for (const parcelaIds of [[v.parcelas[0].id], [v.parcelas[0].id, v.parcelas[1].id]]) {
      expect(
        fonte.registrarPagamento({
          vendaId: v.id,
          parcelaIds,
          valorCentavos: parcelaIds.reduce(
            (total, id) => total + v.parcelas.find((parcela) => parcela.id === id)!.valorCentavos,
            0,
          ),
          data: referencia,
          forma: 'Pix',
        }).tipo,
      ).toBe('inelegibilidade');
    }
    expect(fonte.vendas()).toBe(antesDeSelecionar);
    sucesso(fonte.registrarPagamento(c));
    const snapshot = fonte.vendas();
    expect(sucesso(fonte.consultarVenda(v.id))).toMatchObject({
      totalPagoCentavos: 20000 + c.valorCentavos,
      saldoCentavos: 100000 - 20000 - c.valorCentavos,
      quantidadePaga: 3,
    });
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(
      base.recebidoNoMesCentavos + 20000 + c.valorCentavos,
    );
    expect(fonte.registrarPagamento(c).tipo).toBe('inelegibilidade');
    expect(fonte.registrarPagamento({ ...c, vendaId: 'ausente' }).tipo).toBe('inexistencia');
    expect(fonte.vendas()).toBe(snapshot);
    const final = sucesso(
      fonte.registrarPagamento({
        ...c,
        parcelaIds: [v.parcelas[3].id],
        valorCentavos: v.parcelas[3].valorCentavos,
      }),
    );
    expect(final.recebimentos.map((r) => r.id)).toEqual([
      `${v.id}/recebimento/entrada`,
      'sessao/recebimento/2',
      'sessao/recebimento/3',
    ]);
    expect(fonte.abertas().some((item) => item.id === v.id)).toBe(false);
    expect(fonte.quitadas().filter((item) => item.id === v.id)).toHaveLength(1);
    expect(sucesso(fonte.consultarVenda(v.id))).toMatchObject({
      saldoCentavos: 0,
      totalPagoCentavos: 100000,
      proximoVencimento: null,
    });
    expect(fonte.resumo().totalEmAbertoCentavos).toBe(base.totalEmAbertoCentavos);
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(base.recebidoNoMesCentavos + 100000);
    expect(sucesso(fonte.consultarPeriodo('2027-01-01', referencia)).recebidosCentavos).toBe(
      base.recebidoNoMesCentavos + 100000,
    );
  });

  it.each(['posterior', 'final'] as const)(
    'double TestBed com falha %s preserva agregado e contador e permite nova tentativa',
    (etapa) => {
      const preparador = new PreparadorRecebimento();
      const fonte = iniciar(preparador);
      const v = sucesso(fonte.cadastrarVenda(cadastro()));
      const c = {
        vendaId: v.id,
        parcelaIds: v.parcelas.slice(1, 3).map((p) => p.id),
        valorCentavos: v.parcelas[1].valorCentavos + v.parcelas[2].valorCentavos,
        data: referencia,
        forma: 'Pix',
      };
      const snapshot = structuredClone({
        vendas: fonte.vendas(),
        resumo: fonte.resumo(),
        abertas: fonte.abertas(),
        quitadas: fonte.quitadas(),
        referencia: fonte.referencia,
      });
      const anterior = fonte.vendas();
      if (etapa === 'posterior') {
        const original = preparador.alocar.bind(preparador);
        vi.spyOn(preparador, 'alocar')
          .mockImplementationOnce(original)
          .mockImplementationOnce(() => {
            throw new Error('Falha somente no teste');
          });
      } else {
        vi.spyOn(preparador, 'validarConjunto').mockImplementationOnce(() => {
          throw new Error('Falha final somente no teste');
        });
      }
      expect(fonte.registrarPagamento(c).tipo).toBe('falha');
      expect(fonte.vendas()).toBe(anterior);
      expect({
        vendas: fonte.vendas(),
        resumo: fonte.resumo(),
        abertas: fonte.abertas(),
        quitadas: fonte.quitadas(),
        referencia: fonte.referencia,
      }).toEqual(snapshot);
      vi.restoreAllMocks();
      const aceita = sucesso(fonte.registrarPagamento(c));
      expect(aceita.recebimentos).toHaveLength(2);
      expect(aceita.recebimentos[1].id).toBe('sessao/recebimento/2');
      expect(aceita.recebimentos[1].alocacoes).toHaveLength(2);
      expect(sucesso(fonte.cadastrarVenda(cadastro())).id).toBe('sessao/venda/3');
    },
  );

  it('rejeita overflow agregado sem consumir ID ou alterar o conjunto', () => {
    const fonte = iniciar();
    const antes = fonte.vendas();
    expect(
      fonte.cadastrarVenda({
        ...cadastro(),
        valorTotalCentavos: Number.MAX_SAFE_INTEGER,
        quantidadeParcelas: 1,
        entrada: null,
      }).tipo,
    ).toBe('validacao');
    expect(fonte.vendas()).toBe(antes);
    expect(sucesso(fonte.cadastrarVenda(cadastro())).id).toBe('sessao/venda/1');
  });

  it('copia rascunhos e congela profundamente consultas, resultados e snapshots', () => {
    const fonte = iniciar();
    const seed = fonte.vendas();
    const rascunho = cadastro();
    const v = sucesso(fonte.cadastrarVenda(rascunho));
    Reflect.set(rascunho.cliente, 'nome', 'alterado externamente');
    Reflect.set(rascunho.entrada!, 'valorCentavos', 1);
    const consultada = sucesso(fonte.consultarVenda(v.id));
    expect(consultada.cliente.nome).toBe('Cliente DEMO teste');
    expect(consultada.entrada?.valorCentavos).toBe(20000);
    expect(Reflect.set(consultada.cliente, 'nome', 'intruso')).toBe(false);
    expect(Reflect.set(consultada.parcelas[0], 'valorCentavos', 1)).toBe(false);
    expect(Reflect.set(fonte.vendas(), '0', v)).toBe(false);
    expect(Reflect.set(v.entrada!, 'forma', 'Dinheiro')).toBe(false);
    const periodo = sucesso(fonte.consultarPeriodo('2027-01-01', referencia));
    expect(Reflect.set(periodo.vendas[0].cliente, 'cpf', 'intruso')).toBe(false);
    sucesso(
      fonte.registrarPagamento({
        vendaId: v.id,
        parcelaIds: v.parcelas.slice(1).map((p) => p.id),
        valorCentavos: v.parcelas
          .slice(1)
          .reduce((total, parcela) => total + parcela.valorCentavos, 0),
        data: referencia,
        forma: 'Pix',
      }),
    );
    const paga = sucesso(fonte.consultarVenda(v.id));
    expect(Reflect.set(paga.recebimentos[0].alocacoes[0], 'valorCentavos', 1)).toBe(false);
    expect(consultada.recebimentos).toEqual([
      expect.objectContaining({ id: `${v.id}/recebimento/entrada` }),
    ]);
    expect(seed).toHaveLength(12);
    expect(seed.map(({ id }) => id)).toEqual(
      criarDadosDemonstrativos(referencia).map(({ id }) => id),
    );
    TestBed.resetTestingModule();
    const nova = iniciar();
    expect(nova.vendas()).toHaveLength(12);
    expect(nova.vendas()).toEqual(seed);
    expect(nova.vendas()[0].cliente).not.toBe(seed[0].cliente);
    expect(nova.consultarVenda(v.id).tipo).toBe('inexistencia');
    expect(sucesso(nova.cadastrarVenda(cadastro())).id).toBe('sessao/venda/1');
  });
});
