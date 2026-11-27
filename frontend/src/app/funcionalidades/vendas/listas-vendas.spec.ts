import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';
import { appConfig } from '../../app.config';
import { ControleConsultas } from '../../nucleo/dados/controle-consultas';
import { FONTE_VENDAS, FonteVendas } from '../../nucleo/dados/fonte-vendas';
import {
  ColecaoVendas,
  ColecaoVendasLeitura,
  VendaResumoLeitura,
} from '../../nucleo/dados/modelos-leitura';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';
import { formatarDataCivil } from './data-civil';
import { formatarDinheiro } from './dinheiro';
import { buscarVendas, FiltroSituacaoVenda } from './venda.busca';

const referenciaTeste = '2026-01-31';

function resumoTeste(colecao: ColecaoVendas, indice: number): VendaResumoLeitura {
  return {
    id: `${colecao}/venda/${indice}`,
    cliente: {
      nome: `Cliente ${colecao} ${String(indice).padStart(2, '0')}`,
      cpf: `90000000${String(indice).padStart(3, '0')}75`,
      telefone: `1190000${String(indice).padStart(4, '0')}`,
      descricao: null,
    },
    dataVenda: '2026-01-01',
    statusAdministrativo:
      colecao === 'inativas' ? 'Inativo' : colecao === 'prejuizos' ? 'Prejuízo' : 'Ativo',
    situacao: colecao === 'quitadas' ? 'Quitada' : 'Em aberto',
    valorTotalCentavos: 10000,
    acrescimosCentavos: 0,
    valorTotalEfetivoCentavos: 10000,
    totalRecebidoCentavos: colecao === 'quitadas' ? 10000 : 0,
    saldoCentavos: colecao === 'quitadas' ? 0 : 10000,
    quantidadePaga: colecao === 'quitadas' ? 1 : 0,
    quantidadeParcelas: 1,
    proximoVencimento: colecao === 'quitadas' ? null : '2026-02-01',
    revisao: '0',
    referencia: referenciaTeste,
  };
}

function criarFonteFake(quantidade: Readonly<Record<ColecaoVendas, number>>): FonteVendas {
  return {
    referencia: referenciaTeste,
    consultarColecao: vi.fn((colecao: ColecaoVendas) => {
      const envelope: ColecaoVendasLeitura = {
        colecao,
        referencia: referenciaTeste,
        revisao: '0',
        vendas: Array.from({ length: quantidade[colecao] }, (_, indice) =>
          resumoTeste(colecao, indice + 1),
        ),
      };
      return of(envelope);
    }),
    consultarVenda: vi.fn(),
  } as unknown as FonteVendas;
}

