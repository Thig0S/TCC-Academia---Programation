import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';
import { formatarDataCivil } from '../vendas/data-civil';
import { formatarDinheiro } from '../vendas/dinheiro';
import { calcularRelatorio } from './relatorios.calculos';

@Component({
  selector: 'app-relatorios',
  imports: [Cabecalho, RouterLink],
  templateUrl: './relatorios.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Relatorios {
  private readonly servico = inject(ServicoDemonstracao);
  protected readonly referencia = this.servico.referencia;
  protected readonly exportacaoInformada = signal(false);
  protected readonly dados = computed(() =>
    calcularRelatorio(this.servico.vendas(), this.referencia),
  );
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly formatarDinheiro = formatarDinheiro;

  protected informarIndisponibilidadeExportacao(): void {
    this.exportacaoInformada.set(true);
  }
}
