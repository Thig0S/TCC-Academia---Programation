import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { ComandoCadastro } from '../../funcionalidades/vendas/venda.modelos';
import { REFERENCIA_DEMONSTRACAO } from './referencia-demonstracao';
import { ServicoDemonstracao } from './servico-demonstracao';

const cadastro: ComandoCadastro = {
  cliente: { nome: 'Cliente DEMO integração', cpf: 'CPF-DEMO', telefone: 'TEL-DEMO' },
  dataVenda: '2027-01-31',
  valorTotalCentavos: 60000,
  quantidadeParcelas: 3,
  entrada: null,
};

@Component({
  template: '<p>{{ leitura() }}</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ObservadorDemonstracao {
  readonly fonte = inject(ServicoDemonstracao);
  readonly observar = vi.fn(
    () =>
      `${this.fonte.vendas().length}/${this.fonte.resumo().totalEmAbertoCentavos}/${this.fonte.quitadas().length}`,
  );
  readonly leitura = computed(this.observar);
}

describe('Inicialização e integração da sessão', () => {
  afterEach(() => vi.useRealTimers());

  it('App captura o dia local na abertura, mantém após meia-noite e renova em nova aplicação', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2027, 0, 31, 23, 59));
    const app = TestBed.createComponent(App);
    vi.setSystemTime(new Date(2027, 1, 1, 0, 1));
    // Primeiro acesso de teste após a meia-noite: App já instanciou a fonte.
    const fonte = TestBed.inject(ServicoDemonstracao);
    expect(fonte.referencia).toBe('2027-01-31');
    const r = fonte.cadastrarVenda(cadastro);
    expect(r.tipo).toBe('sucesso');
    vi.useRealTimers();
    await app.whenStable();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2027, 1, 1, 0, 1));
    const novaApp = TestBed.createComponent(App);
    const novaFonte = TestBed.inject(ServicoDemonstracao);
    expect(novaFonte).not.toBe(fonte);
    expect(novaFonte.referencia).toBe('2027-02-01');
    expect(novaFonte.vendas()).toHaveLength(12);
    if (r.tipo === 'sucesso')
      expect(novaFonte.consultarVenda(r.valor.id).tipo).toBe('inexistencia');
    vi.useRealTimers();
    await novaApp.whenStable();
  });

  it('preserva cadastro, lote e mesma fonte ao navegar por todos os destinos', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REFERENCIA_DEMONSTRACAO, useValue: '2027-01-31' },
      ],
    });
    const fonte = TestBed.inject(ServicoDemonstracao);
    const harness = await RouterTestingHarness.create('/visao-geral');
    const r = fonte.cadastrarVenda(cadastro);
    expect(r.tipo).toBe('sucesso');
    if (r.tipo !== 'sucesso') throw new Error(r.mensagem);
    expect(
      fonte.registrarPagamento({
        vendaId: r.valor.id,
        parcelaIds: r.valor.parcelas.map((p) => p.id),
        valorCentavos: 60000,
        data: '2027-01-31',
        forma: 'Pix',
      }).tipo,
    ).toBe('sucesso');
    const snapshot = fonte.vendas();
    for (const rota of [
      '/vendas',
      '/vendas/quitadas',
      '/relatorios',
      '/configuracoes',
      '/desconhecida',
      '/visao-geral',
    ]) {
      await harness.navigateByUrl(rota);
      expect(harness.routeDebugElement?.injector.get(ServicoDemonstracao)).toBe(fonte);
      expect(fonte.referencia).toBe('2027-01-31');
      expect(fonte.vendas()).toBe(snapshot);
      expect(fonte.quitadas().some((v) => v.id === r.valor.id)).toBe(true);
    }
  });

  it('host exclusivo observa uma atualização coerente por comando aceito sem detecção forçada', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: REFERENCIA_DEMONSTRACAO, useValue: '2027-01-31' }],
    });
    const fixture = TestBed.createComponent(ObservadorDemonstracao);
    await fixture.whenStable();
    const host = fixture.componentInstance;
    const base = host.fonte.resumo().totalEmAbertoCentavos;
    const quitadas = host.fonte.quitadas().length;
    expect(host.observar).toHaveBeenCalledTimes(1);
    const r = host.fonte.cadastrarVenda(cadastro);
    expect(r.tipo).toBe('sucesso');
    if (r.tipo !== 'sucesso') throw new Error(r.mensagem);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toBe(`13/${base + 60000}/${quitadas}`);
    expect(host.observar).toHaveBeenCalledTimes(2);
    const comando = {
      vendaId: r.valor.id,
      parcelaIds: r.valor.parcelas.map((p) => p.id),
      valorCentavos: 60000,
      data: '2027-01-31',
      forma: 'Pix',
    };
    expect(host.fonte.registrarPagamento(comando).tipo).toBe('sucesso');
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toBe(`13/${base}/${quitadas + 1}`);
    expect(host.observar).toHaveBeenCalledTimes(3);
    expect(host.fonte.registrarPagamento(comando).tipo).toBe('inelegibilidade');
    await fixture.whenStable();
    expect(host.observar).toHaveBeenCalledTimes(3);
  });
});
