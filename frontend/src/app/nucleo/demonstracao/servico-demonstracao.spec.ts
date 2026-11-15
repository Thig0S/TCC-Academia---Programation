import { TestBed } from '@angular/core/testing';
import { ComandoCadastro, Resultado } from '../../funcionalidades/vendas/venda.modelos';
import { criarDadosDemonstrativos } from './dados-demonstrativos';
import { PreparadorRecebimento } from './preparador-recebimento';
import { REFERENCIA_DEMONSTRACAO } from './referencia-demonstracao';
import { ServicoDemonstracao } from './servico-demonstracao';

const referencia = '2027-01-31';
function cadastro(): ComandoCadastro {
  return {
    cliente: { nome: 'Cliente DEMO teste', cpf: 'CPF-DEMO', telefone: 'TEL-DEMO' },
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
      parcelaIds: v.parcelas.slice(0, 2).map((p) => p.id),
      valorCentavos: 40000,
      data: referencia,
      forma: 'Pix',
    };
    expect(fonte.vendas()).toHaveLength(13);
    expect(fonte.resumo()).toMatchObject({
      totalEmAbertoCentavos: base.totalEmAbertoCentavos + 80000,
      recebidoNoMesCentavos: base.recebidoNoMesCentavos + 20000,
      vendasCadastradas: 13,
    });
    sucesso(fonte.registrarPagamento(c));
    const snapshot = fonte.vendas();
    expect(sucesso(fonte.consultarVenda(v.id))).toMatchObject({
      totalPagoCentavos: 60000,
      saldoCentavos: 40000,
      quantidadePaga: 2,
    });
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(base.recebidoNoMesCentavos + 60000);
    expect(fonte.registrarPagamento(c).tipo).toBe('inelegibilidade');
    expect(fonte.registrarPagamento({ ...c, vendaId: 'ausente' }).tipo).toBe('inexistencia');
    expect(fonte.vendas()).toBe(snapshot);
    const final = sucesso(
      fonte.registrarPagamento({ ...c, parcelaIds: v.parcelas.slice(2).map((p) => p.id) }),
    );
    expect(final.recebimentos.map((r) => r.id)).toEqual([
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
        parcelaIds: v.parcelas.slice(0, 3).map((p) => p.id),
        valorCentavos: 60000,
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
      expect(aceita.recebimentos).toHaveLength(1);
      expect(aceita.recebimentos[0].id).toBe('sessao/recebimento/2');
      expect(aceita.recebimentos[0].alocacoes).toHaveLength(3);
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
        parcelaIds: v.parcelas.map((p) => p.id),
        valorCentavos: 80000,
        data: referencia,
        forma: 'Pix',
      }),
    );
    const paga = sucesso(fonte.consultarVenda(v.id));
    expect(Reflect.set(paga.recebimentos[0].alocacoes[0], 'valorCentavos', 1)).toBe(false);
    expect(consultada.recebimentos).toEqual([]);
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
