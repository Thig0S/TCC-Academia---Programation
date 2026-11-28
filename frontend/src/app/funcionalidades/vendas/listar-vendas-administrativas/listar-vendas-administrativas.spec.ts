import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appConfig } from '../../../app.config';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';

describe('Coleções administrativas de vendas', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [...(appConfig.providers ?? [])] }));

  function sucesso<T>(resultado: { tipo: string; valor?: T; mensagem: string }): T {
    expect(resultado.tipo).toBe('sucesso');
    if (resultado.tipo !== 'sucesso' || resultado.valor === undefined)
      throw new Error(resultado.mensagem);
    return resultado.valor;
  }

  function urlPara(id: string): string {
    const router = TestBed.inject(Router);
    return router.serializeUrl(router.createUrlTree(['/vendas', id]));
  }

  it('apresenta estados vazios próprios para Inativas e Prejuízo', async () => {
    const harness = await RouterTestingHarness.create('/vendas/inativas');
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe('Vendas inativas');
    expect(harness.routeNativeElement?.textContent).toContain('Não há vendas inativas.');

    await harness.navigateByUrl('/vendas/prejuizo');
    expect(harness.routeNativeElement?.querySelector('h2')?.textContent).toBe('Vendas em Prejuízo');
    expect(harness.routeNativeElement?.textContent).toContain('Não há vendas em Prejuízo.');
  });

  it('mantém coleções exclusivas, busca local e navegação pelo ID opaco', async () => {
    const servico = TestBed.inject(ServicoDemonstracao);
    const ativa = servico.abertas();
    const inativa = sucesso(servico.alterarStatus({ vendaId: ativa[0].id, status: 'Inativo' }));
    const prejuizo = sucesso(servico.alterarStatus({ vendaId: ativa[1].id, status: 'Prejuízo' }));
    expect(servico.abertas().some((venda) => venda.id === inativa.id)).toBe(false);
    expect(servico.abertas().some((venda) => venda.id === prejuizo.id)).toBe(false);
    expect(servico.inativas().map((venda) => venda.id)).toEqual([inativa.id]);
    expect(servico.prejuizos().map((venda) => venda.id)).toEqual([prejuizo.id]);

    const harness = await RouterTestingHarness.create('/vendas/inativas');
    const pagina = () => harness.routeNativeElement!;
    expect(pagina().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina().querySelector('tbody')?.textContent).toContain(inativa.cliente.nome);
    expect(pagina().querySelector('tbody')?.textContent).not.toContain(prejuizo.cliente.nome);
    expect(pagina().querySelector('caption')?.textContent).toContain('Vendas inativas');
    const detalhe = TestBed.inject(Router).serializeUrl(
      TestBed.inject(Router).createUrlTree(['/vendas', inativa.id]),
    );
    expect(pagina().querySelector<HTMLAnchorElement>('tbody th a')?.getAttribute('href')).toBe(
      detalhe,
    );
    await harness.navigateByUrl(detalhe);
    expect(pagina().textContent).toContain(inativa.cliente.nome);
    expect(pagina().textContent).toContain('Inativo');

    await harness.navigateByUrl('/vendas/prejuizo');
    expect(pagina().querySelectorAll('tbody tr')).toHaveLength(1);
    expect(pagina().querySelector('tbody')?.textContent).toContain(prejuizo.cliente.nome);
    expect(pagina().querySelector('tbody')?.textContent).not.toContain(inativa.cliente.nome);
    expect(pagina().querySelector('caption')?.textContent).toContain('Prejuízo');
    const campo = pagina().querySelector<HTMLInputElement>('#busca-vendas-administrativas')!;
    campo.value = 'termo sem correspondência';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    await harness.fixture.whenStable();
    expect(pagina().querySelector('tbody')).toBeNull();
    expect(pagina().textContent).toContain('Nenhuma venda corresponde à pesquisa.');
    expect(servico.prejuizos().map((venda) => venda.id)).toEqual([prejuizo.id]);
  });
});
