import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';

@Component({
  selector: 'app-configuracoes',
  imports: [Cabecalho],
  templateUrl: './configuracoes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Configuracoes {}
