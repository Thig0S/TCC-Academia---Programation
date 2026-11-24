import { TestBed } from '@angular/core/testing';
import {
  ComandoCadastro,
  ComandoMudancaStatus,
  Resultado,
  StatusAdministrativoVenda,
} from '../../funcionalidades/vendas/venda.modelos';
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
      const ativas = vendas.filter((v) => v.statusAdministrativo === 'Ativo');
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
      expect(fonte.abertas()).toEqual(ativas.filter((v) => v.saldoCentavos > 0));
      expect(fonte.quitadas()).toEqual(ativas.filter((v) => v.saldoCentavos === 0));
      expect(fonte.inativas()).toEqual(vendas.filter((v) => v.statusAdministrativo === 'Inativo'));
      expect(fonte.prejuizos()).toEqual(
        vendas.filter((v) => v.statusAdministrativo === 'Prejuízo'),
      );
      const pendentes = ativas.flatMap((v) => v.parcelas.filter((p) => p.situacao !== 'Paga'));
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
        vendasCadastradas: ativas.length,
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
              statusAdministrativo: v.statusAdministrativo,
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
      parcelaId: v.parcelas[1].id,
      data: referencia,
      forma: 'Dinheiro',
    };
    const antes = fonte.vendas();
    expect(
      fonte.registrarPagamento({
        ...comando,
        parcelaIds: [comando.parcelaId],
        valorCentavos: 39999,
      } as unknown as import('../../funcionalidades/parcelas/pagamento.modelos').ComandoPagamento)
        .tipo,
    ).toBe('validacao');
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
        parcelaId: v.parcelas[2].id,
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

  it('aplica somente as transições administrativas permitidas e preserva o histórico', () => {
    const fonte = iniciar();
    const inicial = sucesso(fonte.cadastrarVenda(cadastro()));
    expect(inicial.statusAdministrativo).toBe('Ativo');

    const inativa = sucesso(fonte.alterarStatus({ vendaId: inicial.id, status: 'Inativo' }));
    expect(inativa).toEqual({ ...inicial, statusAdministrativo: 'Inativo' });
    const aposInativar = fonte.vendas();
    expect(fonte.alterarStatus({ vendaId: inicial.id, status: 'Prejuízo' }).tipo).toBe(
      'inelegibilidade',
    );
    expect(fonte.vendas()).toBe(aposInativar);

    expect(
      sucesso(fonte.alterarStatus({ vendaId: inicial.id, status: 'Inativo' })).statusAdministrativo,
    ).toBe('Inativo');
    expect(fonte.vendas()).toBe(aposInativar);

    const reativada = sucesso(fonte.alterarStatus({ vendaId: inicial.id, status: 'Ativo' }));
    expect(reativada.statusAdministrativo).toBe('Ativo');
    const prejuizo = sucesso(fonte.alterarStatus({ vendaId: inicial.id, status: 'Prejuízo' }));
    expect(prejuizo).toEqual({ ...inicial, statusAdministrativo: 'Prejuízo' });
    const aposPrejuizo = fonte.vendas();
    expect(fonte.alterarStatus({ vendaId: inicial.id, status: 'Inativo' }).tipo).toBe(
      'inelegibilidade',
    );
    expect(fonte.vendas()).toBe(aposPrejuizo);

    const reaberta = sucesso(fonte.alterarStatus({ vendaId: inicial.id, status: 'Ativo' }));
    expect(reaberta).toEqual(inicial);
    expect(reaberta.parcelas).toEqual(inicial.parcelas);
    expect(reaberta.recebimentos).toEqual(inicial.recebimentos);
  });

  it('rejeita venda quitada como Prejuízo, status inválido e identificador ausente sem mutação', () => {
    const fonte = iniciar();
    const venda = sucesso(fonte.cadastrarVenda(cadastro()));
    for (const parcela of venda.parcelas.slice(1)) {
      sucesso(
        fonte.registrarPagamento({
          vendaId: venda.id,
          parcelaId: parcela.id,
          data: referencia,
          forma: 'Pix',
        }),
      );
    }
    expect(sucesso(fonte.consultarVenda(venda.id)).saldoCentavos).toBe(0);
    const antes = fonte.vendas();
    expect(fonte.alterarStatus({ vendaId: venda.id, status: 'Prejuízo' }).tipo).toBe(
      'inelegibilidade',
    );
    expect(
      fonte.alterarStatus({
        vendaId: venda.id,
        status: 'Desconhecido' as StatusAdministrativoVenda,
      }).tipo,
    ).toBe('validacao');
    expect(fonte.alterarStatus({ vendaId: 'ausente', status: 'Inativo' }).tipo).toBe(
      'inexistencia',
    );
    expect(fonte.vendas()).toBe(antes);
  });

  it('reconcilia coleções e indicadores após inativação, prejuízo e reativação sem duplicar recebimentos', () => {
    const fonte = iniciar();
    const venda = sucesso(
      fonte.cadastrarVenda({ ...cadastro(), dataVenda: '2026-09-01', entrada: null }),
    );
    sucesso(
      fonte.registrarPagamento({
        vendaId: venda.id,
        parcelaId: venda.parcelas[0].id,
        data: '2027-01-15',
        forma: 'Pix',
      }),
    );
    const resumoAtivo = fonte.resumo();
    const recebimentosDoDia = sucesso(
      fonte.consultarPeriodo('2027-01-15', '2027-01-15'),
    ).recebidosCentavos;
    expect(sucesso(fonte.consultarVenda(venda.id))).toMatchObject({
      statusAdministrativo: 'Ativo',
      saldoCentavos: 75000,
    });
    expect(resumoAtivo).toMatchObject({
      totalEmAbertoCentavos: expect.any(Number),
      valoresEmAtrasoCentavos: expect.any(Number),
      recebidoNoMesCentavos: expect.any(Number),
      vendasCadastradas: 13,
    });
    expect(recebimentosDoDia).toBe(25000);
    expect(fonte.abertas().some((item) => item.id === venda.id)).toBe(true);

    const resumoSemVenda = {
      totalEmAbertoCentavos: resumoAtivo.totalEmAbertoCentavos - 75000,
      valoresEmAtrasoCentavos: resumoAtivo.valoresEmAtrasoCentavos - 75000,
      recebidoNoMesCentavos: resumoAtivo.recebidoNoMesCentavos,
      vendasCadastradas: resumoAtivo.vendasCadastradas - 1,
    };
    sucesso(fonte.alterarStatus({ vendaId: venda.id, status: 'Inativo' }));
    expect(fonte.resumo()).toEqual(resumoSemVenda);
    expect(fonte.abertas().some((item) => item.id === venda.id)).toBe(false);
    expect(fonte.quitadas().some((item) => item.id === venda.id)).toBe(false);
    expect(fonte.inativas().some((item) => item.id === venda.id)).toBe(true);
    expect(fonte.prejuizos().some((item) => item.id === venda.id)).toBe(false);
    expect(sucesso(fonte.consultarPeriodo('2027-01-15', '2027-01-15')).recebidosCentavos).toBe(
      recebimentosDoDia,
    );

    sucesso(fonte.alterarStatus({ vendaId: venda.id, status: 'Ativo' }));
    expect(fonte.resumo()).toEqual(resumoAtivo);
    expect(fonte.abertas().some((item) => item.id === venda.id)).toBe(true);
    expect(fonte.inativas().some((item) => item.id === venda.id)).toBe(false);

    sucesso(fonte.alterarStatus({ vendaId: venda.id, status: 'Prejuízo' }));
    expect(fonte.resumo()).toEqual(resumoSemVenda);
    expect(fonte.abertas().some((item) => item.id === venda.id)).toBe(false);
    expect(fonte.prejuizos().some((item) => item.id === venda.id)).toBe(true);
    expect(sucesso(fonte.consultarPeriodo('2027-01-15', '2027-01-15')).recebidosCentavos).toBe(
      recebimentosDoDia,
    );

    sucesso(fonte.alterarStatus({ vendaId: venda.id, status: 'Ativo' }));
    expect(fonte.resumo()).toEqual(resumoAtivo);
    expect(fonte.abertas().some((item) => item.id === venda.id)).toBe(true);
    expect(fonte.prejuizos().some((item) => item.id === venda.id)).toBe(false);
    expect(sucesso(fonte.consultarPeriodo('2027-01-15', '2027-01-15')).recebidosCentavos).toBe(
      recebimentosDoDia,
    );
  });

  it('preserva o estado e permite retry quando a publicação da mudança de status falha', () => {
    const fonte = iniciar();
    const venda = sucesso(fonte.cadastrarVenda(cadastro()));
    const antes = fonte.vendas();
    const snapshot = structuredClone(antes);
    const copiar = vi.spyOn(globalThis, 'structuredClone').mockImplementationOnce(() => {
      throw new Error('Falha simulada ao preparar publicação.');
    });

    expect(fonte.alterarStatus({ vendaId: venda.id, status: 'Inativo' }).tipo).toBe('falha');
    expect(fonte.vendas()).toBe(antes);
    expect(fonte.vendas()).toEqual(snapshot);
    copiar.mockRestore();

    expect(
      sucesso(fonte.alterarStatus({ vendaId: venda.id, status: 'Inativo' })).statusAdministrativo,
    ).toBe('Inativo');
    expect(sucesso(fonte.cadastrarVenda(cadastro())).id).toBe('sessao/venda/3');
  });

  it('publica pagamentos individuais, revalida repetição e reconcilia todas as projeções', () => {
    const fonte = iniciar();
    const base = fonte.resumo();
    const v = sucesso(fonte.cadastrarVenda(cadastro()));
    const c = {
      vendaId: v.id,
      parcelaId: v.parcelas[1].id,
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
    for (const parcelaId of [v.parcelas[0].id, v.parcelas[2].id]) {
      expect(
        fonte.registrarPagamento({
          vendaId: v.id,
          parcelaId,
          data: referencia,
          forma: 'Pix',
        }).tipo,
      ).toBe('inelegibilidade');
    }
    expect(fonte.vendas()).toBe(antesDeSelecionar);
    sucesso(fonte.registrarPagamento(c));
    const snapshot = fonte.vendas();
    const valorIndividual = v.parcelas[1].valorCentavos;
    expect(sucesso(fonte.consultarVenda(v.id))).toMatchObject({
      totalPagoCentavos: 20000 + valorIndividual,
      saldoCentavos: 100000 - 20000 - valorIndividual,
      quantidadePaga: 2,
    });
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(
      base.recebidoNoMesCentavos + 20000 + valorIndividual,
    );
    expect(fonte.registrarPagamento(c).tipo).toBe('inelegibilidade');
    expect(fonte.registrarPagamento({ ...c, vendaId: 'ausente' }).tipo).toBe('inexistencia');
    expect(fonte.vendas()).toBe(snapshot);
    sucesso(
      fonte.registrarPagamento({
        ...c,
        parcelaId: v.parcelas[2].id,
      }),
    );
    const final = sucesso(
      fonte.registrarPagamento({
        ...c,
        parcelaId: v.parcelas[3].id,
      }),
    );
    expect(final.recebimentos.at(-1)?.alocacoes).toHaveLength(1);
    expect(fonte.abertas().some((item) => item.id === v.id)).toBe(false);
    expect(fonte.quitadas().filter((item) => item.id === v.id)).toHaveLength(1);
    expect(sucesso(fonte.consultarVenda(v.id))).toMatchObject({
      saldoCentavos: 0,
      totalPagoCentavos: 100000,
    });
    expect(fonte.resumo().totalEmAbertoCentavos).toBe(base.totalEmAbertoCentavos);
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(base.recebidoNoMesCentavos + 100000);
    expect(sucesso(fonte.consultarPeriodo('2027-01-01', referencia)).recebidosCentavos).toBe(
      base.recebidoNoMesCentavos + 100000,
    );
  });

  it.each(['alocação', 'final'] as const)(
    'double TestBed com falha de %s preserva agregado e contador e permite nova tentativa',
    (etapa) => {
      const preparador = new PreparadorRecebimento();
      const fonte = iniciar(preparador);
      const v = sucesso(fonte.cadastrarVenda(cadastro()));
      const c = {
        vendaId: v.id,
        parcelaId: v.parcelas[1].id,
        data: referencia,
        forma: 'Pix',
      };
      const snapshot = structuredClone({
        vendas: fonte.vendas(),
        resumo: fonte.resumo(),
        abertas: fonte.abertas(),
        quitadas: fonte.quitadas(),
        inativas: fonte.inativas(),
        prejuizos: fonte.prejuizos(),
        referencia: fonte.referencia,
      });
      const anterior = fonte.vendas();
      if (etapa === 'alocação') {
        vi.spyOn(preparador, 'alocar').mockImplementationOnce(() => {
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
        inativas: fonte.inativas(),
        prejuizos: fonte.prejuizos(),
        referencia: fonte.referencia,
      }).toEqual(snapshot);
      vi.restoreAllMocks();
      const aceita = sucesso(fonte.registrarPagamento(c));
      expect(aceita.recebimentos).toHaveLength(2);
      expect(aceita.recebimentos[1].id).toBe('sessao/recebimento/2');
      expect(aceita.recebimentos[1].alocacoes).toHaveLength(1);
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
        parcelaId: v.parcelas[1].id,
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
