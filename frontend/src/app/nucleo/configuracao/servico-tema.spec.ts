import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { ServicoTema } from './servico-tema';

describe('Tema em memória', () => {
  it('inicia escuro e alterna nas duas direções', () => {
    const servico = TestBed.inject(ServicoTema);
    expect(servico.tema()).toBe('dark');
    servico.alternar();
    expect(servico.tema()).toBe('light');
    servico.alternar();
    expect(servico.tema()).toBe('dark');
  });

  it('mantém uma instância compartilhada pelas páginas lazy', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const servico = TestBed.inject(ServicoTema);
    const harness = await RouterTestingHarness.create('/visao-geral');
    servico.alternar();
    for (const rota of [
      '/vendas',
      '/vendas/quitadas',
      '/relatorios',
      '/configuracoes',
      '/desconhecida',
    ]) {
      await harness.navigateByUrl(rota);
      expect(harness.routeDebugElement?.injector.get(ServicoTema)).toBe(servico);
      expect(servico.tema()).toBe('light');
      expect(TestBed.inject(Router).url).toBe(rota);
    }
  });
});
