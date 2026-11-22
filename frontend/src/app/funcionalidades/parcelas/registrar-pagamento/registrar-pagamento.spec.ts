import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../../app.routes';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { REFERENCIA_DEMONSTRACAO } from '../../../nucleo/demonstracao/referencia-demonstracao';

describe('Pagamento individual pela UI e ciclo de vida do dialog (DOM simulado)', () => {
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
      dataVenda: '2027-01-01',
      valorTotalCentavos: 10000,
      quantidadeParcelas: 3,
      entrada: comEntrada ? { valorCentavos: 2000, data: '2027-01-01', forma: 'Dinheiro' } : null,
    });
    if (cadastro.tipo !== 'sucesso') throw new Error(cadastro.mensagem);
    const alvo = cadastro.valor;
    const harness = await RouterTestingHarness.create('/vendas/sessao%2Fvenda%2F1');
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-acao-pagar]')!.click();
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

  it('reconcilia uma parcela após entrada sem oferecer ação para a entrada', async () => {
    const { harness, fonte, alvo, preencher, enviar } = await abrir(true);
    const resumo = fonte.resumo();
    await preencher('forma-recebimento', 'Pix');
    enviar();
    await harness.fixture.whenStable();
    expect(fonte.consultarVenda(alvo.id)).toMatchObject({
      tipo: 'sucesso',
      valor: {
        totalPagoCentavos: 6000,
        saldoCentavos: 4000,
        quantidadePaga: 2,
        entrada: { valorCentavos: 2000 },
        recebimentos: [{ valorCentavos: 2000 }, { valorCentavos: 4000 }],
      },
    });
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(resumo.recebidoNoMesCentavos + 4000);
    expect(fonte.resumo().totalEmAbertoCentavos).toBe(resumo.totalEmAbertoCentavos - 4000);
    expect(harness.routeNativeElement!.querySelector('[data-acao-pagar]')?.textContent).toContain(
      'Pagar',
    );
  });

  it('abre com título, foco/data de referência e conferência somente leitura', async () => {
    const { harness, fonte } = await abrir();
    const pagina = harness.routeNativeElement!;
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalledTimes(1);
    expect(pagina.querySelector('dialog')!.getAttribute('aria-labelledby')).toBe('titulo-modal');
    expect(pagina.querySelector('dialog')!.textContent).toContain('Pagar parcela');
    expect(pagina.querySelector('[role="alert"]')).toBeNull();
    expect(pagina.querySelector<HTMLInputElement>('#data-recebimento')!.value).toBe(
      fonte.referencia,
    );
    expect(pagina.querySelector<HTMLSelectElement>('#forma-recebimento')!.value).toBe('');
    expect(pagina.querySelector('dialog')!.textContent).toContain('Parcela');
    expect(pagina.querySelector('dialog')!.textContent).toContain('33,34');
    expect(pagina.querySelector('#valor-recebimento')).toBeNull();
    expect(pagina.querySelector('#quantidade-recebimento')).toBeNull();
  });

  it('rejeita data/forma inválidas com erros associados e sem publicar', async () => {
    const { harness, fonte, preencher, enviar } = await abrir();
    const antes = structuredClone(fonte.vendas());
    await preencher('data-recebimento', '2026-12-31');
    enviar();
    await harness.fixture.whenStable();
    const pagina = harness.routeNativeElement!;
    expect(pagina.querySelector('#erro-data-recebimento')!.textContent).toContain('anterior');
    expect(pagina.querySelector('#erro-forma-recebimento')!.textContent).toContain('Selecione');
    expect(pagina.querySelector('#erro-valor-recebimento')).toBeNull();
    expect(pagina.querySelector('#erro-quantidade-recebimento')).toBeNull();
    expect(document.activeElement).toBe(
      pagina.querySelector<HTMLInputElement>('#data-recebimento'),
    );
    expect(pagina.querySelector('dialog')!.open).toBe(true);
    expect(fonte.vendas()).toEqual(antes);
  });

  it('confirma pagamentos separados, protege envio duplicado e quita pela sequência', async () => {
    const { harness, fonte, alvo, preencher, enviar } = await abrir();
    const resumo = fonte.resumo();
    const comando = vi.spyOn(fonte, 'registrarPagamento');
    await preencher('forma-recebimento', 'Pix');
    enviar();
    enviar();
    await harness.fixture.whenStable();
    expect(comando).toHaveBeenCalledTimes(1);
    expect(comando.mock.calls[0][0]).toEqual({
      vendaId: alvo.id,
      parcelaId: alvo.parcelas[0].id,
      data: fonte.referencia,
      forma: 'Pix',
    });
    expect(harness.routeNativeElement!.querySelector('dialog')).toBeNull();
    expect(fonte.resumo().totalEmAbertoCentavos).toBe(resumo.totalEmAbertoCentavos - 3334);
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(resumo.recebidoNoMesCentavos + 3334);
    expect(fonte.consultarVenda(alvo.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { totalPagoCentavos: 3334, saldoCentavos: 6666, quantidadePaga: 1 },
    });

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-acao-pagar]')!.click();
    await harness.fixture.whenStable();
    await preencher('data-recebimento', '2027-01-30');
    await preencher('forma-recebimento', 'Dinheiro');
    enviar();
    await harness.fixture.whenStable();
    expect(comando).toHaveBeenCalledTimes(2);
    expect(comando.mock.calls[1][0].parcelaId).toBe(alvo.parcelas[1].id);
    expect(comando.mock.calls[1][0].data).toBe('2027-01-30');

    harness.routeNativeElement!.querySelector<HTMLButtonElement>('[data-acao-pagar]')!.click();
    await harness.fixture.whenStable();
    await preencher('forma-recebimento', 'Pix');
    enviar();
    await harness.fixture.whenStable();
    expect(fonte.consultarVenda(alvo.id)).toMatchObject({
      tipo: 'sucesso',
      valor: { saldoCentavos: 0, quantidadePaga: 3, proximoVencimento: null, situacao: 'Quitada' },
    });
    expect(fonte.abertas().some((v) => v.id === alvo.id)).toBe(false);
    expect(fonte.quitadas().filter((v) => v.id === alvo.id)).toHaveLength(1);
    expect(harness.routeNativeElement!.querySelector('[data-acao-pagar]')).toBeNull();
    expect(fonte.resumo().recebidoNoMesCentavos).toBe(resumo.recebidoNoMesCentavos + 10000);
  });

  it.each(['resultado', 'excecao'])(
    'preserva modal/rascunho/estado e permite retry em %s',
    async (modo) => {
      const { harness, fonte, preencher, enviar } = await abrir();
      const antes = structuredClone(fonte.vendas());
      await preencher('data-recebimento', '2027-01-30');
      await preencher('forma-recebimento', 'Pix');
      const comando = vi.spyOn(fonte, 'registrarPagamento');
      if (modo === 'resultado')
        comando.mockReturnValueOnce({
          tipo: 'falha',
          codigo: 'teste',
          mensagem: 'Falha controlada de pagamento.',
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
      expect(pagina.querySelector<HTMLInputElement>('#data-recebimento')!.value).toBe('2027-01-30');
      expect(pagina.querySelector<HTMLSelectElement>('#forma-recebimento')!.value).toBe('Pix');
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

  it('rejeita alvo obsoleto sem avançar para a parcela seguinte', async () => {
    const { harness, fonte, alvo, preencher, enviar } = await abrir();
    await preencher('forma-recebimento', 'Pix');
    expect(
      fonte.registrarPagamento({
        vendaId: alvo.id,
        parcelaId: alvo.parcelas[0].id,
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
    expect(harness.routeNativeElement!.querySelector('[role="alert"]')!.textContent).toContain(
      'Selecione parcelas únicas',
    );
    expect(document.activeElement).toBe(
      harness.routeNativeElement!.querySelector<HTMLElement>('[role="alert"]'),
    );
    expect(fonte.vendas()).toEqual(antes);
  });

  it.each(['botao', 'cancel', 'close', 'desmonte'])(
    'fecha/descarta sem confirmar por %s',
    async (modo) => {
      const { harness, fonte, preencher } = await abrir();
      const antes = structuredClone(fonte.vendas());
      await preencher('forma-recebimento', 'Pix');
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
