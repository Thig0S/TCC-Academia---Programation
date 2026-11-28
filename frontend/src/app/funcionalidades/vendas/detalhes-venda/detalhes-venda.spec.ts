import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { routes } from '../../../app.routes';
import { appConfig } from '../../../app.config';
import { FONTE_VENDAS, FonteVendas } from '../../../nucleo/dados/fonte-vendas';
import { VendaDetalheLeitura, VendaResumoLeitura } from '../../../nucleo/dados/modelos-leitura';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { Resultado } from '../venda.modelos';
import { formatarDataCivil } from '../data-civil';
import { formatarDinheiro } from '../dinheiro';
import { formatarCpf, formatarTelefone } from '../identificacao.validacoes';
import { calcularRelatorio } from '../../relatorios/relatorios.calculos';
import { REFERENCIA_DEMONSTRACAO } from '../../../nucleo/demonstracao/referencia-demonstracao';

const referenciaTeste = '2026-01-31';

function detalheTeste(id = 'venda/teste', nome = 'Cliente HTTP sintético'): VendaDetalheLeitura {
  const resumo: VendaResumoLeitura = {
    id,
    cliente: {
      nome,
      cpf: '90000000175',
      telefone: '11900000001',
      descricao: 'Descrição da origem HTTP',
    },
    dataVenda: '2026-01-02',
    statusAdministrativo: 'Ativo',
    situacao: 'Em aberto',
    valorTotalCentavos: 20000,
    acrescimosCentavos: 250,
    valorTotalEfetivoCentavos: 20250,
    totalRecebidoCentavos: 13250,
    saldoCentavos: 7000,
    quantidadePaga: 0,
    quantidadeParcelas: 2,
    proximoVencimento: '2026-02-02',
    revisao: '17',
    referencia: referenciaTeste,
  };
  return {
    resumo,
    parcelas: [
      {
        id: 'parcela/1',
        numero: 1,
        valorBaseCentavos: 10000,
        acrescimoCentavos: 0,
        valorEfetivoCentavos: 10000,
        valorRecebidoCentavos: 5000,
        saldoCentavos: 5000,
        vencimento: '2026-02-02',
        situacao: 'Aberto',
        dataPagamento: '2026-01-10',
        formaPagamento: 'Pix',
      },
      {
        id: 'parcela/2',
        numero: 2,
        valorBaseCentavos: 10000,
        acrescimoCentavos: 250,
        valorEfetivoCentavos: 10250,
        valorRecebidoCentavos: 8250,
        saldoCentavos: 2000,
        vencimento: '2026-03-02',
        situacao: 'Aberto',
        dataPagamento: '2026-01-11',
        formaPagamento: 'Cartão de crédito',
      },
    ],
    recebimentos: [
      {
        id: 'entrada/1',
        data: '2026-01-10',
        forma: 'Pix',
        origem: 'Entrada',
        valorCentavos: 3000,
        acrescimoCentavos: 0,
        observacao: '',
        alocacoes: [{ parcelaId: 'parcela/1', valorCentavos: 3000 }],
      },
      {
        id: 'lote/1',
        data: '2026-01-10',
        forma: 'Dinheiro',
        origem: 'Lote',
        valorCentavos: 5000,
        acrescimoCentavos: 0,
        observacao: '',
        alocacoes: [
          { parcelaId: 'parcela/1', valorCentavos: 2000 },
          { parcelaId: 'parcela/2', valorCentavos: 3000 },
        ],
      },
      {
        id: 'individual/1',
        data: '2026-01-11',
        forma: 'Cartão de crédito',
        origem: 'Individual',
        valorCentavos: 5250,
        acrescimoCentavos: 250,
        observacao: 'Recebido online',
        alocacoes: [{ parcelaId: 'parcela/2', valorCentavos: 5250 }],
      },
    ],
  };
}

