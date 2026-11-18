import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Modal {
  readonly titulo = input.required<string>();
  /** O consumidor agenda restauração pós-render para acionador ou fallback persistente. */
  readonly restaurarFoco = input.required<() => void>();
  readonly fechado = output<void>();
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private destruido = false;
  private encerrado = false;

  constructor() {
    afterNextRender(() => {
      this.dialog().nativeElement.showModal();
      this.dialog().nativeElement.querySelector<HTMLElement>('[data-foco-inicial]')?.focus();
    });
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      const dialog = this.dialog().nativeElement;
      if (dialog.open) dialog.close();
    });
  }

  fechar(): void {
    this.dialog().nativeElement.close();
  }
  protected conterFoco(evento: KeyboardEvent): void {
    if (evento.key !== 'Tab') return;
    const dialog = this.dialog().nativeElement;
    const controles = [
      ...dialog.querySelectorAll<HTMLElement>(
        'button, a[href], input, select, textarea, [tabindex]',
      ),
    ].filter(
      (elemento) =>
        elemento.tabIndex >= 0 &&
        !elemento.matches(':disabled') &&
        elemento.getClientRects().length > 0,
    );
    const primeiro = controles[0];
    const ultimo = controles.at(-1);
    const ativo = dialog.ownerDocument.activeElement;
    if (!primeiro || !ultimo) {
      evento.preventDefault();
      return;
    }
    if (
      (evento.shiftKey && ativo === primeiro) ||
      (!evento.shiftKey && ativo === ultimo) ||
      !dialog.contains(ativo)
    ) {
      evento.preventDefault();
      (evento.shiftKey ? ultimo : primeiro).focus();
    }
  }
  protected cancelar(evento: Event): void {
    evento.preventDefault();
    this.fechar();
  }
  protected aoFechar(): void {
    if (this.destruido || this.encerrado) return;
    this.encerrado = true;
    this.fechado.emit();
    this.restaurarFoco()();
  }
}
