import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';
import { formatarDataCivil, limitesDoMes } from '../vendas/data-civil';
import { formatarDinheiro } from '../vendas/dinheiro';
import {
  selecionarParcelasAtrasadas,
  selecionarParcelasProximas,
  selecionarVendasRecentes,
} from './visao-geral.calculos';

@Component({
  selector: 'app-visao-geral',
  imports: [Cabecalho, RouterLink],
  templateUrl: './visao-geral.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisaoGeral {
  private readonly servico = inject(ServicoDemonstracao);
  protected readonly referencia = this.servico.referencia;
  protected readonly limitesMes = limitesDoMes(this.referencia);
  protected readonly resumo = this.servico.resumo;
  protected readonly vendasRecentes = computed(() =>
    selecionarVendasRecentes(this.servico.vendas()),
  );
  protected readonly parcelasProximas = computed(() =>
    selecionarParcelasProximas(this.servico.vendas()),
  );
  protected readonly parcelasAtrasadas = computed(() =>
    selecionarParcelasAtrasadas(this.servico.vendas()),
  );
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly formatarDinheiro = formatarDinheiro;
}
