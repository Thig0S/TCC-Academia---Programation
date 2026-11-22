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
        return 'inline-flex w-fit items-center whitespace-nowrap rounded-full bg-success-badge px-2.5 py-0 text-sm leading-4 font-semibold text-success-badge-text';
      case 'Atrasada':
      case 'Atrasado':
        return 'inline-flex w-fit items-center whitespace-nowrap rounded-full bg-danger-badge px-2.5 py-0 text-sm leading-4 font-semibold text-danger-badge-text';
      case 'Próximos dias':
        return 'inline-flex w-fit items-center whitespace-nowrap rounded-full bg-warning-badge px-2.5 py-0 text-sm leading-4 font-semibold text-warning-badge-text';
      default:
        return 'inline-flex w-fit items-center whitespace-nowrap rounded-full bg-neutral-badge px-2.5 py-0 text-sm leading-4 font-semibold text-neutral-badge-text';
    }
  }
}
