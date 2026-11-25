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
  private static readonly larguraGrafico = 760;
  private static readonly alturaGrafico = 300;
  private static readonly margemEsquerdaGrafico = 76;
  private static readonly margemDireitaGrafico = 16;
  private static readonly margemSuperiorGrafico = 28;
  private static readonly margemInferiorGrafico = 44;
  private static readonly alturaPlotagemGrafico =
    Relatorios.alturaGrafico - Relatorios.margemSuperiorGrafico - Relatorios.margemInferiorGrafico;
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
  protected readonly maiorRecebimentoDiario = computed(() =>
    Math.max(0, ...this.dados().recebimentosDiarios.map((item) => item.totalCentavos)),
  );
  protected readonly escalasGrafico = computed(() =>
    [1, 0.75, 0.5, 0.25, 0].map((proporcao, indice) => ({
      y: Relatorios.margemSuperiorGrafico + (Relatorios.alturaPlotagemGrafico * indice) / 4,
      rotulo: this.formatarDinheiro(Math.round(this.maiorRecebimentoDiario() * proporcao)),
    })),
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

  protected posicaoBarra(indice: number): number {
    const quantidade = this.dados().recebimentosDiarios.length;
    const larguraUtil =
      Relatorios.larguraGrafico -
      Relatorios.margemEsquerdaGrafico -
      Relatorios.margemDireitaGrafico;
    return Relatorios.margemEsquerdaGrafico + (indice * larguraUtil) / quantidade;
  }

  protected larguraBarra(): number {
    const quantidade = this.dados().recebimentosDiarios.length;
    const larguraUtil =
      Relatorios.larguraGrafico -
      Relatorios.margemEsquerdaGrafico -
      Relatorios.margemDireitaGrafico;
    return (larguraUtil / quantidade) * 0.7;
  }

  protected alturaBarra(valorCentavos: number): number {
    const maior = this.maiorRecebimentoDiario();
    return maior === 0 ? 0 : (valorCentavos / maior) * Relatorios.alturaPlotagemGrafico;
  }

  protected topoBarra(valorCentavos: number): number {
    return (
      Relatorios.margemSuperiorGrafico +
      Relatorios.alturaPlotagemGrafico -
      this.alturaBarra(valorCentavos)
    );
  }

  protected mostrarRotuloDia(indice: number, quantidade: number): boolean {
    return indice === 0 || (indice + 1) % 5 === 0 || indice === quantidade - 1;
  }
}
