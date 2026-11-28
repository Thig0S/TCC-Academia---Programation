import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';
import { FONTE_VENDAS } from '../../nucleo/dados/fonte-vendas';
import { MODO_APLICACAO } from '../../nucleo/configuracao/modo-aplicacao';
import { formatarDataCivil } from '../vendas/data-civil';

@Component({
  selector: 'app-configuracoes',
  imports: [Cabecalho],
  templateUrl: './configuracoes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Configuracoes {
  protected readonly modo = inject(MODO_APLICACAO);
  protected readonly referencia = formatarDataCivil(inject(FONTE_VENDAS).referencia);
}
