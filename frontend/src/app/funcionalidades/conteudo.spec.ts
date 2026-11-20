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

  it('apresenta indicadores e resumos financeiros reais em Visão Geral', async () => {
    const harness = await RouterTestingHarness.create('/visao-geral');
    const pagina = harness.routeNativeElement!;
    expect(pagina.textContent).toContain('Indicadores financeiros globais');
    expect(pagina.textContent).toContain('Total em aberto');
    expect(pagina.textContent).toContain('Recebimentos do mês');
    expect(pagina.textContent).toContain('Vendas recentes');
    expect(pagina.textContent).toContain('Parcelas próximas');
    expect(pagina.textContent).toContain('Parcelas atrasadas');
    expect(pagina.textContent).not.toContain('Conteúdo ainda não disponível');
    expect(pagina.querySelectorAll('form, input, select, textarea, button, table').length).toBe(0);
  });

  it('mantém Relatórios explicitamente indisponível até sua entrega', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    expect(pagina.textContent).toContain('Conteúdo ainda não disponível');
    expect(pagina.textContent?.toLocaleLowerCase('pt-BR')).toContain(
      'nenhuma consulta foi realizada',
    );
    expect(pagina.querySelectorAll('form, input, select, textarea, button, table').length).toBe(0);
    expect(pagina.textContent).not.toMatch(/R\$|\bCPF\b|\d/);
    for (const link of pagina.querySelectorAll('a')) {
      expect(['/vendas', '/vendas/quitadas']).toContain(link.getAttribute('href'));
    }
  });
});
