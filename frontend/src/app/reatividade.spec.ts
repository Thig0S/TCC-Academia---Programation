import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// Host exclusivo dos testes: a página técnica não precisa de estado mutável.
@Component({
  template: '<p>{{ mensagem() }}</p>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HospedeiroReativo {
  readonly mensagem = signal('Inicial');
}

describe('Reatividade da infraestrutura', () => {
  it('recalcula uma projeção ao atualizar um signal, sem fixture', () => {
    const mensagem = signal('Inicial');
    const projecao = computed(() => mensagem().toUpperCase());

    expect(projecao()).toBe('INICIAL');
    mensagem.set('Atualizada');
    expect(projecao()).toBe('ATUALIZADA');
  });

  it('atualiza o DOM por notificação de signal em fixture zoneless', async () => {
    await TestBed.configureTestingModule({ imports: [HospedeiroReativo] }).compileComponents();
    const fixture = TestBed.createComponent(HospedeiroReativo);
    const pagina = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    expect(pagina.textContent).toBe('Inicial');

    fixture.componentInstance.mensagem.set('Atualizada');
    await fixture.whenStable();
    expect(pagina.textContent).toBe('Atualizada');
    expect('Zone' in globalThis).toBe(false);
  });
});
