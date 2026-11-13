import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';

describe('Conteúdo honesto da demonstração', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter(routes)] }));

  it('explica os quatro limites de Configurações sem controles fictícios', async () => {
    const harness = await RouterTestingHarness.create('/configuracoes');
    const pagina = harness.routeNativeElement!;
    for (const texto of [
      'Dados fictícios',
      'Estado apenas em memória',
      'Descarte ao recarregar',
      'Sem uso operacional',
      'não controla cobranças reais',
    ]) {
      expect(pagina.textContent).toContain(texto);
    }
    expect(pagina.querySelectorAll('form, input, select, textarea, button, a').length).toBe(0);
  });

  for (const rota of ['/visao-geral', '/vendas', '/vendas/quitadas', '/relatorios']) {
    it(`explica indisponibilidade em ${rota}, sem simular consulta vazia`, async () => {
      const harness = await RouterTestingHarness.create(rota);
      const pagina = harness.routeNativeElement!;
      expect(pagina.textContent).toContain('Conteúdo ainda não disponível');
      expect(pagina.textContent?.toLocaleLowerCase('pt-BR')).toContain(
        'nenhuma consulta foi realizada',
      );
      expect(pagina.querySelectorAll('form, input, select, textarea, button, table').length).toBe(
        0,
      );
      expect(pagina.textContent).not.toMatch(/R\$|\bCPF\b|\d/);
      for (const link of pagina.querySelectorAll('a')) {
        expect(['/vendas', '/vendas/quitadas']).toContain(link.getAttribute('href'));
      }
    });
  }
});
