import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { ComandoCadastro } from '../../funcionalidades/vendas/venda.modelos';
import { formatarDinheiro } from '../../funcionalidades/vendas/dinheiro';
import { REFERENCIA_DEMONSTRACAO } from './referencia-demonstracao';
import { ServicoDemonstracao } from './servico-demonstracao';

const cadastro: ComandoCadastro = {
  cliente: { nome: 'Cliente DEMO integração', cpf: '90000000175', telefone: '00900000001' },
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

  it('reflete edição nas listas, busca e detalhe com uma publicação e sem alterar resumos', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REFERENCIA_DEMONSTRACAO, useValue: '2027-01-31' },
      ],
    });
    const fonte = TestBed.inject(ServicoDemonstracao);
    const observador = TestBed.createComponent(ObservadorDemonstracao);
    await observador.whenStable();
    const harness = await RouterTestingHarness.create('/vendas');
    const alvo = fonte.abertas()[0];
    const resumo = fonte.resumo();
    const componente = observador.componentInstance;
    const chamadas = componente.observar.mock.calls.length;
    const editar = (nome: string, cpf = alvo.cliente.cpf) =>
      fonte.editarCliente({ vendaId: alvo.id, cliente: { ...alvo.cliente, nome, cpf } });
    expect(editar('DEMO nome atualizado').tipo).toBe('sucesso');
    await observador.whenStable();
    await harness.fixture.whenStable();
    expect(componente.observar).toHaveBeenCalledTimes(chamadas + 1);
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain(
      'DEMO nome atualizado',
    );
    expect(harness.routeNativeElement?.textContent).not.toContain(alvo.cliente.nome);
    const campo = harness.routeNativeElement!.querySelector<HTMLInputElement>('#busca-vendas')!;
    campo.value = 'nome atualizado';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(editar('DEMO outra grafia').tipo).toBe('sucesso');
    await observador.whenStable();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma venda corresponde');
    const router = TestBed.inject(Router);
    await harness.navigateByUrl(router.serializeUrl(router.createUrlTree(['/vendas', alvo.id])));
    expect(harness.routeNativeElement?.textContent).toContain('DEMO outra grafia');
    expect(editar('DEMO detalhe reativo').tipo).toBe('sucesso');
    await observador.whenStable();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('DEMO detalhe reativo');
    const antesRejeicao = componente.observar.mock.calls.length;
    const antes = fonte.vendas();
    expect(editar('Inválido', 'CPF-DEMO').tipo).toBe('validacao');
    expect(fonte.editarCliente({ vendaId: 'ausente', cliente: alvo.cliente }).tipo).toBe(
      'inexistencia',
    );
    await observador.whenStable();
    expect(componente.observar).toHaveBeenCalledTimes(antesRejeicao);
    expect(fonte.vendas()).toBe(antes);
    expect(fonte.resumo()).toEqual(resumo);
    const quitada = fonte.quitadas()[0];
    await harness.navigateByUrl('/vendas/quitadas');
    expect(
      fonte.editarCliente({
        vendaId: quitada.id,
        cliente: { ...quitada.cliente, nome: 'DEMO quitada corrigida' },
      }).tipo,
    ).toBe('sucesso');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain(
      'DEMO quitada corrigida',
    );
    const snapshot = fonte.vendas();
    for (const rota of ['/relatorios', '/configuracoes', '/visao-geral', '/vendas']) {
      await harness.navigateByUrl(rota);
      expect(harness.routeDebugElement?.injector.get(ServicoDemonstracao)).toBe(fonte);
      expect(fonte.vendas()).toBe(snapshot);
      expect(fonte.resumo()).toEqual(resumo);
    }
  });

  it('mantém listas, cartões e detalhe na mesma fonte reativa; consulta e navegação não mutam', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: REFERENCIA_DEMONSTRACAO, useValue: '2027-01-31' },
      ],
    });
    const fonte = TestBed.inject(ServicoDemonstracao);
    const harness = await RouterTestingHarness.create('/vendas');
    const antes = fonte.vendas();
    const resumoAntes = fonte.resumo();

    const criado = fonte.cadastrarVenda(cadastro);
    expect(criado.tipo).toBe('sucesso');
    if (criado.tipo !== 'sucesso') throw new Error(criado.mensagem);
    await harness.fixture.whenStable();
    const snapshot = fonte.vendas();
    const resumoAberta = fonte.resumo();
    expect(snapshot).not.toBe(antes);
    expect(resumoAberta.vendasCadastradas).toBe(resumoAntes.vendasCadastradas + 1);
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain(
      cadastro.cliente.nome,
    );
    expect(
      harness.routeNativeElement?.querySelector('[aria-label="Resumo global de vendas"]'),
    ).toBeNull();
    expect(harness.routeNativeElement?.textContent).not.toContain('Total em aberto');
    expect(fonte.resumo()).toEqual(resumoAberta);

    const campo = harness.routeNativeElement!.querySelector<HTMLInputElement>('#busca-vendas')!;
    campo.value = 'termo sem correspondência';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Nenhuma venda corresponde');
    expect(fonte.vendas()).toBe(snapshot);
    [...harness.routeNativeElement!.querySelectorAll('button')]
      .find((botao) => botao.textContent?.includes('Limpar critérios'))!
      .click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain(
      cadastro.cliente.nome,
    );
    expect(fonte.vendas()).toBe(snapshot);

    const router = TestBed.inject(Router);
    const detalheUrl = router.serializeUrl(router.createUrlTree(['/vendas', criado.valor.id]));
    await harness.navigateByUrl(detalheUrl);
    expect(harness.routeDebugElement?.injector.get(ServicoDemonstracao)).toBe(fonte);
    expect(harness.routeNativeElement?.textContent).toContain(cadastro.cliente.nome);
    expect(fonte.vendas()).toBe(snapshot);

    const resultadoPagamento = fonte.registrarPagamento({
      vendaId: criado.valor.id,
      parcelaIds: criado.valor.parcelas.map((parcela) => parcela.id),
      valorCentavos: cadastro.valorTotalCentavos,
      data: '2027-01-31',
      forma: 'Pix',
    });
    expect(resultadoPagamento.tipo).toBe('sucesso');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.textContent).toContain('Quitada');
    expect(harness.routeNativeElement?.querySelectorAll('app-selo-situacao')).toHaveLength(
      criado.valor.parcelas.length + 1,
    );

    const resumoQuitada = fonte.resumo();
    await harness.navigateByUrl('/vendas');
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).not.toContain(
      cadastro.cliente.nome,
    );
    expect(
      harness.routeNativeElement?.querySelector('[aria-label="Resumo global de vendas"]'),
    ).toBeNull();
    expect(fonte.resumo()).toEqual(resumoQuitada);
    await harness.navigateByUrl('/vendas/quitadas');
    expect(harness.routeNativeElement?.querySelector('tbody')?.textContent).toContain(
      cadastro.cliente.nome,
    );
    expect(harness.routeDebugElement?.injector.get(ServicoDemonstracao)).toBe(fonte);
  });
});
