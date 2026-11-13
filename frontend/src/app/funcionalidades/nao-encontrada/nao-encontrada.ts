import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';

@Component({
  selector: 'app-nao-encontrada',
  imports: [Cabecalho, RouterLink],
  templateUrl: './nao-encontrada.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NaoEncontrada {}
