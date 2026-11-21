import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SituacaoParcela } from '../../../funcionalidades/parcelas/parcela.modelos';
import { SituacaoVenda } from '../../../funcionalidades/vendas/venda.modelos';

type Situacao = SituacaoVenda | SituacaoParcela;

@Component({
  selector: 'app-selo-situacao',
  template: '<span [class]="classe()">{{ situacao() }}</span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeloSituacao {
  readonly situacao = input.required<Situacao>();

  protected classe(): string {
    switch (this.situacao()) {
      case 'Quitada':
      case 'Paga':
        return 'inline-flex w-fit items-center whitespace-nowrap rounded-md bg-success-badge px-2 py-0.5 text-xs leading-3 font-semibold text-success-badge-text';
      case 'Atrasada':
      case 'Atrasado':
        return 'inline-flex w-fit items-center whitespace-nowrap rounded-md bg-danger-badge px-2 py-0.5 text-xs leading-3 font-semibold text-danger-badge-text';
      case 'Próximos dias':
        return 'inline-flex w-fit items-center whitespace-nowrap rounded-md bg-warning-badge px-2 py-0.5 text-xs leading-3 font-semibold text-warning-badge-text';
      default:
        return 'inline-flex w-fit items-center whitespace-nowrap rounded-md bg-neutral-badge px-2 py-0.5 text-xs leading-3 font-semibold text-neutral-badge-text';
    }
  }
}
