import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { signal } from '@angular/core';
import { routes } from '../../app.routes';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';
import { formatarDataCivil } from './data-civil';
import { formatarDinheiro } from './dinheiro';
import { buscarVendas, FiltroSituacaoVenda } from './venda.busca';

describe('Listas de vendas', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('exibe somente vendas abertas com projeções corretas e links identificáveis', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const vendas = servico.abertas();
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const linhas = [...pagina.querySelectorAll('tbody tr')];

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
      expect(links).toHaveLength(2);
      const esperado = TestBed.inject(Router).serializeUrl(
        TestBed.inject(Router).createUrlTree(['/vendas', venda.id]),
      );
      expect(links[0].getAttribute('href')).toBe(esperado);
      expect(links[1].getAttribute('href')).toBe(esperado);
      expect(links[0].getAttribute('aria-label')).toContain(venda.id);
      expect(links[1].getAttribute('aria-label')).toContain(venda.id);
      expect(links[1].textContent).toContain('Visualizar');
    });
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
    [...pagina.querySelectorAll('button')]
      .find((botao) => botao.textContent?.includes('Limpar critérios'))!
      .click();
    await harness.fixture.whenStable();
    expect(faixas()).toContain('1–10 de 21 vendas');

    pagina.querySelector<HTMLButtonElement>('[aria-label="Página 3"]')!.click();
    await harness.fixture.whenStable();
    const parcela = criadas[0].parcelas[0];
    expect(
      servico.registrarPagamento({
        vendaId: criadas[0].id,
        parcelaIds: [parcela.id],
        valorCentavos: parcela.valorCentavos,
        data: servico.referencia,
        forma: 'Pix',
      }).tipo,
    ).toBe('sucesso');
    await harness.fixture.whenStable();
    expect(pagina.querySelector('[aria-current="page"]')?.textContent).toContain('2');
    expect(faixas()).toContain('11–20 de 20 vendas');
    expect(tabela()).toHaveLength(10);
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
    expect(pagina.textContent).not.toContain('Vendas cadastradas');
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
    expect(pagina.textContent).toContain(formatarDataCivil(servico.referencia));
    expect(vendas.length).toBeGreaterThan(0);
    expect(vendas.every((venda) => venda.saldoCentavos === 0)).toBe(true);
    vendas.forEach((venda, indice) => {
      expect(venda.situacao).toBe('Quitada');
      expect(venda.proximoVencimento).toBeNull();
      expect(venda.quantidadePaga).toBe(venda.parcelas.length);
      expect(linhas[indice].textContent).toContain(venda.cliente.nome);
      expect(linhas[indice].textContent).toContain('Quitada');
      expect(linhas[indice].textContent).toContain('Não há parcelas pendentes');
      expect(linhas[indice].querySelectorAll('a')).toHaveLength(2);
    });
  });

  it('pesquisa por eventos nativos e combina todas as situações com o termo por E', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const campo = pagina.querySelector<HTMLInputElement>('#busca-vendas')!;
    const situacao = pagina.querySelector<HTMLSelectElement>('#situacao-vendas')!;

    campo.value = 'Cliente DEMO Aurora 1';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina.querySelector('tbody')?.textContent).toContain('Cliente DEMO Aurora 1');

    campo.value = servico.abertas().find((v) => v.id === 'seed/venda/2')!.cliente.cpf;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina.querySelector('tbody')?.textContent).toContain('Cliente DEMO Aurora 2');

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
    expect(pagina.textContent).toContain('Nenhuma venda corresponde');
  });

  it('limpa só a pesquisa ou restaura todos os critérios e devolve foco ao campo', async () => {
    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    const campo = pagina.querySelector<HTMLInputElement>('#busca-vendas')!;
    const situacao = pagina.querySelector<HTMLSelectElement>('#situacao-vendas')!;
    const limparPesquisa = [...pagina.querySelectorAll('button')].find((botao) =>
      botao.textContent?.includes('Limpar pesquisa'),
    )!;
    const limparCriterios = [...pagina.querySelectorAll('button')].find((botao) =>
      botao.textContent?.includes('Limpar critérios'),
    )!;

    campo.value = 'Cliente DEMO';
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
    limparCriterios.click();
    await harness.fixture.whenStable();
    expect(campo.value).toBe('');
    expect(situacao.value).toBe('Todas');
    expect(document.activeElement).toBe(campo);
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
    const preparador = await import('./venda.validacoes');
    const calculos = await import('./venda.calculos');
    const preparado = preparador.prepararCadastro(
      {
        cliente: {
          nome: 'Cliente de teste numérico',
          cpf: '900.000.001-75',
          telefone: '(11) 91234-5678',
        },
        dataVenda: '2026-01-01',
        valorTotalCentavos: 10000,
        quantidadeParcelas: 1,
        entrada: null,
      },
      '2026-01-01',
      'teste/venda/numerica',
    );
    if (preparado.tipo !== 'sucesso') throw new Error(preparado.mensagem);
    const venda = calculos.projetarVenda(
      { ...preparado.valor, cliente: { ...preparado.valor.cliente, cpf: '900.000.001-75' } },
      '2026-01-01',
    );
    TestBed.overrideProvider(ServicoDemonstracao, {
      useValue: {
        referencia: '2026-01-01',
        abertas: signal([venda]),
        quitadas: signal([]),
        resumo: signal({
          totalEmAbertoCentavos: venda.saldoCentavos,
          valoresEmAtrasoCentavos: 0,
          recebidoNoMesCentavos: 0,
          vendasCadastradas: 1,
        }),
      } as unknown as ServicoDemonstracao,
    });

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
    TestBed.overrideProvider(ServicoDemonstracao, {
      useValue: {
        referencia: '2026-01-01',
        abertas: signal([]),
        quitadas: signal([]),
        resumo: signal({
          totalEmAbertoCentavos: 0,
          valoresEmAtrasoCentavos: 0,
          recebidoNoMesCentavos: 0,
          vendasCadastradas: 0,
        }),
      } as unknown as ServicoDemonstracao,
    });

    const harness = await RouterTestingHarness.create('/vendas');
    const pagina = harness.routeNativeElement!;
    expect(pagina.textContent).toContain('Não há vendas em aberto.');
    expect(pagina.textContent).not.toContain('Nenhuma venda corresponde');
    expect(pagina.querySelector('[aria-label="Resumo global de vendas"]')).toBeNull();
    expect(pagina.textContent).not.toContain('Total em aberto');
    expect(pagina.textContent).not.toContain('Vendas cadastradas');

    await harness.navigateByUrl('/vendas/quitadas');
    expect(harness.routeNativeElement?.textContent).toContain('Não há vendas quitadas.');
  });
});
