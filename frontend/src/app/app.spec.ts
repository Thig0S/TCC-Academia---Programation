import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('Estrutura navegável', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
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
    expect(pagina.querySelector('img')?.getAttribute('src')).toBe('/imgs/logo-franquia.jpg');
    expect(pagina.querySelector('img')?.alt).toBe('');
  });

  it('mantém o aviso literal e perfil claramente estático', async () => {
    const { pagina } = await renderizar();
    expect(pagina.querySelector('[data-testid="aviso-demonstracao"]')?.textContent?.trim()).toBe(
      'Demonstração com dados fictícios. As alterações são perdidas ao recarregar.',
    );
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

  it('alterna o tema pelo botão com indicação textual e programática', async () => {
    const { fixture, pagina } = await renderizar();
    const botao = pagina.querySelector<HTMLButtonElement>('button')!;
    expect(pagina.getAttribute('data-bs-theme')).toBe('dark');
    expect(botao.getAttribute('aria-label')).toBe('Tema escuro');
    expect(botao.getAttribute('aria-pressed')).toBe('true');
    botao.click();
    await fixture.whenStable();
    expect(pagina.getAttribute('data-bs-theme')).toBe('light');
    expect(botao.getAttribute('aria-pressed')).toBe('false');
    expect(botao.textContent).toContain('Tema ativo: Claro');
  });
});
