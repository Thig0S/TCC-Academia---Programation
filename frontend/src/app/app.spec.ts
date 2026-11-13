import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('Página técnica inicial', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
  });

  async function renderizar(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('identifica o produto pelo título principal', async () => {
    const pagina = await renderizar();
    expect(pagina.querySelector('h1')?.textContent).toBe('Mercadão dos Óculos - Vendas em Aberto');
  });

  it('mantém o aviso literal de demonstração', async () => {
    const pagina = await renderizar();
    expect(pagina.querySelector('[data-testid="aviso-demonstracao"]')?.textContent?.trim()).toBe(
      'Demonstração com dados fictícios. As alterações são perdidas ao recarregar.',
    );
  });

  it('explica o recorte sem oferecer fluxos comerciais ou login', async () => {
    const pagina = await renderizar();
    expect(pagina.textContent).toContain(
      'Esta é uma base técnica. Os fluxos comerciais ainda não estão disponíveis.',
    );
    expect(pagina.querySelectorAll('form, input, button, a').length).toBe(0);
  });
});
