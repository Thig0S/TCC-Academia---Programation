import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';

@Component({
  selector: 'app-visao-geral',
  imports: [Cabecalho],
  templateUrl: './visao-geral.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaoGeral {}
