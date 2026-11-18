import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldTree, FormField } from '@angular/forms/signals';
import { RascunhoCliente } from './rascunhos';
import { ErroCampo } from './erro-campo';

@Component({
  selector: 'app-identificacao-cliente',
  imports: [FormField, ErroCampo],
  templateUrl: './identificacao-cliente.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IdentificacaoCliente {
  readonly campos = input.required<Pick<FieldTree<RascunhoCliente>, keyof RascunhoCliente>>();
}
