import { TestBed } from '@angular/core/testing';
import { FONTE_VENDAS, FonteVendas } from '../../nucleo/dados/fonte-vendas';
import { MODO_APLICACAO, ModoAplicacao } from '../../nucleo/configuracao/modo-aplicacao';
import { Configuracoes } from './configuracoes';

async function renderizar(modo: ModoAplicacao): Promise<HTMLElement> {
  const fonte = { referencia: '2027-01-31' } as FonteVendas;
  await TestBed.configureTestingModule({
    imports: [Configuracoes],
    providers: [
      { provide: MODO_APLICACAO, useValue: modo },
      { provide: FONTE_VENDAS, useValue: fonte },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(Configuracoes);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Configurações por modo', () => {
  it('explica descarte, tema e referência fixa no modo demonstrativo', async () => {
    const pagina = await renderizar('demonstrativo');
    const texto = pagina.textContent ?? '';

    expect(texto).toContain('Limites da demonstração');
    expect(texto).toContain('Estado apenas em memória');
    expect(texto).toContain('Alterações demonstrativas são descartadas ao recarregar');
    expect(texto).toContain('referência é 31/01/2027 nesta abertura e fixa durante a sessão');
    expect(texto).toContain('o tema volta ao escuro ao reabrir');
    expect(pagina.querySelectorAll('dl > div')).toHaveLength(4);
    expect(pagina.querySelectorAll('form, input, select, textarea, button, a')).toHaveLength(0);
  });

  it('explica persistência sintética, referência renovada e conferência no modo local', async () => {
    const pagina = await renderizar('local');
    const texto = pagina.textContent ?? '';

    expect(texto).toContain('Limites do modo local');
    expect(texto).toContain('Negócios persistidos localmente');
    expect(texto).toContain('SQLite local');
    expect(texto).toContain('A preferência de tema existe somente em memória');
    expect(texto).toContain('Recarregar recupera os negócios do mesmo banco local');
    expect(texto).toContain('renovada ao recarregar');
    expect(texto).toContain('o tema volta ao escuro');
    expect(texto).toContain('não a repita imediatamente');
    expect(texto).toContain('conclua a conferência explícita');
    expect(pagina.querySelectorAll('dl > div')).toHaveLength(4);
    expect(pagina.querySelectorAll('form, input, select, textarea, button, a')).toHaveLength(0);
  });
});
