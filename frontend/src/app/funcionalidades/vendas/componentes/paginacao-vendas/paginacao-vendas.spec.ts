import { TestBed } from '@angular/core/testing';
import { PaginacaoVendas } from './paginacao-vendas';

describe('PaginacaoVendas', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PaginacaoVendas] }));

  it.each([0, 1])('apresenta faixa sem navegação para %i página(s)', (totalPaginas) => {
    const fixture = TestBed.createComponent(PaginacaoVendas);
    fixture.componentRef.setInput('faixa', { inicio: 0, fim: 0, total: 0 });
    fixture.componentRef.setInput('paginaAtual', 1);
    fixture.componentRef.setInput('totalPaginas', totalPaginas);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[aria-label="Faixa de resultados"]').textContent,
    ).toContain('0 resultados');
  });

  it('identifica a página atual, limita extremos e emite a página acionada', () => {
    const fixture = TestBed.createComponent(PaginacaoVendas);
    fixture.componentRef.setInput('faixa', { inicio: 31, fim: 40, total: 80 });
    fixture.componentRef.setInput('paginaAtual', 4);
    fixture.componentRef.setInput('totalPaginas', 8);
    fixture.detectChanges();
    const componente = fixture.componentInstance;
    const emitir = vi.fn();
    componente.paginaAlterada.subscribe(emitir);

    expect(fixture.nativeElement.querySelector('nav')?.getAttribute('aria-label')).toBe(
      'Paginação de vendas',
    );
    expect(fixture.nativeElement.querySelector('[aria-current="page"]')?.textContent).toContain(
      '4',
    );
    expect(
      fixture.nativeElement.querySelectorAll(
        'button[aria-label^="Página "]:not([aria-label="Página anterior"])',
      ),
    ).toHaveLength(5);
    expect(fixture.nativeElement.querySelectorAll('span[aria-hidden="true"]')).toHaveLength(2);
    expect(
      fixture.nativeElement.querySelector('[aria-label="Faixa de resultados"]').textContent,
    ).toContain('31–40 de 80 vendas');

    (fixture.nativeElement.querySelector('[aria-label="Página 5"]') as HTMLButtonElement).click();
    expect(emitir).toHaveBeenCalledWith(5);
    (
      fixture.nativeElement.querySelector('[aria-label="Página anterior"]') as HTMLButtonElement
    ).focus();
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('[aria-label="Página anterior"]'),
    );
    (
      fixture.nativeElement.querySelector('[aria-label="Página anterior"]') as HTMLButtonElement
    ).click();
    expect(emitir).toHaveBeenLastCalledWith(3);
  });

  it('marca anterior e próxima como indisponíveis nos extremos', () => {
    const fixture = TestBed.createComponent(PaginacaoVendas);
    fixture.componentRef.setInput('faixa', { inicio: 1, fim: 11, total: 11 });
    fixture.componentRef.setInput('paginaAtual', 1);
    fixture.componentRef.setInput('totalPaginas', 2);
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('[aria-label="Página anterior"]')
        .getAttribute('aria-disabled'),
    ).toBe('true');
    expect(
      fixture.nativeElement
        .querySelector('[aria-label="Próxima página"]')
        .getAttribute('aria-disabled'),
    ).toBe('false');
  });
});
