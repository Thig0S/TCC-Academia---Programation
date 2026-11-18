import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { REFERENCIA_DEMONSTRACAO } from '../../../nucleo/demonstracao/referencia-demonstracao';

describe('Recebimento pela UI e ciclo de vida do dialog (DOM simulado)', () => {
  const showOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
  const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REFERENCIA_DEMONSTRACAO, useValue: '2027-01-31' },
      ],
    });
    // Doubles comprovam chamadas/ciclo de vida, não top layer, inércia ou contenção.
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

  async function abrir(comEntrada = false) {
    const fonte = TestBed.inject(ServicoDemonstracao);
    const cadastro = fonte.cadastrarVenda({
      cliente: { nome: 'Cliente DEMO recebimento', cpf: '90000000175', telefone: '0012345678' },
      dataVenda: fonte.referencia,
      valorTotalCentavos: 10000,
      quantidadeParcelas: 3,
      entrada: comEntrada
        ? { valorCentavos: 2000, data: fonte.referencia, forma: 'Dinheiro' }
        : null,
    });
    if (cadastro.tipo !== 'sucesso') throw new Error(cadastro.mensagem);
    const alvo = cadastro.valor;
    const harness = await RouterTestingHarness.create('/vendas/sessao%2Fvenda%2F1');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-acao-receber]')!.click();
    await harness.fixture.whenStable();
    const preencher = async (id: string, valor: string) => {
      const campo = harness.routeNativeElement!.querySelector<HTMLInputElement | HTMLSelectElement>(
        `#${id}`,
      )!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input', { bubbles: true }));
      if (campo.tagName === 'SELECT') campo.dispatchEvent(new Event('change', { bubbles: true }));
      await harness.fixture.whenStable();
    };
    const enviar = () =>
      harness
        .routeNativeElement!.querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return { fonte, alvo, harness, preencher, enviar };
  }

  it('reconcilia entrada e lote sem contabilizar a entrada como parcela', async () => {
    const { harness, fonte, alvo, preencher, enviar } = await abrir(true);
    const resumo = fonte.resumo();
    await preencher('quantidade-recebimento', '3');
    await preencher('valor-recebimento', '80');
    await preencher('forma-recebimento', 'Pix');
    enviar();
    await harness.fixture.whenStable();
    expect(fonte.consultarVenda(alvo.id)).toMatchObject({
      tipo: 'sucesso',
      valor: {
        totalPagoCentavos: 10000,
        saldoCentavos: 0,
        quantidadePaga: 3,
        entrada: { valorCentavos: 2000 },
        recebimentos: [{ valorCentavos: 8000 }],
      },
    });
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(resumo.recebidoNoMesCentavos + 8000);
    expect(fonte.resumo().totalEmAbertoCentavos).toBe(resumo.totalEmAbertoCentavos - 8000);
  });

  it('abre com showModal, título associado, referência fixa, prefixo e campos vazios', async () => {
    const { harness, fonte } = await abrir();
    const pagina = harness.routeNativeElement!;
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector('dialog')!.getAttribute('aria-labelledby')).toBe('titulo-modal');
    expect(pagina.querySelector('dialog')!.hasAttribute('tabindex')).toBe(false);
    expect(pagina.querySelector<HTMLInputElement>('#data-recebimento')!.value).toBe(
      fonte.referencia,
    );
    expect(pagina.querySelector<HTMLInputElement>('#valor-recebimento')!.value).toBe('');
    expect(pagina.querySelector<HTMLSelectElement>('#forma-recebimento')!.value).toBe('');
    expect(pagina.querySelector('ul')!.textContent).toContain('Parcela 1');
    expect(pagina.querySelector('ul')!.textContent).not.toContain('Parcela 2');
    expect(pagina.querySelector('dialog')!.textContent).toContain('33,34');
  });

  it('rejeita valor/data/forma/seleção inválidos com foco e sem publicação', async () => {
    const { harness, fonte, preencher, enviar } = await abrir();
    const antes = structuredClone(fonte.vendas());
    await preencher('valor-recebimento', '33,33');
    await preencher('data-recebimento', '2026-12-31');
    enviar();
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    expect(pagina.querySelector('#erro-valor-recebimento')!.textContent).toContain('exatamente');
    expect(pagina.querySelector('#erro-data-recebimento')!.textContent).toContain('anterior');
    expect(pagina.querySelector('#erro-forma-recebimento')!.textContent).toContain('Selecione');
    expect(document.activeElement).toBe(pagina.querySelector('#valor-recebimento'));
    await preencher('quantidade-recebimento', '0');
    enviar();
    await harness.fixture.whenStable();
    expect(pagina.querySelector('#erro-quantidade-recebimento')!.textContent).toContain(
      'quantidade',
    );
    expect(pagina.querySelector('dialog')!.open).toBe(true);
    expect(fonte.vendas()).toEqual(antes);
  });

  it('registra lote antecipado uma vez, reconcilia resumos e quita pelo prefixo restante', async () => {
    const { harness, fonte, alvo, preencher, enviar } = await abrir();
    const resumo = fonte.resumo();
    await preencher('quantidade-recebimento', '2');
    await preencher('valor-recebimento', '66,67');
    await preencher('forma-recebimento', 'Pix');
    const comando = vi.spyOn(fonte, 'registrarPagamento');
    enviar();
    enviar();
    await harness.fixture.whenStable();
    expect(comando).toHaveBeenCalledTimes(1);
    expect(harness.routeNativeElement!.querySelector('dialog')).toBeNull();
    expect(fonte.resumo().totalEmAbertoCentavos).toBe(resumo.totalEmAbertoCentavos - 6667);
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(resumo.recebidoNoMesCentavos + 6667);
    expect(fonte.consultarVenda(alvo.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { totalPagoCentavos: 6667, saldoCentavos: 3333, quantidadePaga: 2 },
    });
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-acao-receber]')!.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('ul')!.textContent).toContain('Parcela 3');
    await preencher('valor-recebimento', '33,33');
    await preencher('forma-recebimento', 'Dinheiro');
    enviar();
    await harness.fixture.whenStable();
    expect(fonte.consultarVenda(alvo.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { saldoCentavos: 0, quantidadePaga: 3, proximoVencimento: null, situacao: 'Quitada' },
    });
    expect(fonte.abertas().some((v) => v.id === alvo.id)).toBe(false);
    expect(fonte.quitadas().filter((v) => v.id === alvo.id)).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('[data-acao-receber]')).toBeNull();
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(resumo.recebidoNoMesCentavos + 10000);
  });

  it.each(['resultado', 'excecao'])(
    'preserva modal/rascunho/estado e permite retry em %s',
    async (modo) => {
      const { harness, fonte, preencher, enviar } = await abrir();
      const antes = structuredClone(fonte.vendas());
      await preencher('valor-recebimento', '33,34');
      await preencher('forma-recebimento', 'Pix');
      const comando = vi.spyOn(fonte, 'registrarPagamento');
      if (modo === 'resultado')
        comando.mockReturnValueOnce({
          tipo: 'falha',
          codigo: 'teste',
          mensagem: 'Falha controlada de recebimento.',
        });
      else
        comando.mockImplementationOnce(() => {
          throw new Error('Teste');
        });
      enviar();
      await harness.fixture.whenStable();
      const pagina = harness.routeNativeElement!;
      expect(pagina.querySelector('dialog')!.open).toBe(true);
      expect(pagina.querySelector('[role="alert"]')!.textContent).toMatch(
        /Falha controlada|Não foi possível/,
      );
      expect(pagina.querySelector<HTMLInputElement>('#valor-recebimento')!.value).toBe('33,34');
      expect(pagina.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(
        false,
      );
      expect(fonte.vendas()).toEqual(antes);
      enviar();
      await harness.fixture.whenStable();
      expect(comando).toHaveBeenCalledTimes(2);
      expect(pagina.querySelector('dialog')).toBeNull();
    },
  );

  it('rejeita seleção obsoleta sem avançar automaticamente para a próxima parcela', async () => {
    const { harness, fonte, alvo, preencher, enviar } = await abrir();
    await preencher('valor-recebimento', '33,34');
    await preencher('forma-recebimento', 'Pix');
    expect(
      fonte.registrarPagamento({
        vendaId: alvo.id,
        parcelaIds: [alvo.parcelas[0].id],
        valorCentavos: 3334,
        data: fonte.referencia,
        forma: 'Pix',
      }).tipo,
    ).toBe('sucesso');
    await harness.fixture.whenStable();
    const antes = structuredClone(fonte.vendas());
    const comando = vi.spyOn(fonte, 'registrarPagamento');
    enviar();
    await harness.fixture.whenStable();
    expect(comando).not.toHaveBeenCalled();
    expect(harness.routeNativeElement!.querySelector('ul')!.textContent).toContain('Parcela 1');
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')!.textContent).toContain(
      'consecutivas',
    );
    expect(fonte.vendas()).toEqual(antes);
  });

  it.each(['botao', 'cancel', 'close', 'desmonte'])(
    'fecha/descarta sem confirmar por %s',
    async (modo) => {
      const { harness, fonte, preencher } = await abrir();
      const antes = structuredClone(fonte.vendas());
      await preencher('valor-recebimento', '33,34');
      const dialog = harness.routeNativeElement!.querySelector('dialog')!;
      if (modo === 'desmonte') await harness.navigateByUrl('/vendas');
      else if (modo === 'cancel') dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      else if (modo === 'close') dialog.close();
      else
        [...dialog.querySelectorAll('button')]
          .find((b) => b.textContent?.includes('Cancelar'))!
          .click();
      await harness.fixture.whenStable();
      expect(dialog.open).toBe(false);
      expect(fonte.vendas()).toEqual(antes);
      expect(harness.routeNativeElement!.querySelector('dialog')).toBeNull();
    },
  );
});
