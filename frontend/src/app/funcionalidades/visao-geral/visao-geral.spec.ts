import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { ControleConsultas } from '../../nucleo/dados/controle-consultas';
import { FONTE_VENDAS, FonteVendas } from '../../nucleo/dados/fonte-vendas';
import {
  ParcelaVisaoGeralLeitura,
  VisaoGeralLeitura,
  VendaResumoLeitura,
} from '../../nucleo/dados/modelos-leitura';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';

const referencia = '2027-03-31';

function resumo(id: string, nome: string, indice = 0): VendaResumoLeitura {
  return {
    id,
    cliente: {
      nome,
      cpf: '90000000175',
      telefone: '11900000001',
      descricao: null,
    },
    dataVenda: `2027-03-${String(indice + 1).padStart(2, '0')}`,
    statusAdministrativo: (['Ativo', 'Inativo', 'Prejuízo'] as const)[indice % 3],
    situacao: (['Em aberto', 'Quitada', 'Atrasada', 'Próximos dias'] as const)[indice % 4],
    valorTotalCentavos: 100000 + indice,
    acrescimosCentavos: 500,
    valorTotalEfetivoCentavos: 100500 + indice,
    totalRecebidoCentavos: 25000,
    saldoCentavos: 75500 + indice,
    quantidadePaga: 1,
    quantidadeParcelas: 4,
    proximoVencimento: '2027-04-01',
    revisao: '9007199254740993',
    referencia,
  };
}

function parcela(
  id: string,
  venda: VendaResumoLeitura,
  numero: number,
  vencimento: string,
): ParcelaVisaoGeralLeitura {
  return {
    venda,
    parcela: {
      id,
      numero,
      valorBaseCentavos: 12500,
      acrescimoCentavos: 300,
      valorEfetivoCentavos: 12800,
      valorRecebidoCentavos: 0,
      saldoCentavos: 12800,
      vencimento,
      situacao: 'Próximos dias',
      dataPagamento: null,
      formaPagamento: null,
    },
  };
}

function painelLiteral(): VisaoGeralLeitura {
  return {
    referencia,
    revisao: '9007199254740993',
    indicadores: {
      totalEmAbertoCentavos: 123456,
      valoresEmAtrasoCentavos: 45678,
      recebidoNoMesCentavos: 345678,
      vendasCadastradas: 12,
    },
    vendasRecentes: Array.from({ length: 5 }, (_, indice) =>
      resumo(`unidade/externa/recente-${indice}`, `Venda recente ${indice + 1}`, indice),
    ),
    parcelasProximas: Array.from({ length: 5 }, (_, indice) => {
      const venda = resumo(`unidade/externa/proxima-${indice}`, `Próxima ${indice + 1}`, indice);
      return parcela(`parcela-proxima-${indice}`, venda, indice + 1, '2027-04-01');
    }),
    parcelasAtrasadas: Array.from({ length: 5 }, (_, indice) => {
      const venda = resumo(`unidade/externa/atrasada-${indice}`, `Atrasada ${indice + 1}`, indice);
      return {
        ...parcela(`parcela-atrasada-${indice}`, venda, indice + 1, '2027-03-30'),
        parcela: {
          ...parcela(`parcela-atrasada-${indice}`, venda, indice + 1, '2027-03-30').parcela,
          situacao: 'Atrasado',
        },
      };
    }),
  };
}

function criarFonte(consultarVisaoGeral: FonteVendas['consultarVisaoGeral']): FonteVendas {
  return {
    referencia,
    consultarColecao: vi.fn(),
    consultarVenda: vi.fn(),
    consultarVisaoGeral: vi.fn(consultarVisaoGeral),
    consultarRelatorioMensal: vi.fn(),
    cadastrarVenda: vi.fn(),
    editarCliente: vi.fn(),
    alterarStatus: vi.fn(),
    registrarPagamento: vi.fn(),
    corrigirPagamento: vi.fn(),
  } as unknown as FonteVendas;
}

function texto(elemento: Element): string {
  return (elemento.textContent ?? '').replaceAll('\u00a0', ' ');
}