describe('Listas de vendas', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...(appConfig.providers ?? [])] }));

  it('exibe somente vendas abertas com projeções corretas e links identificáveis', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const vendas = servico.abertas();
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const linhas = [...pagina.querySelectorAll('tbody tr')];

    expect(pagina.querySelector('h2')?.textContent).toContain('Vendas cadastradas');
    expect(linhas).toHaveLength(vendas.length);
    expect(pagina.querySelector('caption')?.textContent).toContain('Vendas em aberto');
    expect(pagina.textContent).toContain(formatarDataCivil(servico.referencia));
    expect(vendas.every((venda) => venda.saldoCentavos > 0)).toBe(true);
    vendas.forEach((venda, indice) => {
      expect(linhas[indice].textContent).toContain(venda.cliente.nome);
      expect(linhas[indice].textContent).toContain(formatarDataCivil(venda.dataVenda));
      expect(linhas[indice].textContent).toContain(formatarDinheiro(venda.valorTotalCentavos));
      expect(linhas[indice].textContent).toContain(
        `${venda.quantidadePaga}/${venda.parcelas.length}`,
      );
      expect(linhas[indice].textContent).toContain(formatarDinheiro(venda.saldoCentavos));
      expect(linhas[indice].textContent).toContain(venda.situacao);
      const links = [...linhas[indice].querySelectorAll('a')];
      expect(links).toHaveLength(3);
      const esperado = TestBed.inject(Router).serializeUrl(
        TestBed.inject(Router).createUrlTree(['/vendas', venda.id]),
      );
      expect(links[0].getAttribute('href')).toBe(esperado);
      expect(links[1].getAttribute('href')).toBe(esperado);
      expect(links[0].getAttribute('aria-label')).toContain(venda.id);
      expect(links[1].getAttribute('aria-label')).toContain(venda.id);
      expect(links[1].textContent).toContain('Visualizar');
      expect(links[2].getAttribute('href')).toBe(
        TestBed.inject(Router).serializeUrl(
          TestBed.inject(Router).createUrlTree(['/vendas', venda.id, 'editar']),
        ),
      );
      expect(links[2].getAttribute('aria-label')).toContain(venda.id);
    });
  });

  it('consulta cada destino uma vez e pagina envelopes com 0, 1, 11 e 21 resumos sem detalhe', async () => {
    const fonte = criarFonteFake({ abertas: 0, quitadas: 1, inativas: 11, prejuizos: 21 });
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = () => harness.routeNativeElement!;

    await harness.fixture.whenStable();
    expect(pagina().textContent).toContain('Não há vendas em aberto.');
    expect(fonte.consultarColecao).toHaveBeenCalledWith('abertas');

    await harness.navigateByUrl('/vendas/quitadas');
    expect(pagina().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina().querySelector('nav[aria-label="Paginação de vendas"]')).toBeNull();

    await harness.navigateByUrl('/vendas/inativas');
    expect(pagina().querySelectorAll('tbody tr')).toHaveLength(10);
    pagina().querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    expect(pagina().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina().querySelector('[aria-label="Faixa de resultados"]')?.textContent).toContain(
      '11–11 de 11 vendas',
    );

    await harness.navigateByUrl('/vendas/prejuizo');
    expect(pagina().querySelectorAll('tbody tr')).toHaveLength(10);
    pagina().querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    expect(pagina().querySelectorAll('tbody tr')).toHaveLength(10);
    pagina().querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    expect(pagina().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina().querySelector('[aria-label="Faixa de resultados"]')?.textContent).toContain(
      '21–21 de 21 vendas',
    );

    expect(fonte.consultarColecao).toHaveBeenCalledTimes(4);
    expect(fonte.consultarVenda).not.toHaveBeenCalled();
  });

  it('mantém erro separado de vazio, sem fallback, e só repete consulta por ação explícita', async () => {
    const fonte = criarFonteFake({ abertas: 0, quitadas: 0, inativas: 0, prejuizos: 0 });
    let chamadas = 0;
    vi.mocked(fonte.consultarColecao).mockImplementation((colecao) => {
      chamadas++;
      if (chamadas === 1) return throwError(() => new Error('transporte indisponível'));
      return of({
        colecao,
        referencia: referenciaTeste,
        revisao: '0',
        vendas: [],
      });
    });
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const consultarDemo = vi.fn();
    TestBed.overrideProvider(ServicoDemonstracao, {
      useValue: { abertas: consultarDemo } as unknown as ServicoDemonstracao,
    });
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;

    await harness.fixture.whenStable();
    expect(pagina.querySelector('[role="alert"]')?.textContent).toContain(
      'Não foi possível carregar vendas em aberto.',
    );
    expect(pagina.textContent).not.toContain('Não há vendas em aberto.');
    expect(consultarDemo).not.toHaveBeenCalled();
    expect(fonte.consultarColecao).toHaveBeenCalledTimes(1);

    pagina.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await harness.fixture.whenStable();
    expect(pagina.textContent).toContain('Não há vendas em aberto.');
    expect(fonte.consultarColecao).toHaveBeenCalledTimes(2);
    expect(consultarDemo).not.toHaveBeenCalled();
  });

  it('expõe carregamento e só apresenta vazio depois da resposta bem-sucedida', async () => {
    const fonte = criarFonteFake({ abertas: 0, quitadas: 0, inativas: 0, prejuizos: 0 });
    const resposta = new Subject<ColecaoVendasLeitura>();
    vi.mocked(fonte.consultarColecao).mockReturnValue(resposta);
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;

    expect(pagina.querySelector('[aria-busy="true"]')?.textContent).toContain(
      'Carregando vendas em aberto',
    );
    expect(pagina.textContent).not.toContain('Não há vendas em aberto.');

    resposta.next({
      colecao: 'abertas',
      referencia: referenciaTeste,
      revisao: '0',
      vendas: [],
    });
    harness.fixture.detectChanges();

    expect(pagina.textContent).toContain('Não há vendas em aberto.');
    expect(pagina.querySelector('[aria-busy="true"]')).toBeNull();
  });

  it('mantém controles de pesquisa consistentes e não adiciona filtros às outras coleções', async () => {
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = () => harness.routeNativeElement!;
    const controles = () => {
      const entrada = pagina().querySelector<HTMLInputElement>(
        '#busca-vendas, #busca-vendas-quitadas, #busca-vendas-administrativas',
      )!;
      const limpar = [...pagina().querySelectorAll('button')].find((botao) =>
        botao.textContent?.includes('Limpar pesquisa'),
      )!;
      const secao = entrada.closest('section')!;
      return { entrada, limpar, secao };
    };
    const base = controles();

    expect(pagina().querySelector('#situacao-vendas')).not.toBeNull();
    for (const rota of ['/vendas/quitadas', '/vendas/inativas', '/vendas/prejuizo']) {
      await harness.navigateByUrl(rota);
      const atual = controles();

      expect(atual.secao.className).toBe(base.secao.className);
      expect(atual.entrada.className).toBe(base.entrada.className);
      expect(atual.limpar.className).toBe(base.limpar.className);
      expect(pagina().querySelector('#situacao-vendas')).toBeNull();
      expect(pagina().querySelector('#ordenacao-vendas')).toBeNull();
    }
  });

  it('pagina resultados filtrados e limita a página após comando interno reduzir a coleção', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const criadas = [];
    for (let indice = 0; servico.abertas().length < 21; indice++) {
      const resultado = servico.cadastrarVenda({
        cliente: {
          nome: `Cliente de paginação ${indice}`,
          cpf: '90000000175',
          telefone: '00900000001',
        },
        dataVenda: servico.referencia,
        valorTotalCentavos: 60000,
        quantidadeParcelas: 1,
        entrada: null,
      });
      if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
      criadas.push(resultado.valor);
    }
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const tabela = () => pagina.querySelectorAll('tbody tr');
    const faixas = () => pagina.querySelector('[aria-label="Faixa de resultados"]')!.textContent;

    expect(tabela()).toHaveLength(10);
    expect(faixas()).toContain(`1–10 de ${servico.abertas().length} vendas`);
    const primeira = [...pagina.querySelectorAll('tbody th')].map((celula) => celula.textContent);
    pagina.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    expect(tabela()).toHaveLength(10);
    expect(faixas()).toContain('11–20 de 21 vendas');
    const segunda = [...pagina.querySelectorAll('tbody th')].map((celula) => celula.textContent);
    pagina.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    expect(tabela()).toHaveLength(1);
    expect(faixas()).toContain('21–21 de 21 vendas');
    const terceira = [...pagina.querySelectorAll('tbody th')].map((celula) => celula.textContent);
    expect(new Set([...primeira, ...segunda, ...terceira]).size).toBe(21);

    const busca = pagina.querySelector<HTMLInputElement>('#busca-vendas')!;
    busca.value = criadas[0].cliente.nome;
    busca.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(faixas()).toContain('1–1 de 1 vendas');
    busca.value = '';
    busca.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    pagina.querySelector<HTMLButtonElement>('[aria-label="Página 3"]')!.click();
    await harness.fixture.whenStable();
    [...pagina.querySelectorAll('button')]
      .find((botao) => botao.textContent?.includes('Limpar pesquisa'))!
      .click();
    await harness.fixture.whenStable();
    expect(faixas()).toContain('1–10 de 21 vendas');

    pagina.querySelector<HTMLButtonElement>('[aria-label="Página 3"]')!.click();
    await harness.fixture.whenStable();
    const situacao = pagina.querySelector<HTMLSelectElement>('#situacao-vendas')!;
    situacao.value = 'Atrasada';
    situacao.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
    situacao.value = 'Todas';
    situacao.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(faixas()).toContain('1–10 de 21 vendas');

    pagina.querySelector<HTMLButtonElement>('[aria-label="Página 3"]')!.click();
    await harness.fixture.whenStable();
    const parcela = criadas[0].parcelas[0];
    expect(
      servico.registrarPagamento({
        vendaId: criadas[0].id,
        parcelaId: parcela.id,
        data: servico.referencia,
        forma: 'Pix',
      }).tipo,
    ).toBe('sucesso');
    TestBed.inject(ControleConsultas).invalidarTodas();
    await harness.fixture.whenStable();
    expect(pagina.querySelector('[aria-current="page"]')?.textContent).toContain('2');
    expect(faixas()).toContain('11–20 de 20 vendas');
    expect(tabela()).toHaveLength(10);
  });

  it('ordena após busca e situação, reseta página e pagina a coleção ordenada sem duplicatas', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const criadas = [];
    for (let indice = 0; indice < 21; indice++) {
      const resultado = servico.cadastrarVenda({
        cliente: {
          nome: `Cliente ordenar ${String(21 - indice).padStart(2, '0')}`,
          cpf: '90000000175',
          telefone: '00900000001',
        },
        dataVenda: servico.referencia,
        valorTotalCentavos: 10000,
        quantidadeParcelas: 1,
        entrada: null,
      });
      if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
      criadas.push(resultado.valor);
    }

    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const linhas = () =>
      [...pagina.querySelectorAll('tbody th')].map((item) => item.textContent!.trim());
    const busca = pagina.querySelector<HTMLInputElement>('#busca-vendas')!;
    busca.value = 'Cliente ordenar';
    busca.dispatchEvent(new Event('input', { bubbles: true }));
    const situacao = pagina.querySelector<HTMLSelectElement>('#situacao-vendas')!;
    situacao.value = 'Em aberto';
    situacao.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();

    const ordenacao = pagina.querySelector<HTMLSelectElement>('#ordenacao-vendas')!;
    ordenacao.value = 'cliente';
    ordenacao.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(ordenacao.value).toBe('cliente');
    expect(situacao.value).toBe('Em aberto');
    expect(pagina.querySelector('[role="status"]')?.textContent).toContain('21 vendas encontradas');
    expect(linhas()).toHaveLength(10);
    expect(linhas()[0]).toContain('Cliente ordenar 01');
    expect(pagina.querySelector('[aria-label="Faixa de resultados"]')?.textContent).toContain(
      '1–10 de 21 vendas',
    );

    pagina.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    expect(pagina.querySelector('[aria-current="page"]')?.textContent).toContain('2');
    ordenacao.value = 'data-venda';
    ordenacao.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelector('[aria-current="page"]')?.textContent).toContain('1');
    expect(linhas()[0]).toContain('Cliente ordenar 21');
    expect(busca.value).toBe('Cliente ordenar');
    expect(situacao.value).toBe('Em aberto');

    ordenacao.value = 'vencimento';
    ordenacao.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelector('[aria-current="page"]')?.textContent).toContain('1');
    const percurso = [...linhas()];
    pagina.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    percurso.push(...linhas());
    pagina.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    expect(linhas()).toHaveLength(1);
    percurso.push(...linhas());
    expect(new Set(percurso).size).toBe(21);
    expect(percurso).toHaveLength(21);

    pagina.querySelector<HTMLButtonElement>('[aria-label="Próxima página"]')!.click();
    await harness.fixture.whenStable();
    expect(pagina.querySelector('[aria-current="page"]')?.textContent).toContain('3');
    for (const venda of criadas.slice(0, 11)) {
      expect(
        servico.registrarPagamento({
          vendaId: venda.id,
          parcelaId: venda.parcelas[0].id,
          data: servico.referencia,
          forma: 'Pix',
        }).tipo,
      ).toBe('sucesso');
    }
    TestBed.inject(ControleConsultas).invalidarTodas();
    await harness.fixture.whenStable();
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(pagina.querySelector('[aria-current="page"]')).toBeNull();
    expect(pagina.querySelector('[aria-label="Faixa de resultados"]')?.textContent).toContain(
      '1–10 de 10 vendas',
    );
    expect(pagina.querySelector('nav[aria-label="Paginação de vendas"]')).toBeNull();
  });

  it('não exibe cartões globais e preserva os derivados internos', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const resumoInicial = servico.resumo();
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;

    expect(pagina.querySelector('[aria-label="Resumo global de vendas"]')).toBeNull();
    expect(pagina.textContent).not.toContain('Total em aberto');
    expect(pagina.textContent).not.toContain('Valores em atraso');
    expect(pagina.textContent).not.toContain('Recebido no mês');
    expect(pagina.querySelector('h2')?.textContent).toContain('Vendas cadastradas');
    expect(servico.resumo()).toEqual(resumoInicial);

    const campo = pagina.querySelector<HTMLInputElement>('#busca-vendas')!;
    campo.value = servico.abertas()[0].cliente.nome;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    const situacao = pagina.querySelector<HTMLSelectElement>('#situacao-vendas')!;
    situacao.value = servico.abertas()[0].situacao;
    situacao.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelector('[aria-label="Resumo global de vendas"]')).toBeNull();
    expect(servico.resumo()).toEqual(resumoInicial);

    await harness.navigateByUrl('/vendas/quitadas');
    expect(
      harness.routeNativeElement?.querySelector('[aria-label="Resumo global de vendas"]'),
    ).toBeNull();
    expect(servico.resumo()).toEqual(resumoInicial);
  });

  it('exibe somente quitadas, com saldo zero e sem próximo vencimento inventado', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const vendas = servico.quitadas();
    const harness = await RouterTestingHarness.create('/vendas/quitadas');
    const pagina = harness.routeNativeElement!;
    const linhas = [...pagina.querySelectorAll('tbody tr')];

    expect(linhas).toHaveLength(vendas.length);
    expect(pagina.querySelector('caption')?.textContent).toContain('Vendas quitadas');
    expect(pagina.querySelector('h2')?.textContent).toContain('Vendas quitadas');
    expect(vendas.length).toBeGreaterThan(0);
    expect(vendas.every((venda) => venda.saldoCentavos === 0)).toBe(true);
    vendas.forEach((venda, indice) => {
      expect(venda.situacao).toBe('Quitada');
      expect(venda.proximoVencimento).toBeNull();
      expect(venda.quantidadePaga).toBe(venda.parcelas.length);
      expect(linhas[indice].textContent).toContain(venda.cliente.nome);
      expect(linhas[indice].textContent).toContain('Quitada');
      expect(linhas[indice].textContent).toContain('Não há parcelas pendentes');
      expect(linhas[indice].querySelectorAll('a')).toHaveLength(3);
    });
  });

  it('pesquisa por eventos nativos e combina todas as situações com o termo por E', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const campo = pagina.querySelector<HTMLInputElement>('#busca-vendas')!;
    const situacao = pagina.querySelector<HTMLSelectElement>('#situacao-vendas')!;

    campo.value = 'Pedro Farias';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina.querySelector('tbody')?.textContent).toContain('Pedro Farias');

    campo.value = servico.abertas().find((v) => v.id === 'seed/venda/2')!.cliente.cpf;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelector('tbody')?.textContent).toContain('Lucas Santos');

    const dataVisivel =
      pagina.querySelector('tbody tr td')?.textContent?.trim() ??
      formatarDataCivil(servico.abertas()[0].dataVenda);
    campo.value = dataVisivel;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(
      [...pagina.querySelectorAll('tbody tr')].every((linha) =>
        linha.textContent?.includes(dataVisivel),
      ),
    ).toBe(true);

    campo.value = '';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    campo.focus();
    for (const estado of ['Em aberto', 'Próximos dias', 'Atrasada'] as const) {
      const alvo = servico.abertas().find((venda) => venda.situacao === estado)!;
      campo.focus();
      campo.value = alvo.cliente.nome;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      await harness.fixture.whenStable();
      expect(document.activeElement).toBe(campo);
      situacao.value = estado;
      situacao.focus();
      situacao.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
      expect(document.activeElement).toBe(situacao);
      expect([...pagina.querySelectorAll('tbody tr')].length).toBeGreaterThan(0);
      expect(
        [...pagina.querySelectorAll('tbody tr')].every((linha) =>
          linha.textContent?.includes(estado),
        ),
      ).toBe(true);
      campo.value = '';
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      situacao.value = 'Todas';
      situacao.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
    }
    for (const valor of ['Todas', 'Em aberto', 'Próximos dias', 'Atrasada']) {
      situacao.value = valor;
      situacao.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
      const vendasEsperadas =
        valor === 'Todas'
          ? servico.abertas()
          : servico.abertas().filter((venda) => venda.situacao === valor);
      expect(pagina.querySelectorAll('tbody tr')).toHaveLength(vendasEsperadas.length);
      expect(pagina.querySelector('[role="status"]')?.textContent).toContain(
        String(vendasEsperadas.length),
      );
    }

    campo.value = 'termo-sem-correspondencia';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelector('tbody')).toBeNull();
    expect(pagina.querySelector('h2')?.textContent).toContain('Vendas cadastradas');
    expect(pagina.textContent).toContain('Nenhuma venda corresponde');
  });

  it('limpa a pesquisa sem alterar situação e permite restaurar Todas', async () => {
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const campo = pagina.querySelector<HTMLInputElement>('#busca-vendas')!;
    const situacao = pagina.querySelector<HTMLSelectElement>('#situacao-vendas')!;
    const limparPesquisa = [...pagina.querySelectorAll('button')].find((botao) =>
      botao.textContent?.includes('Limpar pesquisa'),
    )!;
    expect(
      [...pagina.querySelectorAll('button')].some((botao) =>
        botao.textContent?.includes('Limpar critérios'),
      ),
    ).toBe(false);

    campo.value = 'Pedro Farias';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    situacao.value = 'Atrasada';
    situacao.dispatchEvent(new Event('change', { bubbles: true }));
    await harness.fixture.whenStable();
    limparPesquisa.click();
    await harness.fixture.whenStable();
    expect(campo.value).toBe('');
    expect(situacao.value).toBe('Atrasada');
    expect(document.activeElement).toBe(campo);

    campo.value = 'outro termo';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    situacao.value = 'Todas';
    situacao.dispatchEvent(new Event('change', { bubbles: true }));
    campo.value = '';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(campo.value).toBe('');
    expect(situacao.value).toBe('Todas');
  });

  it('Quitadas oferece busca local, sem filtro de situação, e não inclui vendas abertas', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const harness = await RouterTestingHarness.create('/vendas/quitadas');
    const pagina = harness.routeNativeElement!;
    const campo = pagina.querySelector<HTMLInputElement>('#busca-vendas-quitadas')!;
    const abertaExclusiva = servico
      .abertas()
      .find((aberta) =>
        servico.quitadas().every((quitada) => !quitada.cliente.cpf.includes(aberta.cliente.cpf)),
      )!;

    expect(pagina.querySelector('select')).toBeNull();
    campo.value = abertaExclusiva.cliente.cpf;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.textContent).toContain('Nenhuma venda corresponde à pesquisa');
    expect(pagina.querySelector('tbody')).toBeNull();
    expect(servico.abertas()).toContain(abertaExclusiva);

    campo.value = servico.quitadas()[0].cliente.cpf;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina.querySelector('tbody')?.textContent).toContain(
      servico.quitadas()[0].cliente.nome,
    );
  });

  it('aplica busca numérica por substring de CPF sem remover pontuação da identificação armazenada', async () => {
    const fonte = criarFonteFake({ abertas: 1, quitadas: 0, inativas: 0, prejuizos: 0 });
    vi.mocked(fonte.consultarColecao).mockImplementation((colecao) =>
      of({
        colecao,
        referencia: referenciaTeste,
        revisao: '0',
        vendas: [
          {
            ...resumoTeste('abertas', 1),
            cliente: {
              nome: 'Cliente de teste numérico',
              cpf: '900.000.001-75',
              telefone: '(11) 91234-5678',
              descricao: null,
            },
          },
        ],
      }),
    );
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });

    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const campo = pagina.querySelector<HTMLInputElement>('#busca-vendas')!;
    campo.value = '00000175';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina.querySelector('tbody')?.textContent).toContain('Cliente de teste numérico');
  });

  it('exibe coleções vazias e resumos zero sem dados ilustrativos fixos', async () => {
    TestBed.overrideProvider(FONTE_VENDAS, {
      useValue: criarFonteFake({ abertas: 0, quitadas: 0, inativas: 0, prejuizos: 0 }),
    });

    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    expect(pagina.querySelector('h2')?.textContent).toContain('Vendas cadastradas');
    expect(pagina.textContent).toContain('Não há vendas em aberto.');
    expect(pagina.textContent).not.toContain('Nenhuma venda corresponde');
    expect(pagina.querySelector('[aria-label="Resumo global de vendas"]')).toBeNull();
    expect(pagina.textContent).not.toContain('Total em aberto');

    await harness.navigateByUrl('/vendas/quitadas');
    expect(harness.routeNativeElement?.textContent).toContain('Não há vendas quitadas.');
  });
});
