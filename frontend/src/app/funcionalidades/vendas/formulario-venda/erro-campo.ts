import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ReadonlyFieldTree } from '@angular/forms/signals';

@Component({
  selector: 'app-erro-campo',
  template: `@if (campo()().touched()) {
    @for (erro of campo()().errors(); track $index) {
      <p class="text-danger small mb-1">{{ erro.message }}</p>
    }
  }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErroCampo {
  readonly campo = input.required<ReadonlyFieldTree<string>>();
}
