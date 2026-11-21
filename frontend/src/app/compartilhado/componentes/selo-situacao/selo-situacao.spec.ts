import { TestBed } from '@angular/core/testing';
import { SeloSituacao } from './selo-situacao';

describe('SeloSituacao', () => {
  for (const [situacao, cor] of [
    ['Quitada', 'success'],
    ['Paga', 'success'],
    ['Atrasada', 'danger'],
    ['Atrasado', 'danger'],
    ['Próximos dias', 'warning'],
    ['Em aberto', 'neutral'],
    ['Aberto', 'neutral'],
  ] as const) {
    it(`preserva o rótulo ${situacao} com par semântico suave`, async () => {
      const fixture = TestBed.createComponent(SeloSituacao);
      fixture.componentRef.setInput('situacao', situacao);
      await fixture.whenStable();
      const selo = fixture.nativeElement.querySelector('span') as HTMLSpanElement;
      expect(selo.textContent).toContain(situacao);
      expect(selo.classList.contains(`bg-${cor}-badge`)).toBe(true);
      expect(selo.classList.contains(`text-${cor}-badge-text`)).toBe(true);
      expect(selo.classList.contains('text-white')).toBe(false);
    });
  }
});