function fonteDetalheFake(
  consultarVenda: (id: string) => Observable<Resultado<VendaDetalheLeitura>>,
): FonteVendas {
  return {
    referencia: referenciaTeste,
    consultarColecao: vi.fn(),
    consultarVenda: vi.fn(consultarVenda),
    consultarVisaoGeral: vi.fn(),
    consultarRelatorioMensal: vi.fn(),
    cadastrarVenda: vi.fn(),
    editarCliente: vi.fn(),
    alterarStatus: vi.fn(),
    registrarPagamento: vi.fn(),
    corrigirPagamento: vi.fn(),
  } as unknown as FonteVendas;
}

describe('DetalhesVenda', () => {
  const showOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...(appConfig.providers ?? []), provideRouter(routes)],
    });
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
    expect(pagina.textContent).toContain(formatarCpf(venda.cliente.cpf));
    expect(pagina.textContent).toContain(formatarTelefone(venda.cliente.telefone));
    expect(pagina.textContent).toContain(formatarDataCivil(venda.dataVenda));
    expect(pagina.textContent).toContain(formatarDinheiro(venda.valorTotalCentavos));
    expect(pagina.textContent).toContain(formatarDinheiro(venda.totalPagoCentavos));
    expect(pagina.textContent).toContain(formatarDinheiro(venda.saldoCentavos));
    expect(pagina.textContent).toContain(venda.situacao);
    expect(pagina.querySelectorAll('.tabela-parcelas-detalhe tbody tr').length).toBe(
      venda.parcelas.length,
    );
    for (const parcela of venda.parcelas) {
      const linha = [...pagina.querySelectorAll('.tabela-parcelas-detalhe tbody tr')].find((item) =>
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
    expect(pagina.querySelector('a[href="/vendas"]')).not.toBeNull();
    expect(pagina.querySelectorAll('form, input').length).toBe(0);
    expect(pagina.querySelector('[data-acao-pagar]')).not.toBeNull();
    expect(pagina.querySelectorAll('[data-acao-corrigir]')).toHaveLength(0);
    expect(pagina.querySelector('[data-acao-receber]')).toBeNull();
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
    expect(
      harness.routeNativeElement?.querySelectorAll('.tabela-parcelas-detalhe tbody tr'),
    ).toHaveLength(1);
    expect(harness.routeNativeElement?.textContent).toContain('Sem entrada');
    expect(harness.routeNativeElement?.textContent).not.toContain('Descrição');

    await harness.navigateByUrl(urlPara(dez.id));
    expect(
      harness.routeNativeElement?.querySelectorAll('.tabela-parcelas-detalhe tbody tr'),
    ).toHaveLength(10);
    expect(harness.routeNativeElement?.querySelector('.parcelas-com-rolagem')).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Descrição curta.');
    expect(harness.routeNativeElement?.textContent).toContain('Entrada');
    expect(harness.routeNativeElement?.textContent).toContain(formatarDinheiro(10000));

    await harness.navigateByUrl(urlPara(onze.id));
    expect(
      harness.routeNativeElement?.querySelectorAll('.tabela-parcelas-detalhe tbody tr'),
    ).toHaveLength(11);
    expect(harness.routeNativeElement?.querySelector('.parcelas-com-rolagem')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Descrição extensa');
    expect(harness.routeNativeElement?.textContent).toContain('Sem entrada');
  });

  it('oferece ação acessível só para a primeira pendente e descarta o modal ao trocar de venda', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const cadastrar = (nome: string) => {
      const resultado = servico.cadastrarVenda({
        cliente: { nome, cpf: '90000000175', telefone: '00900000001' },
        dataVenda: servico.referencia,
        valorTotalCentavos: 40000,
        quantidadeParcelas: 4,
        entrada: { valorCentavos: 10000, data: servico.referencia, forma: 'Pix' },
      });
      if (resultado.tipo !== 'sucesso') throw new Error(resultado.mensagem);
      return resultado.valor;
    };
    const alvo = cadastrar('Cliente sequência acessível');
    const outra = cadastrar('Cliente destino');
    const harness = await RouterTestingHarness.create(urlPara(alvo.id));
    const pagina = () => harness.routeNativeElement!;
    const linhas = () => [...pagina().querySelectorAll('.tabela-parcelas-detalhe tbody tr')];
    const botaoDaParcela = (numero: number) =>
      linhas()
        .find((linha) => linha.textContent?.includes(`${numero} de ${alvo.parcelas.length}`))
        ?.querySelector<HTMLButtonElement>('[data-acao-pagar]');

    expect(botaoDaParcela(1)).toBeNull();
    expect(botaoDaParcela(2)?.getAttribute('aria-label')).toContain('parcela 2');
    expect(botaoDaParcela(2)?.getAttribute('aria-label')).toContain(alvo.cliente.nome);
    expect(linhas()[2].textContent).toContain('Aguardando parcela anterior');
    expect(linhas()[3].textContent).toContain('Aguardando parcela anterior');
    expect(pagina().querySelectorAll('[data-acao-pagar]')).toHaveLength(1);

    expect(
      servico.registrarPagamento({
        vendaId: alvo.id,
        parcelaId: alvo.parcelas[1].id,
        data: servico.referencia,
        forma: 'Pix',
      }).tipo,
    ).toBe('sucesso');
    await harness.fixture.whenStable();
    expect(botaoDaParcela(1)).toBeNull();
    expect(botaoDaParcela(2)).toBeNull();
    expect(botaoDaParcela(3)?.getAttribute('aria-label')).toContain('parcela 3');

    botaoDaParcela(3)!.click();
    await harness.fixture.whenStable();
    expect(pagina().querySelector('dialog')?.open).toBe(true);
    await harness.navigateByUrl(urlPara(outra.id));
    expect(pagina().querySelector('dialog')).toBeNull();
    expect(pagina().textContent).toContain(outra.cliente.nome);
  });

  it('reconcilia ações individuais do detalhe de 1/10 para 3/10 e 10/10', async () => {
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
    expect(pagina().querySelector('.tabela-parcelas-detalhe tbody tr')?.textContent).toContain(
      'Entrada',
    );
    expect(pagina().querySelector('.tabela-parcelas-detalhe tbody tr')?.textContent).toContain(
      'Paga',
    );
    expect(pagina().querySelectorAll('[data-acao-pagar]')).toHaveLength(1);
    expect(pagina().textContent).toContain('Aguardando parcela anterior');

    const pagar = async (numero: number) => {
      const acao = pagina().querySelector<HTMLButtonElement>('[data-acao-pagar]')!;
      expect(acao.getAttribute('aria-label')).toContain(`parcela ${numero}`);
      acao.click();
      await harness.fixture.whenStable();
      expect(pagina().querySelector('dialog')?.textContent).toContain(`Parcela${numero}`);
      expect(pagina().querySelector<HTMLInputElement>('#valor-recebimento')?.value).toBe('100,00');
      expect(pagina().querySelector('#quantidade-recebimento')).toBeNull();
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

    await pagar(2);
    await pagar(3);
    expect(pagina().textContent).toContain('3 de 10');
    expect(pagina().textContent?.replace(/\s+/g, '')).toContain('Parcelaspagas3de10');
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { totalPagoCentavos: 30000, saldoCentavos: 70000, quantidadePaga: 3 },
    });

    for (let numero = 4; numero <= 10; numero++) await pagar(numero);
    expect(pagina().textContent).toContain('10 de 10');
    expect(pagina().textContent?.replace(/\s+/g, '')).toContain('Parcelaspagas10de10');
    expect(pagina().textContent).toContain('Quitada');
    expect(pagina().querySelector('[data-acao-pagar]')).toBeNull();
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { totalPagoCentavos: 100000, saldoCentavos: 0, quantidadePaga: 10 },
    });
  });

  it('corrige somente pagamento individual com retry de campo, cancelamento/Escape e conciliação mensal', async () => {
    TestBed.overrideProvider(REFERENCIA_DEMONSTRACAO, { useValue: '2027-01-31' });
    const servico = TestBed.inject(ServicoDemonstracao);
    const cadastrada = servico.cadastrarVenda({
      cliente: { nome: 'Cliente correção acessível', cpf: '90000000175', telefone: '00900000001' },
      dataVenda: '2026-12-01',
      valorTotalCentavos: 100000,
      quantidadeParcelas: 4,
      entrada: { valorCentavos: 20000, data: '2026-12-01', forma: 'Pix' },
    });
    if (cadastrada.tipo !== 'sucesso') throw new Error(cadastrada.mensagem);
    const venda = cadastrada.valor;
    const parcela = venda.parcelas[1];
    const valorInicial = parcela.valorCentavos + 100;
    const registrada = servico.registrarPagamento({
      vendaId: venda.id,
      parcelaId: parcela.id,
      data: '2027-01-15',
      forma: 'Pix',
      valorCentavos: valorInicial,
      observacao: 'antes',
    });
    if (registrada.tipo !== 'sucesso') throw new Error(registrada.mensagem);
    const pagamento = registrada.valor.recebimentos.at(-1)!;
    const antesDaCorrecao = servico.consultarVenda(venda.id);
    if (antesDaCorrecao.tipo !== 'sucesso') throw new Error(antesDaCorrecao.mensagem);
    const relatorioAntes = calcularRelatorio(servico.vendas(), servico.referencia);
    expect(relatorioAntes.recebimentos.some((item) => item.id.endsWith(pagamento.id))).toBe(true);

    const harness = await RouterTestingHarness.create(urlPara(venda.id));
    const pagina = () => harness.routeNativeElement!;
    const acionador = pagina().querySelector<HTMLButtonElement>(
      `[data-acao-corrigir="${pagamento.id}"]`,
    )!;
    expect(pagina().querySelectorAll('[data-acao-corrigir]')).toHaveLength(1);
    expect(acionador.getAttribute('aria-label')).toContain('parcela 2');
    expect(acionador.getAttribute('aria-label')).toContain(venda.cliente.nome);
    expect(pagina().textContent).toContain('Total efetivo');
    expect(pagina().textContent).toContain(formatarDinheiro(100100));
    expect(pagina().textContent).toContain('Valor recebido');

    const valorTexto = (centavos: number) =>
      `${Math.floor(centavos / 100)},${String(centavos % 100).padStart(2, '0')}`;
    const alterar = async (seletor: string, valor: string) => {
      const controle = pagina().querySelector<HTMLInputElement | HTMLSelectElement>(seletor)!;
      controle.value = valor;
      controle.dispatchEvent(new Event('input', { bubbles: true }));
      controle.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
    };
    const abrir = async () => {
      pagina().querySelector<HTMLButtonElement>(`[data-acao-corrigir="${pagamento.id}"]`)!.click();
      await harness.fixture.whenStable();
      return pagina().querySelector<HTMLDialogElement>('dialog')!;
    };
    const beforeCancel = structuredClone(servico.vendas());
    let dialog = await abrir();
    expect(dialog.textContent).toContain('Valor recebido atual');
    expect(dialog.textContent).toContain(formatarDinheiro(valorInicial));
    expect(dialog.querySelector<HTMLInputElement>('#valor-correcao')!.value).toBe(
      valorTexto(valorInicial),
    );
    expect(dialog.querySelector<HTMLInputElement>('#data-correcao')!.value).toBe('2027-01-15');
    expect(dialog.querySelector<HTMLSelectElement>('#forma-correcao')!.value).toBe('Pix');
    expect(dialog.querySelector<HTMLInputElement>('#observacao-correcao')!.value).toBe('antes');
    expect(document.activeElement).toBe(dialog.querySelector('#data-correcao'));
    dialog.querySelector<HTMLButtonElement>('button[type="button"]:last-child')!.click();
    await harness.fixture.whenStable();
    expect(servico.vendas()).toEqual(beforeCancel);
    expect(document.activeElement).toBe(acionador);

    dialog = await abrir();
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await harness.fixture.whenStable();
    expect(servico.vendas()).toEqual(beforeCancel);
    expect(document.activeElement).toBe(acionador);

    dialog = await abrir();
    await alterar('#observacao-correcao', '123456789012345678901');
    dialog
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('#erro-observacao-correcao')?.textContent).toContain(
      '20 caracteres',
    );
    expect(document.activeElement).toBe(dialog.querySelector('#observacao-correcao'));
    expect(servico.vendas()).toEqual(beforeCancel);

    await alterar('#valor-correcao', valorTexto(parcela.valorCentavos - 1));
    await alterar('#observacao-correcao', 'corrigido');
    dialog
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('#erro-valor-correcao')?.textContent).toContain(
      'igual ou superior',
    );
    expect(document.activeElement).toBe(dialog.querySelector('#valor-correcao'));
    expect(servico.vendas()).toEqual(beforeCancel);

    await alterar('#valor-correcao', valorTexto(parcela.valorCentavos + 50));
    await alterar('#data-correcao', '2026-12-31');
    await alterar('#forma-correcao', 'Dinheiro');
    dialog
      .querySelector<HTMLFormElement>('form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await harness.fixture.whenStable();

    const projetada = servico.consultarVenda(venda.id);
    expect(projetada).toMatchObject({
      tipo: 'sucesso',
      valor: {
        valorTotalCentavos: 100000,
        valorTotalEfetivoCentavos: antesDaCorrecao.valor.valorTotalEfetivoCentavos - 50,
        totalPagoCentavos: antesDaCorrecao.valor.totalPagoCentavos - 50,
        saldoCentavos: antesDaCorrecao.valor.saldoCentavos,
      },
    });
    if (projetada.tipo !== 'sucesso') throw new Error(projetada.mensagem);
    expect(projetada.valor.recebimentos.filter((item) => item.id === pagamento.id)).toHaveLength(1);
    expect(projetada.valor.recebimentos.find((item) => item.id === pagamento.id)).toMatchObject({
      id: pagamento.id,
      data: '2026-12-31',
      forma: 'Dinheiro',
      valorCentavos: parcela.valorCentavos + 50,
      acrescimoCentavos: 50,
      observacao: 'corrigido',
    });
    const relatorioDepois = calcularRelatorio(servico.vendas(), servico.referencia);
    expect(relatorioDepois.totalRecebidoCentavos).toBe(
      relatorioAntes.totalRecebidoCentavos - valorInicial,
    );
    expect(relatorioDepois.recebimentos.some((item) => item.id.endsWith(pagamento.id))).toBe(false);
    expect(servico.consultarPeriodo('2026-12-01', '2026-12-31')).toMatchObject({
      tipo: 'sucesso',
      valor: { recebidosCentavos: expect.any(Number) },
    });
    expect(pagina().textContent).toContain('Recebimento individual corrigido.');
    expect(document.activeElement).toBe(
      pagina().querySelector(`[data-acao-corrigir="${pagamento.id}"]`),
    );
    expect(pagina().querySelector(`[data-acao-corrigir="${pagamento.id}"]`)).not.toBeNull();
    expect(servico.alterarStatus({ vendaId: venda.id, status: 'Inativo' }).tipo).toBe('sucesso');
    await harness.fixture.whenStable();
    expect(pagina().querySelectorAll('[data-acao-corrigir]')).toHaveLength(0);
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
    expect(harness.routeNativeElement?.textContent).toContain(formatarCpf('90000000175'));
    expect(harness.routeNativeElement?.textContent).toContain(formatarTelefone('00900000001'));
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
    expect(
      harness.routeNativeElement?.querySelectorAll('.tabela-parcelas-detalhe tbody tr').length,
    ).toBe(quitada.parcelas.length);
  });

  it('omite descrição ausente sem impedir a consulta', async () => {
    const detalhe = detalheTeste('teste/venda/sem-descricao');
    const semDescricao: VendaDetalheLeitura = {
      ...detalhe,
      resumo: {
        ...detalhe.resumo,
        cliente: { ...detalhe.resumo.cliente, nome: 'Cliente sem descrição', descricao: null },
      },
    };
    TestBed.overrideProvider(FONTE_VENDAS, {
      useValue: fonteDetalheFake(() =>
        of({ tipo: 'sucesso', valor: semDescricao, mensagem: 'Consulta de teste.' }),
      ),
    });

    const harness = await RouterTestingHarness.create(urlPara(semDescricao.resumo.id));
    expect(harness.routeNativeElement?.textContent).toContain('Cliente sem descrição');
    expect(harness.routeNativeElement?.textContent).not.toContain('Descrição');
  });

  it('consulta ID opaco reservado e preserva origem, histórico e alocações sem iniciar comandos', async () => {
    const id = 'loja/externa?origem=%25#ação';
    const detalhe = detalheTeste(id);
    const fonte = fonteDetalheFake(() =>
      of({ tipo: 'sucesso', valor: detalhe, mensagem: 'Consulta sintética.' }),
    );
    const consultarDemo = vi.fn();
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    TestBed.overrideProvider(ServicoDemonstracao, {
      useValue: { consultarVenda: consultarDemo } as unknown as ServicoDemonstracao,
    });

    const harness = await RouterTestingHarness.create(urlPara(id));
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    const historico = pagina.querySelector('details table')!;

    expect(urlPara(id)).toContain('%2F');
    expect(fonte.consultarVenda).toHaveBeenCalledTimes(1);
    expect(fonte.consultarVenda).toHaveBeenCalledWith(id);
    expect(pagina.textContent).toContain('Cliente HTTP sintético');
    expect(pagina.textContent).toContain('R$ 30,00');
    expect(historico.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(historico.textContent).toContain('Entrada');
    expect(historico.textContent).toContain('Lote');
    expect(historico.textContent).toContain('Individual');
    expect(historico.textContent).toContain('Parcela 1:');
    expect(historico.textContent).toContain('Parcela 2:');
    expect(historico.textContent).toContain('Recebido online');
    expect(pagina.querySelector('a[aria-label^="Editar dados"]')).toBeNull();
    expect(
      pagina.querySelector('[data-acao-status], [data-acao-pagar], [data-acao-corrigir]'),
    ).toBeNull();
    expect(pagina.querySelector('form, input')).toBeNull();
    expect(consultarDemo).not.toHaveBeenCalled();
    expect(fonte.cadastrarVenda).not.toHaveBeenCalled();
    expect(fonte.editarCliente).not.toHaveBeenCalled();
    expect(fonte.alterarStatus).not.toHaveBeenCalled();
    expect(fonte.registrarPagamento).not.toHaveBeenCalled();
    expect(fonte.corrigirPagamento).not.toHaveBeenCalled();
  });

  it('distingue 404 contratual de falha física e libera somente nova consulta explícita', async () => {
    let tentativasTransporte = 0;
    const fonte = fonteDetalheFake((id) => {
      if (id === 'ausente') {
        return of({
          tipo: 'inexistencia',
          codigo: 'venda-inexistente',
          mensagem: 'Venda não encontrada.',
        });
      }
      if (id === 'banco') {
        return of({ tipo: 'inexistencia', codigo: 'banco-indisponivel', mensagem: 'Falha.' });
      }
      if (id === 'transporte' && tentativasTransporte++ === 0)
        return throwError(() => new Error('offline'));
      return of({ tipo: 'sucesso', valor: detalheTeste(id), mensagem: 'Consulta sintética.' });
    });
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const harness = await RouterTestingHarness.create(urlPara('ausente'));
    const pagina = () => harness.routeNativeElement!;

    expect(pagina().textContent).toContain('Venda não encontrada');
    expect(pagina().querySelector('nav[aria-label="Retornos de Vendas"] a')).not.toBeNull();

    await harness.navigateByUrl(urlPara('banco'));
    expect(pagina().querySelector('[role="alert"]')?.textContent).toContain('Verifique a conexão');
    expect(pagina().textContent).not.toContain('Venda não encontrada');

    await harness.navigateByUrl(urlPara('transporte'));
    expect(pagina().querySelector('[role="alert"]')?.textContent).toContain('Verifique a conexão');
    expect(fonte.consultarVenda).toHaveBeenCalledTimes(3);
    pagina().querySelector<HTMLButtonElement>('button')!.click();
    await harness.fixture.whenStable();
    expect(fonte.consultarVenda).toHaveBeenCalledTimes(4);
    expect(pagina().querySelector('[role="alert"]')).toBeNull();
    expect(pagina().textContent).toContain('Cliente HTTP sintético');
  });

  it('descarta resposta do ID anterior quando a navegação rápida troca o detalhe', async () => {
    const respostas: Subject<Resultado<VendaDetalheLeitura>>[] = [];
    const fonte = fonteDetalheFake(() => {
      const resposta = new Subject<Resultado<VendaDetalheLeitura>>();
      respostas.push(resposta);
      return resposta;
    });
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const harness = await RouterTestingHarness.create(urlPara('venda-a'));
    await harness.navigateByUrl(urlPara('venda-b'));
    expect(fonte.consultarVenda).toHaveBeenCalledTimes(2);

    respostas[1].next({
      tipo: 'sucesso',
      valor: detalheTeste('venda-b', 'Cliente venda-b'),
      mensagem: 'Consulta sintética.',
    });
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Cliente venda-b');

    respostas[0].next({
      tipo: 'sucesso',
      valor: detalheTeste('venda-a', 'Cliente venda-a'),
      mensagem: 'Consulta sintética.',
    });
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Cliente venda-b');
    expect(harness.routeNativeElement?.textContent).not.toContain('Cliente venda-a');
  });

  it('ignora consulta pendente invalidada antes de publicar e recarrega o mesmo ID', async () => {
    const respostas: Subject<Resultado<VendaDetalheLeitura>>[] = [];
    const fonte = fonteDetalheFake(() => {
      const resposta = new Subject<Resultado<VendaDetalheLeitura>>();
      respostas.push(resposta);
      return resposta;
    });
    TestBed.overrideProvider(FONTE_VENDAS, { useValue: fonte });
    const harness = await RouterTestingHarness.create(urlPara('venda-atual'));
    TestBed.inject(ControleConsultas).invalidarTodas();
    await harness.fixture.whenStable();
    expect(fonte.consultarVenda).toHaveBeenCalledTimes(2);

    respostas[0].next({
      tipo: 'sucesso',
      valor: detalheTeste('resposta-obsoleta', 'Resposta obsoleta'),
      mensagem: 'Resposta anterior à invalidação.',
    });
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).not.toContain('Resposta obsoleta');

    respostas[1].next({
      tipo: 'sucesso',
      valor: detalheTeste('venda-atual', 'Cliente venda-atual'),
      mensagem: 'Consulta atual.',
    });
    harness.fixture.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Cliente venda-atual');
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

  it('confirma status, cancela sem mutação, restaura foco e reabre pela coleção correta', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const cadastrada = servico.cadastrarVenda({
      cliente: { nome: 'Cliente transição visual', cpf: '90000000175', telefone: '00900000001' },
      dataVenda: servico.referencia,
      valorTotalCentavos: 40000,
      quantidadeParcelas: 4,
      entrada: null,
    });
    if (cadastrada.tipo !== 'sucesso') throw new Error(cadastrada.mensagem);
    const venda = cadastrada.valor;
    const harness = await RouterTestingHarness.create(urlPara(venda.id));
    const pagina = () => harness.routeNativeElement!;
    const confirmar = async () => {
      const botao = pagina().querySelector<HTMLButtonElement>('dialog [data-foco-inicial]')!;
      botao.click();
      await harness.fixture.whenStable();
    };
    const abrirConfirmacao = async (status: string) => {
      const botao = pagina().querySelector<HTMLButtonElement>(`[data-acao-status="${status}"]`)!;
      botao.click();
      await harness.fixture.whenStable();
      return botao;
    };

    expect(pagina().textContent).toContain('Ativo');
    expect(pagina().querySelectorAll('[data-acao-status]')).toHaveLength(2);
    const acionadorInativar = await abrirConfirmacao('Inativo');
    const dialog = pagina().querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.open).toBe(true);
    expect(document.activeElement).toBe(dialog.querySelector('[data-foco-inicial]'));
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { statusAdministrativo: 'Ativo' },
    });
    [...dialog.querySelectorAll<HTMLButtonElement>('button')]
      .find((botao) => botao.textContent?.includes('Cancelar'))!
      .click();
    await harness.fixture.whenStable();
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { statusAdministrativo: 'Ativo' },
    });
    expect(document.activeElement).toBe(acionadorInativar);

    await abrirConfirmacao('Inativo');
    await confirmar();
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { statusAdministrativo: 'Inativo' },
    });
    expect(pagina().querySelector('[data-acao-status="Prejuízo"]')).toBeNull();
    expect(pagina().querySelector('[data-acao-pagar]')).toBeNull();
    expect(document.activeElement).toBe(pagina().querySelector('#titulo-status-administrativo'));
    expect(
      pagina()
        .querySelector<HTMLAnchorElement>('nav[aria-label="Retornos de Vendas"] a')
        ?.getAttribute('href'),
    ).toBe('/vendas/inativas');

    await abrirConfirmacao('Ativo');
    await confirmar();
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { statusAdministrativo: 'Ativo' },
    });
    expect(
      pagina()
        .querySelector<HTMLAnchorElement>('nav[aria-label="Retornos de Vendas"] a')
        ?.getAttribute('href'),
    ).toBe('/vendas');

    await abrirConfirmacao('Prejuízo');
    await confirmar();
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { statusAdministrativo: 'Prejuízo' },
    });
    expect(pagina().querySelector('[data-acao-status="Inativo"]')).toBeNull();
    expect(pagina().querySelectorAll('[data-acao-status="Ativo"]')).toHaveLength(1);
    expect(pagina().querySelector('[data-acao-pagar]')).toBeNull();

    await abrirConfirmacao('Ativo');
    await confirmar();
    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { statusAdministrativo: 'Ativo' },
    });
    expect(
      pagina()
        .querySelector<HTMLAnchorElement>('nav[aria-label="Retornos de Vendas"] a')
        ?.getAttribute('href'),
    ).toBe('/vendas');
  });

  it('retorna venda Ativa quitada à coleção Quitadas depois de reativar', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const cadastrada = servico.cadastrarVenda({
      cliente: { nome: 'Cliente reativado quitado', cpf: '90000000175', telefone: '00900000001' },
      dataVenda: servico.referencia,
      valorTotalCentavos: 10000,
      quantidadeParcelas: 1,
      entrada: null,
    });
    if (cadastrada.tipo !== 'sucesso') throw new Error(cadastrada.mensagem);
    const venda = cadastrada.valor;
    expect(
      servico.registrarPagamento({
        vendaId: venda.id,
        parcelaId: venda.parcelas[0].id,
        data: servico.referencia,
        forma: 'Pix',
      }).tipo,
    ).toBe('sucesso');
    const harness = await RouterTestingHarness.create(urlPara(venda.id));
    const pagina = () => harness.routeNativeElement!;

    expect(pagina().querySelector('[data-acao-status="Prejuízo"]')).toBeNull();
    expect(pagina().querySelector('[data-acao-pagar]')).toBeNull();
    pagina().querySelector<HTMLButtonElement>('[data-acao-status="Inativo"]')!.click();
    await harness.fixture.whenStable();
    pagina().querySelector<HTMLButtonElement>('dialog [data-foco-inicial]')!.click();
    await harness.fixture.whenStable();

    pagina().querySelector<HTMLButtonElement>('[data-acao-status="Ativo"]')!.click();
    await harness.fixture.whenStable();
    pagina().querySelector<HTMLButtonElement>('dialog [data-foco-inicial]')!.click();
    await harness.fixture.whenStable();

    expect(servico.consultarVenda(venda.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { statusAdministrativo: 'Ativo', saldoCentavos: 0 },
    });
    expect(
      pagina()
        .querySelector<HTMLAnchorElement>('nav[aria-label="Retornos de Vendas"] a')
        ?.getAttribute('href'),
    ).toBe('/vendas/quitadas');
  });
});
