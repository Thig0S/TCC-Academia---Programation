import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';

@Component({
  selector: 'app-relatorios',
  imports: [Cabecalho],
  templateUrl: './relatorios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Relatorios {}
