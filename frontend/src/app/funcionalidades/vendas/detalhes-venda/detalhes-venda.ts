import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map, Observable } from 'rxjs';
import { SeloSituacao } from '../../../compartilhado/componentes/selo-situacao/selo-situacao';
import { Modal } from '../../../compartilhado/componentes/modal/modal';
import { formatarDataCivil } from '../data-civil';
import { formatarDinheiro } from '../dinheiro';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { MODO_APLICACAO } from '../../../nucleo/configuracao/modo-aplicacao';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { EstadoConsultaPorChave } from '../../../nucleo/dados/estado-consulta';
import { FONTE_VENDAS } from '../../../nucleo/dados/fonte-vendas';
import { FonteVendasDemonstracao } from '../../../nucleo/dados/fonte-vendas-demonstracao';
import {
  ParcelaLeitura,
  RecebimentoLeitura,
  VendaDetalheLeitura,
  VendaResumoLeitura,
} from '../../../nucleo/dados/modelos-leitura';
import { RetornoFormulario } from '../../../nucleo/navegacao/retorno-formulario';
import { RegistrarPagamento } from '../../parcelas/registrar-pagamento/registrar-pagamento';
import { CorrigirPagamento } from '../../parcelas/corrigir-pagamento/corrigir-pagamento';
import { ProjecaoParcela } from '../../parcelas/parcela.calculos';
import { ProjecaoVenda } from '../venda.calculos';
import { StatusAdministrativoVenda } from '../venda.modelos';
import { formatarCpf, formatarTelefone } from '../identificacao.validacoes';
import {
  PagamentoDemonstrativo,
  PagamentoIndividualDemonstrativo,
} from '../../parcelas/pagamento.modelos';