describe('Visão Geral integrada à fonte', () => {
  let fonte: FonteVendas;

  beforeEach(() => {
    fonte = criarFonte(() => of(painelLiteral()));
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: FONTE_VENDAS, useFactory: () => fonte },
        {
          provide: ServicoDemonstracao,
          useFactory: vi.fn(() => {
            throw new Error('A Visão Geral não deve injetar o serviço demonstrativo.');
          }),
        },
      ],
    });
  });

  it('renderiza os quatro indicadores e os limites/links dos três resumos da resposta literal', async () => {
    const harness = await RouterTestingHarness.create('/visao-geral');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const conteudo = texto(pagina);

    expect(fonte.consultarVisaoGeral).toHaveBeenCalledTimes(1);
    expect(fonte.consultarColecao).not.toHaveBeenCalled();
    expect(fonte.consultarVenda).not.toHaveBeenCalled();
    expect(conteudo).toContain('Referência da sessão: 31/03/2027');
    expect(conteudo).toContain('01/03/2027 a 31/03/2027');
    expect(
      pagina.querySelectorAll('[aria-label="Indicadores financeiros globais"] article'),
    ).toHaveLength(4);
    expect(conteudo).toContain('R$ 1.234,56');
    expect(conteudo).toContain('R$ 456,78');
    expect(conteudo).toContain('R$ 3.456,78');
    expect(conteudo).toContain('12');

    const secoes = [
      { seletor: '#vendas-recentes', prefixo: 'unidade/externa/recente-', total: 5 },
      { seletor: '#parcelas-proximas', prefixo: 'unidade/externa/proxima-', total: 5 },
      { seletor: '#parcelas-atrasadas', prefixo: 'unidade/externa/atrasada-', total: 5 },
    ];
    for (const secao of secoes) {
      const elemento = pagina.querySelector<HTMLElement>(secao.seletor)!.parentElement!;
      const links = [...elemento.querySelectorAll<HTMLAnchorElement>('a')];
      expect(links).toHaveLength(secao.total);
      for (const [indice, link] of links.entries()) {
        const esperado = TestBed.inject(Router).serializeUrl(
          TestBed.inject(Router).createUrlTree(['/vendas', `${secao.prefixo}${indice}`]),
        );
        expect(link.getAttribute('href')).toBe(esperado);
      }
    }
    expect(conteudo).toContain('R$ 125,00');
  });

  it('anuncia carregamento sem apresentar indicadores ou listas vazias antes da resposta', async () => {
    const resposta = new Subject<VisaoGeralLeitura>();
    fonte = criarFonte(() => resposta);
    const harness = await RouterTestingHarness.create('/visao-geral');
    const pagina = harness.routeNativeElement!;

    expect(pagina.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando Visão Geral',
    );
    expect(pagina.querySelector('[aria-label="Indicadores financeiros globais"]')).toBeNull();
    expect(pagina.textContent).not.toContain('Nenhuma venda cadastrada nesta sessão.');
    expect(fonte.consultarVisaoGeral).toHaveBeenCalledTimes(1);

    resposta.next(painelLiteral());
    await harness.fixture.whenStable();
    expect(
      pagina.querySelector('[aria-label="Indicadores financeiros globais"] article'),
    ).not.toBeNull();
  });

  it('mostra vazio independente por resumo sem ocultar os demais blocos', async () => {
    const painel = painelLiteral();
    const proxima = painel.parcelasProximas[0];
    fonte = criarFonte(() =>
      of({
        ...painel,
        vendasRecentes: [],
        parcelasProximas: [proxima],
        parcelasAtrasadas: [],
      }),
    );
    const harness = await RouterTestingHarness.create('/visao-geral');
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;

    const recentes = pagina.querySelector<HTMLElement>('#vendas-recentes')!.parentElement!;
    const proximas = pagina.querySelector<HTMLElement>('#parcelas-proximas')!.parentElement!;
    const atrasadas = pagina.querySelector<HTMLElement>('#parcelas-atrasadas')!.parentElement!;
    expect(texto(recentes)).toContain('Nenhuma venda cadastrada nesta sessão.');
    expect(recentes.querySelectorAll('a')).toHaveLength(0);
    expect(texto(proximas)).toContain('Próxima 1');
    expect(proximas.querySelectorAll('a')).toHaveLength(1);
    expect(texto(atrasadas)).toContain('Nenhuma parcela pendente está atrasada.');
    expect(atrasadas.querySelectorAll('a')).toHaveLength(0);
  });

  it('separa falha de vazio e só consulta novamente por ação explícita', async () => {
    let tentativas = 0;
    fonte = criarFonte(() =>
      tentativas++ === 0 ? throwError(() => new Error('API indisponível')) : of(painelLiteral()),
    );
    const harness = await RouterTestingHarness.create('/visao-geral');
    const pagina = harness.routeNativeElement!;

    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain('Verifique a conexão');
    expect(pagina.textContent).not.toContain('Nenhuma venda cadastrada nesta sessão.');
    expect(pagina.querySelector('[aria-label="Indicadores financeiros globais"]')).toBeNull();
    expect(fonte.consultarVisaoGeral).toHaveBeenCalledTimes(1);
    expect(fonte.consultarColecao).not.toHaveBeenCalled();
    expect(fonte.consultarVenda).not.toHaveBeenCalled();

    pagina.querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();
    expect(fonte.consultarVisaoGeral).toHaveBeenCalledTimes(2);
    expect(pagina.querySelector('[role="alert"]')).toBeNull();
    expect(
      pagina.querySelectorAll('[aria-label="Indicadores financeiros globais"] article'),
    ).toHaveLength(4);
  });

  it('descarta leitura pendente quando a geração é invalidada e mantém a referência da sessão', async () => {
    const respostas: Subject<VisaoGeralLeitura>[] = [];
    fonte = criarFonte(() => {
      const resposta = new Subject<VisaoGeralLeitura>();
      respostas.push(resposta);
      return resposta;
    });
    const harness = await RouterTestingHarness.create('/visao-geral');
    TestBed.inject(ControleConsultas).invalidarTodas();
    await harness.fixture.whenStable();

    expect(fonte.referencia).toBe(referencia);
    expect(fonte.consultarVisaoGeral).toHaveBeenCalledTimes(2);
    respostas[0].next({
      ...painelLiteral(),
      indicadores: { ...painelLiteral().indicadores, recebidoNoMesCentavos: 1 },
    });
    harness.fixture.detectChanges();
    expect(texto(harness.routeNativeElement!)).not.toContain('R$ 0,01');
    respostas[1].next(painelLiteral());
    await harness.fixture.whenStable();
    expect(texto(harness.routeNativeElement!)).toContain('R$ 3.456,78');
    expect(fonte.referencia).toBe(referencia);
  });
});
