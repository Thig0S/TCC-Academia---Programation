import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { App } from './app';
import { appConfig } from './app.config';
import { ContextoConfirmacao, ControleConfirmacoes } from './nucleo/dados/controle-confirmacoes';
import { FONTE_VENDAS } from './nucleo/dados/fonte-vendas';

describe('Estrutura navegável', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [...(appConfig.providers ?? [])],
    }).compileComponents();
  });

  async function renderizar(url = '/visao-geral') {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
    return { fixture, pagina: fixture.nativeElement as HTMLElement };
  }

  it('mantém identidade, logo local e título específico sem duplicação acessível', async () => {
    const { pagina } = await renderizar();
    expect(pagina.textContent).toContain('Mercadão dos Óculos - Vendas em Aberto');
    expect(pagina.querySelector('h1')?.textContent).toBe('Visão Geral');
    expect(pagina.querySelectorAll('h1').length).toBe(1);
    const caminhoLogo = pagina.querySelector('img')?.getAttribute('src');
    expect(caminhoLogo).toBe('imgs/logo-franquia.jpg');
    expect(
      new URL(caminhoLogo!, 'https://exemplo.github.io/TCC-Academia---Programation/').pathname,
    ).toBe('/TCC-Academia---Programation/imgs/logo-franquia.jpg');
    expect(pagina.querySelector('img')?.alt).toBe('');
  });

  it('não exibe aviso global e mantém perfil claramente estático', async () => {
    const { pagina } = await renderizar();
    expect(pagina.querySelector('[data-testid="aviso-demonstracao"]')).toBeNull();
    expect(pagina.textContent).toContain('Perfil estático · sem autenticação');
    expect(pagina.querySelectorAll('form, input').length).toBe(0);
    expect(pagina.querySelectorAll('nav svg[aria-hidden="true"]').length).toBe(4);
  });

  it('marca somente Quitadas como página atual e mantém Vendas visualmente ativo', async () => {
    const { pagina } = await renderizar('/vendas/quitadas');
    expect(pagina.querySelectorAll('[aria-current="page"]').length).toBe(1);
    expect(pagina.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('Quitadas');
    expect(pagina.querySelector('.modulo-ativo > a')?.textContent).toContain('Vendas');
  });

  it.each([
    ['/vendas/inativas', 'Inativas'],
    ['/vendas/prejuizo', 'Prejuízo'],
  ])('fornece acesso lateral direto à coleção %s', async (rota, nome) => {
    const { pagina } = await renderizar(rota);
    const atual = pagina.querySelector('app-barra-navegacao [aria-current="page"]');
    expect(atual?.textContent?.trim()).toBe(nome);
    expect(pagina.querySelector('.modulo-ativo > a')?.textContent).toContain('Vendas');
  });

  it('alterna o tema pelo botão com indicação textual e programática', async () => {
    const { fixture, pagina } = await renderizar();
    const botao = pagina.querySelector<HTMLButtonElement>('button')!;
    expect(pagina.getAttribute('data-tema')).toBe('dark');
    expect(botao.getAttribute('aria-label')).toBe('Tema escuro');
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    botao.click();
    await fixture.whenStable();
    expect(pagina.getAttribute('data-tema')).toBe('light');
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(botao.textContent).toContain('Tema ativo: Claro');
  });

  it('mantém o alerta e o rascunho em memória ao navegar entre funcionalidades da aba', async () => {
    const { fixture, pagina } = await renderizar('/vendas/nova');
    const contexto: ContextoConfirmacao = {
      operacao: 'baixa',
      alvo: { tipo: 'detalhe', vendaId: 'venda/opaca' },
      referencia: TestBed.inject(FONTE_VENDAS).referencia,
      revisaoEsperada: '17',
      rascunho: { valorCentavos: 10000, observacao: 'rascunho preservado' },
    };
    const confirmacoes = TestBed.inject(ControleConfirmacoes);

    await confirmacoes
      .confirmar(contexto, () => throwError(() => new HttpErrorResponse({ status: 0 })))
      .catch(() => undefined);
    fixture.detectChanges();

    expect(pagina.querySelector<HTMLButtonElement>('form button[type="submit"]')?.disabled).toBe(
      true,
    );

    for (const destino of [
      '/vendas',
      '/vendas/quitadas',
      '/vendas/abc/editar',
      '/vendas/abc',
      '/relatorios',
      '/configuracoes',
    ]) {
      await TestBed.inject(Router).navigateByUrl(destino);
      await fixture.whenStable();
      fixture.detectChanges();
      expect(pagina.querySelector('[data-testid="aviso-confirmacao-incerta"]')).not.toBeNull();
      expect(confirmacoes.estado()).toMatchObject({
        tipo: 'incerto',
        contexto: { operacao: 'baixa', rascunho: contexto.rascunho },
      });
    }
  });
});