@Component({
  selector: 'app-detalhes-venda',
  imports: [Cabecalho, RouterLink, SeloSituacao, RegistrarPagamento, CorrigirPagamento, Modal],
  templateUrl: './detalhes-venda.html',
  styleUrl: './detalhes-venda.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalhesVenda {
  protected readonly sucesso = inject(RetornoFormulario).consumirSucesso();
  private readonly modo = inject(MODO_APLICACAO);
  private readonly rota = inject(ActivatedRoute);
  private readonly fonte = inject(FONTE_VENDAS);
  // Preserve legacy demo-only actions without creating the demo service in local composition.
  private readonly servico =
    this.fonte instanceof FonteVendasDemonstracao ? inject(ServicoDemonstracao) : null;
  private readonly controleConsultas = inject(ControleConsultas);
  private readonly consultaInterna = new EstadoConsultaPorChave<VendaDetalheLeitura | null>(
    this.controleConsultas,
  );
  private readonly id = toSignal(this.rota.paramMap, { initialValue: this.rota.snapshot.paramMap });
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  protected readonly parcelaPagamento = linkedSignal<string | null, string | null>({
    source: () => this.id().get('id'),
    computation: () => null,
  });
  protected readonly recebimentoCorrecao = linkedSignal<string | null, string | null>({
    source: () => this.id().get('id'),
    computation: () => null,
  });
  protected readonly mensagemRecebimento = signal('');
  protected readonly mensagemCorrecao = signal('');
  protected readonly mensagemStatus = signal('');
  protected readonly erroStatus = signal('');
  protected readonly statusAlvo = signal<StatusAdministrativoVenda | null>(null);
  private readonly statusAcionador = signal<StatusAdministrativoVenda | null>(null);
  private readonly statusConfirmado = signal(false);
  private readonly modalStatus = viewChild(Modal);
  private readonly alertaStatus = viewChild<ElementRef<HTMLElement>>('alertaStatus');
  private readonly focoProxima = signal(false);
  private readonly acionadorPagamento = signal<string | null>(null);
  private readonly acionadorCorrecao = signal<string | null>(null);
  protected readonly estadoConsulta = this.consultaInterna.estado;
  private readonly consultaDemonstrativa = computed(() => {
    const id = this.id().get('id');
    return id === null || this.servico === null ? null : this.servico.consultarVenda(id);
  });
  protected readonly vendaDemonstrativa = computed(() => {
    const resultado = this.consultaDemonstrativa();
    return resultado?.tipo === 'sucesso' ? resultado.valor : null;
  });
  protected readonly podeEditar = computed(
    () => this.modo === 'local' || this.vendaDemonstrativa() !== null,
  );
  private readonly acompanharConsulta = effect((onCleanup) => {
    this.controleConsultas.geracao();
    const id = this.id().get('id');
    untracked(() => {
      if (id === null) {
        this.consultaInterna.cancelar();
        return;
      }
      this.carregarDetalhe(id);
    });
    onCleanup(() => untracked(() => this.consultaInterna.cancelar()));
  });
  protected readonly restaurarFoco = () => {
    afterNextRender(
      () => {
        const host = this.elemento.nativeElement;
        const acoes = [...host.querySelectorAll<HTMLElement>('[data-acao-pagar]')];
        const destino = this.focoProxima()
          ? acoes[0]
          : acoes.find((acao) => acao.dataset['acaoPagar'] === this.acionadorPagamento());
        (destino ?? host.querySelector<HTMLElement>('#titulo-parcelas'))?.focus();
        this.focoProxima.set(false);
      },
      { injector: this.injector },
    );
  };
  protected readonly restaurarFocoCorrecao = () => {
    afterNextRender(
      () => {
        const host = this.elemento.nativeElement;
        const id = this.acionadorCorrecao();
        const destino = [...host.querySelectorAll<HTMLElement>('[data-acao-corrigir]')].find(
          (botao) => botao.dataset['acaoCorrigir'] === id,
        );
        (destino ?? host.querySelector<HTMLElement>('#titulo-parcelas'))?.focus();
      },
      { injector: this.injector },
    );
  };
  protected fecharRecebimento(mensagem: string | null): void {
    this.parcelaPagamento.set(null);
    if (mensagem) {
      this.mensagemRecebimento.set(mensagem);
      this.focoProxima.set(true);
    }
  }

  protected abrirPagamento(parcelaId: string): void {
    this.mensagemRecebimento.set('');
    this.acionadorPagamento.set(parcelaId);
    this.parcelaPagamento.set(parcelaId);
  }

  protected abrirCorrecao(recebimentoId: string): void {
    this.mensagemCorrecao.set('');
    this.acionadorCorrecao.set(recebimentoId);
    this.recebimentoCorrecao.set(recebimentoId);
  }

  protected fecharCorrecao(mensagem: string | null): void {
    this.recebimentoCorrecao.set(null);
    if (mensagem) this.mensagemCorrecao.set(mensagem);
  }

  protected abrirConfirmacaoStatus(status: StatusAdministrativoVenda): void {
    this.statusAcionador.set(status);
    this.statusConfirmado.set(false);
    this.erroStatus.set('');
    this.statusAlvo.set(status);
  }

  protected textoConfirmacaoStatus(status: StatusAdministrativoVenda): string {
    switch (status) {
      case 'Inativo':
        return 'A venda deixará as coleções operacionais. Parcelas, recebimentos e histórico serão preservados.';
      case 'Prejuízo':
        return 'A venda passará para a seção Prejuízo e deixará as coleções operacionais. Os recebimentos já feitos serão preservados.';
      case 'Ativo':
        return 'A venda voltará à coleção ativa correspondente ao saldo, sem alterar parcelas ou recebimentos.';
    }
  }

  protected confirmarMudancaStatus(): void {
    const status = this.statusAlvo();
    const consulta = this.consultaDemonstrativa();
    if (this.servico === null || status === null || consulta?.tipo !== 'sucesso') return;
    try {
      const resultado = this.servico.alterarStatus({ vendaId: consulta.valor.id, status });
      if (resultado.tipo !== 'sucesso') {
        this.erroStatus.set(resultado.mensagem);
        afterNextRender(() => this.alertaStatus()?.nativeElement.focus(), {
          injector: this.injector,
        });
        return;
      }
      this.statusConfirmado.set(true);
      this.mensagemStatus.set(resultado.mensagem);
      this.modalStatus()?.fechar();
    } catch {
      this.erroStatus.set('Não foi possível atualizar o status. Tente novamente.');
      afterNextRender(() => this.alertaStatus()?.nativeElement.focus(), {
        injector: this.injector,
      });
    }
  }

  protected cancelarConfirmacaoStatus(): void {
    this.modalStatus()?.fechar();
  }

  protected fecharConfirmacaoStatus(): void {
    this.statusAlvo.set(null);
    this.erroStatus.set('');
  }

  protected readonly restaurarFocoStatus = () => {
    afterNextRender(
      () => {
        const host = this.elemento.nativeElement;
        const destino = this.statusConfirmado()
          ? null
          : [...host.querySelectorAll<HTMLButtonElement>('[data-acao-status]')].find(
              (botao) => botao.dataset['acaoStatus'] === this.statusAcionador(),
            );
        (destino ?? host.querySelector<HTMLElement>('#titulo-status-administrativo'))?.focus();
        this.statusConfirmado.set(false);
      },
      { injector: this.injector },
    );
  };

  protected rotaRetorno(venda: VendaResumoLeitura): readonly string[] {
    if (venda.statusAdministrativo === 'Inativo') return ['/vendas/inativas'];
    if (venda.statusAdministrativo === 'Prejuízo') return ['/vendas/prejuizo'];
    return venda.saldoCentavos > 0 ? ['/vendas'] : ['/vendas/quitadas'];
  }

  protected textoRetorno(venda: VendaResumoLeitura): string {
    if (venda.statusAdministrativo === 'Inativo') return 'Voltar para Vendas inativas';
    if (venda.statusAdministrativo === 'Prejuízo') return 'Voltar para Prejuízo';
    return venda.saldoCentavos > 0 ? 'Voltar para Vendas' : 'Voltar para Quitadas';
  }

  protected primeiraPendente(detalhe: VendaDetalheLeitura, parcela: ParcelaLeitura): boolean {
    return detalhe.parcelas.find((item) => item.situacao !== 'Paga')?.id === parcela.id;
  }

  protected podePagar(venda: VendaResumoLeitura): boolean {
    return venda.statusAdministrativo === 'Ativo';
  }

  protected parcelaAlvo(venda: ProjecaoVenda): ProjecaoParcela | null {
    const id = this.parcelaPagamento();
    return id ? (venda.parcelas.find((parcela) => parcela.id === id) ?? null) : null;
  }

  protected pagamentoIndividual(
    detalhe: VendaDetalheLeitura,
    parcela: ParcelaLeitura,
  ): RecebimentoLeitura | null {
    return (
      detalhe.recebimentos.find(
        (recebimento) =>
          recebimento.origem === 'Individual' &&
          recebimento.alocacoes.some((alocacao) => alocacao.parcelaId === parcela.id),
      ) ?? null
    );
  }

  protected valorRecebido(parcela: ParcelaLeitura): number | null {
    return parcela.valorRecebidoCentavos > 0 ? parcela.valorRecebidoCentavos : null;
  }

  protected pagamentoAlvo(venda: ProjecaoVenda): PagamentoIndividualDemonstrativo | null {
    const id = this.recebimentoCorrecao();
    if (!id || venda.statusAdministrativo !== 'Ativo') return null;
    const pagamento = venda.recebimentos.find((item) => item.id === id);
    return pagamento?.origem === 'individual' ? pagamento : null;
  }

  protected parcelaDoPagamento(
    venda: ProjecaoVenda,
    pagamento: PagamentoIndividualDemonstrativo,
  ): ProjecaoParcela | null {
    const parcelaId = pagamento.alocacoes[0]?.parcelaId;
    return parcelaId ? (venda.parcelas.find((item) => item.id === parcelaId) ?? null) : null;
  }

  protected readonly referencia = this.fonte.referencia;
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly formatarCpf = formatarCpf;
  protected readonly formatarTelefone = formatarTelefone;

  protected entrada(detalhe: VendaDetalheLeitura): RecebimentoLeitura | null {
    return detalhe.recebimentos.find((recebimento) => recebimento.origem === 'Entrada') ?? null;
  }

  protected numeroParcela(detalhe: VendaDetalheLeitura, parcelaId: string): number | null {
    return detalhe.parcelas.find((parcela) => parcela.id === parcelaId)?.numero ?? null;
  }

  protected parcelaDemonstrativa(venda: ProjecaoVenda, parcelaId: string): ProjecaoParcela | null {
    return venda.parcelas.find((parcela) => parcela.id === parcelaId) ?? null;
  }

  protected recarregar(): void {
    const id = this.id().get('id');
    if (id !== null) this.carregarDetalhe(id);
  }

  private carregarDetalhe(id: string): void {
    this.consultaInterna.carregar(
      { tipo: 'detalhe', vendaId: id, referencia: this.fonte.referencia },
      () => this.consultarDetalhe(id),
      (valor) => valor === null,
    );
  }

  private consultarDetalhe(id: string): Observable<VendaDetalheLeitura | null> {
    return this.fonte.consultarVenda(id).pipe(
      map((resultado) => {
        if (resultado.tipo === 'sucesso') return resultado.valor;
        if (resultado.tipo === 'inexistencia' && resultado.codigo === 'venda-inexistente') {
          return null;
        }
        throw new Error('A consulta do detalhe não foi concluída.');
      }),
    );
  }
}
