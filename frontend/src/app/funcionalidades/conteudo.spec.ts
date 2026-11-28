import { TestBed } from '@angular/core/testing';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from '../app.config';

describe('Conteúdo honesto da demonstração', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...(appConfig.providers ?? [])] }));

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

  it('apresenta análises do mês e posições atuais completas em Relatórios', async () => {
    const harness = await RouterTestingHarness.create('/relatorios');
    const pagina = harness.routeNativeElement!;
    expect(pagina.textContent).toContain('Movimentação do mês');
    expect(pagina.textContent).toContain('Recebimentos no mês');
    expect(pagina.textContent).toContain('Vendas do mês');
    expect(pagina.textContent).toContain('Parcelas em aberto');
    expect(pagina.textContent).toContain('Parcelas vencidas');
    expect(pagina.querySelectorAll('table')).toHaveLength(5);
    expect(pagina.querySelectorAll('details')).toHaveLength(5);
    expect(
      [...pagina.querySelectorAll<HTMLDetailsElement>('details')].every((item) => !item.open),
    ).toBe(true);
    expect(pagina.querySelectorAll('button')).toHaveLength(2);
    expect(pagina.querySelectorAll('select')).toHaveLength(1);
    expect(pagina.querySelectorAll('input[type="number"]')).toHaveLength(1);
    expect(pagina.querySelectorAll('canvas, form, textarea').length).toBe(0);
    expect(pagina.querySelector('[aria-label="Indicadores financeiros globais"]')).toBeNull();
    expect(pagina.textContent).not.toContain('Conteúdo ainda não disponível');
  });
});
