import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { projetarVenda } from '../venda.calculos';
import { prepararCadastro } from '../venda.validacoes';
import { formatarDataCivil } from '../data-civil';
import { formatarDinheiro } from '../dinheiro';

describe('DetalhesVenda', () => {
  const showOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = true;
      }),
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event('close'));
      }),
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    if (showOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showOriginal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (closeOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeOriginal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  function urlPara(id: string): string {
    const router = TestBed.inject(Router);
    return router.serializeUrl(router.createUrlTree(['/vendas', id]));
  }

  it('consulta a venda pelo ID opaco completo e apresenta seus dados e parcelas', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const venda = servico.vendas().find((item) => item.id === 'seed/venda/1')!;
    const url = urlPara(venda.id);
    expect(url).toContain('%2F');

    const harness = await RouterTestingHarness.create(url);
    const pagina = harness.routeNativeElement!;
    expect(pagina.textContent).toContain(venda.cliente.nome);
    expect(pagina.textContent).toContain(venda.cliente.cpf);
    expect(pagina.textContent).toContain(formatarDataCivil(venda.dataVenda));
    expect(pagina.textContent).toContain(formatarDinheiro(venda.valorTotalCentavos));
    expect(pagina.textContent).toContain(formatarDinheiro(venda.totalPagoCentavos));
    expect(pagina.textContent).toContain(formatarDinheiro(venda.saldoCentavos));
    expect(pagina.textContent).toContain(venda.situacao);
    expect(pagina.querySelectorAll('tbody tr').length).toBe(venda.parcelas.length);
    for (const parcela of venda.parcelas) {
      const linha = [...pagina.querySelectorAll('tbody tr')].find((item) =>
        item.textContent?.includes(`${parcela.numero} de ${venda.parcelas.length}`),
      );
      expect(linha?.textContent).toContain(formatarDinheiro(parcela.valorCentavos));
      expect(linha?.textContent).toContain(formatarDataCivil(parcela.vencimento));
      expect(linha?.textContent).toContain(parcela.situacao);
      expect(linha?.textContent).toContain(
        parcela.dataPagamento ? formatarDataCivil(parcela.dataPagamento) : 'Não informada',
      );
      expect(linha?.textContent).toContain(parcela.formaPagamento ?? 'Não informada');
    }
    expect(pagina.querySelector('a[routerLink="/vendas"]')).not.toBeNull();
    expect(pagina.querySelector('a[routerLink="/vendas/quitadas"]')).not.toBeNull();
    expect(pagina.querySelectorAll('form, input').length).toBe(0);
    expect(pagina.querySelector('[data-acao-receber]')).not.toBeNull();
    expect(servico.consultarVenda(venda.id)).toEqual({
      tipo: 'sucesso',
      valor: venda,
      mensagem: 'Venda demonstrativa consultada.',
    });
  });

  it('preserva dados com 1, 10 e 11 parcelas e só habilita rolagem interna acima de dez', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const cadastrar = (
      nome: string,
      quantidadeParcelas: number,
      descricao?: string,
      entrada = false,
    ) => {
      const resultado = servico.cadastrarVenda({
        cliente: {
          nome,
          cpf: '90000000175',
          telefone: '00900000001',
          descricao: descricao ?? null,
        },
        dataVenda: servico.referencia,
        valorTotalCentavos: 110000,
        quantidadeParcelas,
        entrada: entrada ? { valorCentavos: 10000, data: servico.referencia, forma: 'Pix' } : null,
      });
      if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
      return resultado.valor;
    };
    const uma = cadastrar('Cliente Fixture uma parcela', 1);
    const dez = cadastrar('Cliente Fixture dez parcelas', 10, 'Descrição curta.', true);
    const onze = cadastrar('Cliente Fixture onze parcelas', 11, 'Descrição extensa '.repeat(40));
    const harness = await RouterTestingHarness.create(urlPara(uma.id));
    expect(harness.routeNativeElement?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(harness.routeNativeElement?.textContent).toContain('Sem entrada');
    expect(harness.routeNativeElement?.textContent).not.toContain('Descrição');

    await harness.navigateByUrl(urlPara(dez.id));
    expect(harness.routeNativeElement?.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(harness.routeNativeElement?.querySelector('.parcelas-com-rolagem')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Descrição curta.');
    expect(harness.routeNativeElement?.textContent).toContain('Entrada');
    expect(harness.routeNativeElement?.textContent).toContain(formatarDinheiro(10000));

    await harness.navigateByUrl(urlPara(onze.id));
    expect(harness.routeNativeElement?.querySelectorAll('tbody tr')).toHaveLength(11);
    expect(harness.routeNativeElement?.querySelector('.parcelas-com-rolagem')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Descrição extensa');
    expect(harness.routeNativeElement?.textContent).toContain('Sem entrada');
  });

  it('reconcilia detalhe e recebimentos de 1/10 para 3/10 e 10/10', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const cadastro = servico.cadastrarVenda({
      cliente: {
        nome: 'Cliente progressão parcelas',
        cpf: '90000000175',
        telefone: '00900000001',
      },
      dataVenda: servico.referencia,
      valorTotalCentavos: 100000,
      quantidadeParcelas: 10,
      entrada: { valorCentavos: 10000, data: servico.referencia, forma: 'Pix' },
    });
    if (cadastro.tipo !== 'sucesso') throw new Error(cadastro.mensagem);
    const venda = cadastro.valor;
    const harness = await RouterTestingHarness.create(urlPara(venda.id));
    const pagina = () => harness.routeNativeElement!;
    expect(pagina().textContent).toContain('1 de 10');
    expect(pagina().textContent?.replace(/\s+/g, '')).toContain('Parcelaspagas1de10');
    expect(pagina().querySelector('tbody tr')?.textContent).toContain('Entrada');
    expect(pagina().querySelector('tbody tr')?.textContent).toContain('Paga');

    const receber = async (quantidade: string, valor: string, primeiraPendente: number) => {
      pagina().querySelector<HTMLButtonElement>('[data-acao-receber]')!.click();
      await harness.fixture.whenStable();
      expect(
        pagina().querySelector('ul[aria-label="Parcelas selecionadas"]')?.textContent,
      ).toContain(`Parcela ${primeiraPendente}`);
      expect(
        pagina().querySelector('ul[aria-label="Parcelas selecionadas"]')?.textContent,
      ).not.toContain('Parcela 1');
      const campoQuantidade = pagina().querySelector<HTMLSelectElement>('#quantidade-recebimento')!;
      campoQuantidade.value = quantidade;
      campoQuantidade.dispatchEvent(new Event('input', { bubbles: true }));
      campoQuantidade.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
      const campoValor = pagina().querySelector<HTMLInputElement>('#valor-recebimento')!;
      campoValor.value = valor;
      campoValor.dispatchEvent(new Event('input', { bubbles: true }));
      const data = pagina().querySelector<HTMLInputElement>('#data-recebimento')!;
      data.value = servico.referencia;
      data.dispatchEvent(new Event('input', { bubbles: true }));
      const forma = pagina().querySelector<HTMLSelectElement>('#forma-recebimento')!;
      forma.value = 'Pix';
      forma.dispatchEvent(new Event('input', { bubbles: true }));
      forma.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
      pagina()
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await harness.fixture.whenStable();
    };

    await receber('2', '200', 2);
    expect(pagina().textContent).toContain('3 de 10');
    expect(pagina().textContent?.replace(/\s+/g, '')).toContain('Parcelaspagas3de10');
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { totalPagoCentavos: 30000, saldoCentavos: 70000, quantidadePaga: 3 },
    });

    await receber('7', '700', 4);
    expect(pagina().textContent).toContain('10 de 10');
    expect(pagina().textContent?.replace(/\s+/g, '')).toContain('Parcelaspagas10de10');
    expect(pagina().textContent).toContain('Quitada');
    expect(pagina().querySelector('[data-acao-receber]')).toBeNull();
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { totalPagoCentavos: 100000, saldoCentavos: 0, quantidadePaga: 10 },
    });
  });

  it('faz round-trip de um ID de venda da sessão sem alterar o identificador', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const cadastrada = servico.cadastrarVenda({
      cliente: {
        nome: 'Cliente de sessão',
        cpf: '90000000175',
        telefone: '00900000001',
      },
      dataVenda: servico.referencia,
      valorTotalCentavos: 10000,
      quantidadeParcelas: 1,
      entrada: null,
    });
    expect(cadastrada.tipo).toBe('sucesso');
    if (cadastrada.tipo !== 'sucesso') return;
    expect(cadastrada.valor.id).toBe('sessao/venda/1');

    const harness = await RouterTestingHarness.create(urlPara(cadastrada.valor.id));
    expect(harness.routeNativeElement?.textContent).toContain('Cliente de sessão');
    expect(harness.routeNativeElement?.textContent).toContain('90000000175');
  });

  it('separa a entrada, explicita sua ausência e mantém todas as parcelas pagas em Quitadas', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const comEntrada = servico.vendas().find((venda) => venda.entrada !== null)!;
    const semEntrada = servico.vendas().find((venda) => venda.entrada === null)!;
    const quitada = servico.quitadas()[0];

    const harness = await RouterTestingHarness.create(urlPara(comEntrada.id));
    expect(harness.routeNativeElement?.textContent).toContain('Entrada');
    expect(harness.routeNativeElement?.textContent).toContain(
      formatarDinheiro(comEntrada.entrada!.valorCentavos),
    );
    expect(harness.routeNativeElement?.textContent).toContain(comEntrada.entrada!.forma);

    await harness.navigateByUrl(urlPara(semEntrada.id));
    expect(harness.routeNativeElement?.textContent).toContain('Sem entrada');

    await harness.navigateByUrl(urlPara(quitada.id));
    expect(harness.routeNativeElement?.textContent).toContain('Quitada');
    expect(harness.routeNativeElement?.textContent).toContain('Próximo vencimento');
    expect(quitada.parcelas.every((parcela) => parcela.situacao === 'Paga')).toBe(true);
    expect(harness.routeNativeElement?.querySelectorAll('tbody tr').length).toBe(
      quitada.parcelas.length,
    );
  });

  it('omite descrição ausente sem impedir a consulta', async () => {
    const preparada = prepararCadastro(
      {
        cliente: {
          nome: 'Cliente sem descrição',
          cpf: '90000000175',
          telefone: '00900000001',
        },
        dataVenda: '2026-01-01',
        valorTotalCentavos: 10000,
        quantidadeParcelas: 1,
        entrada: null,
      },
      '2026-01-01',
      'teste/venda/sem-descricao',
    );
    if (preparada.tipo !== 'sucesso') throw new Error(preparada.mensagem);
    const valor = projetarVenda(preparada.valor, '2026-01-01');
    TestBed.overrideProvider(ServicoDemonstracao, {
      useValue: {
        referencia: '2026-01-01',
        consultarVenda: (id: string) =>
          id === valor.id
            ? { tipo: 'sucesso', valor, mensagem: 'Consulta de teste.' }
            : {
                tipo: 'inexistencia',
                codigo: 'venda-inexistente',
                mensagem: 'Venda não encontrada.',
              },
      } as unknown as ServicoDemonstracao,
    });

    const harness = await RouterTestingHarness.create(urlPara(valor.id));
    expect(harness.routeNativeElement?.textContent).toContain('Cliente sem descrição');
    expect(harness.routeNativeElement?.textContent).toContain('Sem entrada');
    expect(harness.routeNativeElement?.textContent).not.toContain('Descrição');
  });

  it('reavalia o parâmetro ao navegar entre vendas e apresenta a ausência sem dados anteriores', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const [primeira, segunda] = servico.vendas();
    const harness = await RouterTestingHarness.create(urlPara(primeira.id));
    expect(harness.routeNativeElement?.textContent).toContain(primeira.cliente.nome);

    await harness.navigateByUrl(urlPara(segunda.id));
    expect(harness.routeNativeElement?.textContent).toContain(segunda.cliente.nome);
    expect(harness.routeNativeElement?.textContent).not.toContain(primeira.cliente.nome);

    await harness.navigateByUrl('/vendas/inexistente');
    expect(harness.routeNativeElement?.textContent).toContain('Venda não encontrada');
    expect(harness.routeNativeElement?.textContent).not.toContain(segunda.cliente.nome);
  });
});
