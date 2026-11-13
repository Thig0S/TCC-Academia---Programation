import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Title } from '@angular/platform-browser';
import { routes } from './app.routes';

describe('Rotas da demonstração', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('redireciona a entrada para Visão Geral', async () => {
    const harness = await RouterTestingHarness.create('/');
    expect(TestBed.inject(Router).url).toBe('/visao-geral');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Visão Geral');
  });

  for (const [url, titulo] of [
    ['/visao-geral', 'Visão Geral'],
    ['/vendas', 'Vendas'],
    ['/vendas/quitadas', 'Vendas quitadas'],
    ['/relatorios', 'Relatórios'],
    ['/configuracoes', 'Configurações'],
    ['/inexistente', 'Página não encontrada'],
  ]) {
    it(`abre diretamente ${url} com título contextual`, async () => {
      const harness = await RouterTestingHarness.create(url);
      expect(harness.routeNativeElement?.querySelectorAll('h1').length).toBe(1);
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe(titulo);
      expect(TestBed.inject(Title).getTitle()).toBe(
        `${titulo} | Mercadão dos Óculos - Vendas em Aberto`,
      );
    });
  }

  it('oferece retorno da página não encontrada', async () => {
    const harness = await RouterTestingHarness.create('/nao-existe');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe(
      '/visao-geral',
    );
    await harness.navigateByUrl('/visao-geral');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('Visão Geral');
  });
});
