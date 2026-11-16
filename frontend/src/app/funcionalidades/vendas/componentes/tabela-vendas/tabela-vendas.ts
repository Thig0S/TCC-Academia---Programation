import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeloSituacao } from '../../../../compartilhado/componentes/selo-situacao/selo-situacao';
import { formatarDataCivil } from '../../data-civil';
import { formatarDinheiro } from '../../dinheiro';
import { ProjecaoVenda } from '../../venda.calculos';

@Component({
  selector: 'app-tabela-vendas',
  imports: [RouterLink, SeloSituacao],
  templateUrl: './tabela-vendas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabelaVendas {
  readonly vendas = input.required<readonly ProjecaoVenda[]>();
  readonly legenda = input.required<string>();
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly formatarDinheiro = formatarDinheiro;
}
