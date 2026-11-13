import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';

@Component({
  selector: 'app-listar-vendas',
  imports: [Cabecalho, RouterLink],
  templateUrl: './listar-vendas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListarVendas {}
