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
  readonly visualPiloto = input(false);

  protected classe(): string {
    switch (this.situacao()) {
      case 'Quitada':
      case 'Paga':
        return `inline-flex w-fit items-center whitespace-nowrap rounded-full ${this.visualPiloto() ? 'px-3 py-0' : 'px-2.5 py-0'} text-sm leading-4 font-semibold bg-success-badge text-success-badge-text`;
      case 'Atrasada':
      case 'Atrasado':
        return `inline-flex w-fit items-center whitespace-nowrap rounded-full ${this.visualPiloto() ? 'px-3 py-0' : 'px-2.5 py-0'} text-sm leading-4 font-semibold bg-danger-badge text-danger-badge-text`;
      case 'Próximos dias':
        return `inline-flex w-fit items-center whitespace-nowrap rounded-full ${this.visualPiloto() ? 'px-3 py-0' : 'px-2.5 py-0'} text-sm leading-4 font-semibold bg-warning-badge text-warning-badge-text`;
      default:
        return `inline-flex w-fit items-center whitespace-nowrap rounded-full ${this.visualPiloto() ? 'px-3 py-0' : 'px-2.5 py-0'} text-sm leading-4 font-semibold bg-neutral-badge text-neutral-badge-text`;
    }
  }
}
