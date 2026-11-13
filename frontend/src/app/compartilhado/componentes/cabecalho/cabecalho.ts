import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-cabecalho',
  templateUrl: './cabecalho.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Cabecalho {
  readonly titulo = input.required<string>();
}
