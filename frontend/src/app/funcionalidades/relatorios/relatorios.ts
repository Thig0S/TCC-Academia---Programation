import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Cabecalho } from '../../compartilhado/componentes/cabecalho/cabecalho';
import { ControleConsultas } from '../../nucleo/dados/controle-consultas';
import { EstadoConsulta, EstadoConsultaPorChave } from '../../nucleo/dados/estado-consulta';
import { FONTE_VENDAS } from '../../nucleo/dados/fonte-vendas';
import { RelatorioMensalLeitura } from '../../nucleo/dados/modelos-leitura';
import { formatarDataCivil, interpretarDataCivil } from '../vendas/data-civil';
import { formatarDinheiro } from '../vendas/dinheiro';

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
  private readonly fonte = inject(FONTE_VENDAS);
  private readonly controleConsultas = inject(ControleConsultas);
  private readonly consultaInterna = new EstadoConsultaPorChave<RelatorioMensalLeitura>(
    this.controleConsultas,
  );
  protected readonly estadoConsulta = this.consultaInterna.estado;
  protected readonly referencia = this.fonte.referencia;
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
  protected readonly dados = computed(() => {
    const estado = this.estadoConsulta();
    return this.ehProntoAtual(estado) ? estado.valor : null;
  });
  protected readonly erroConsulta = computed(() => {
    const estado = this.estadoConsulta();
    return this.ehErroAtual(estado);
  });
  protected readonly carregando = computed(() => !this.dados() && !this.erroConsulta());

  private readonly acompanharConsulta = effect((onCleanup) => {
    this.controleConsultas.geracao();
    this.mesAplicado();
    untracked(() => this.carregarRelatorio());
    onCleanup(() => untracked(() => this.consultaInterna.cancelar()));
  });

  protected readonly maiorRecebimentoDiario = computed(() =>
    Math.max(0, ...(this.dados()?.recebimentosDiarios.map((item) => item.totalCentavos) ?? [])),
  );
  protected readonly escalasGrafico = computed(() =>
    [1, 0.75, 0.5, 0.25, 0].map((proporcao, indice) => ({
      y: Relatorios.margemSuperiorGrafico + (Relatorios.alturaPlotagemGrafico * indice) / 4,
      rotulo: this.formatarDinheiro(Math.round(this.maiorRecebimentoDiario() * proporcao)),
    })),
  );
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly formatarDinheiro = formatarDinheiro;

  protected recarregar(): void {
    this.carregarRelatorio();
  }

  private carregarRelatorio(): void {
    const mes = this.mesAplicado();
    this.consultaInterna.carregar({ tipo: 'mes', mes, referencia: this.referencia }, () =>
      this.fonte.consultarRelatorioMensal(mes),
    );
  }

  private ehChaveAtual(chave: EstadoConsulta<RelatorioMensalLeitura>['chave']): boolean {
    return (
      chave?.tipo === 'mes' &&
      chave.mes === this.mesAplicado() &&
      chave.referencia === this.referencia
    );
  }

  private ehProntoAtual(
    estado: EstadoConsulta<RelatorioMensalLeitura>,
  ): estado is Extract<EstadoConsulta<RelatorioMensalLeitura>, { tipo: 'pronto' }> {
    return estado.tipo === 'pronto' && this.ehChaveAtual(estado.chave);
  }

  private ehErroAtual(estado: EstadoConsulta<RelatorioMensalLeitura>): boolean {
    return estado.tipo === 'erro' && this.ehChaveAtual(estado.chave);
  }

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
    const quantidade = this.dados()?.recebimentosDiarios.length ?? 0;
    const larguraUtil =
      Relatorios.larguraGrafico -
      Relatorios.margemEsquerdaGrafico -
      Relatorios.margemDireitaGrafico;
    return quantidade === 0
      ? Relatorios.margemEsquerdaGrafico
      : Relatorios.margemEsquerdaGrafico + (indice * larguraUtil) / quantidade;
  }

  protected larguraBarra(): number {
    const quantidade = this.dados()?.recebimentosDiarios.length ?? 0;
    const larguraUtil =
      Relatorios.larguraGrafico -
      Relatorios.margemEsquerdaGrafico -
      Relatorios.margemDireitaGrafico;
    return quantidade === 0 ? 0 : (larguraUtil / quantidade) * 0.7;
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
