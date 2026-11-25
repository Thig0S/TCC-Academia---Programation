import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../nucleo/demonstracao/servico-demonstracao';
import { formatarDataCivil, interpretarDataCivil } from '../vendas/data-civil';
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
  private readonly partesReferencia = interpretarDataCivil(this.referencia);
  protected readonly meses = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  protected readonly mesRascunho = signal(String(this.partesReferencia.mes));
  protected readonly anoRascunho = signal(String(this.partesReferencia.ano));
  protected readonly mesAplicado = signal(
    `${String(this.partesReferencia.ano).padStart(4, '0')}-${String(this.partesReferencia.mes).padStart(2, '0')}-01`,
  );
  protected readonly erroSelecao = signal('');
  protected readonly exportacaoInformada = signal(false);
  protected readonly dados = computed(() =>
    calcularRelatorio(this.servico.vendas(), this.referencia, this.mesAplicado()),
  );
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly formatarDinheiro = formatarDinheiro;

  protected informarIndisponibilidadeExportacao(): void {
    this.exportacaoInformada.set(true);
  }

  protected aplicarMes(): void {
    const mes = Number(this.mesRascunho());
    const ano = Number(this.anoRascunho());
    if (
      !/^\d{1,2}$/.test(this.mesRascunho()) ||
      !Number.isInteger(mes) ||
      mes < 1 ||
      mes > 12 ||
      !/^\d{1,4}$/.test(this.anoRascunho()) ||
      !Number.isInteger(ano) ||
      ano < 1 ||
      ano > 9999
    ) {
      this.erroSelecao.set('Informe um mês e um ano inteiro entre 1 e 9999.');
      return;
    }

    this.mesAplicado.set(`${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-01`);
    this.erroSelecao.set('');
  }

  protected mesSelecionado(indice: number): boolean {
    return String(indice + 1) === this.mesRascunho();
  }
}
