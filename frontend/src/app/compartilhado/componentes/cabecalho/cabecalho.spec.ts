import { TestBed } from '@angular/core/testing';
import { Cabecalho } from './cabecalho';

describe('Cabecalho', () => {
  it('mantém título semântico e assinatura com destaque de marca', async () => {
    const fixture = TestBed.createComponent(Cabecalho);
    fixture.componentRef.setInput('titulo', 'Vendas');
    fixture.componentRef.setInput('compacto', true);
    await fixture.whenStable();

    const assinatura = fixture.nativeElement.querySelector('p') as HTMLParagraphElement;
    const titulo = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement;
    expect(assinatura.textContent).toContain('Vendas em Aberto · Demonstração');
    expect(assinatura.classList.contains('text-brand')).toBe(true);
    expect(titulo.textContent).toBe('Vendas');
    expect(titulo.classList.contains('text-2xl')).toBe(true);
    expect(titulo.tabIndex).toBe(-1);
  });
});
