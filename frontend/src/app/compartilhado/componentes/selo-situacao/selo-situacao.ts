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
        return 'badge text-bg-success';
      case 'Atrasada':
      case 'Atrasado':
        return 'badge text-bg-danger';
      case 'Próximos dias':
        return 'badge text-bg-warning';
      default:
        return 'badge text-bg-secondary';
    }
  }
}
