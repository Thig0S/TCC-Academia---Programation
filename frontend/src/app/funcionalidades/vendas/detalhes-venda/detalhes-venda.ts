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
import { ControleConfirmacoes } from '../../../nucleo/dados/controle-confirmacoes';
import { ErroContratoApi } from '../../../nucleo/dados/contratos-api';
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
import { ComandoMudancaStatus, StatusAdministrativoVenda } from '../venda.modelos';
import { formatarCpf, formatarTelefone } from '../identificacao.validacoes';
import {
  PagamentoDemonstrativo,
  PagamentoIndividualDemonstrativo,
} from '../../parcelas/pagamento.modelos';

interface ConfirmacaoStatusPreparada {
  readonly vendaId: string;
  readonly status: StatusAdministrativoVenda;
  readonly referencia: string;
  readonly revisaoEsperada: string | null;
}

interface AcompanhamentoBaixa {
  readonly vendaId: string;
  readonly parcelaId: string;
}

@Component({
  selector: 'app-detalhes-venda',
  imports: [Cabecalho, RouterLink, SeloSituacao, RegistrarPagamento, CorrigirPagamento, Modal],
  templateUrl: './detalhes-venda.html',
  styleUrl: './detalhes-venda.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetalhesVenda {
  protected readonly sucesso = inject(RetornoFormulario).consumirSucesso();
  protected readonly modo = inject(MODO_APLICACAO);
  private readonly rota = inject(ActivatedRoute);
  private readonly fonte = inject(FONTE_VENDAS);
  // Preserve legacy demo-only actions without creating the demo service in local composition.
  private readonly servico =
    this.fonte instanceof FonteVendasDemonstracao ? inject(ServicoDemonstracao) : null;
  private readonly controleConsultas = inject(ControleConsultas);
  private readonly confirmacoes = inject(ControleConfirmacoes);
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
  protected readonly erroRecebimento = signal('');
  protected readonly mensagemCorrecao = signal('');
  protected readonly erroCorrecao = signal('');
  protected readonly mensagemStatus = signal('');
  protected readonly erroStatus = signal('');
  protected readonly statusAlvo = signal<StatusAdministrativoVenda | null>(null);
  protected readonly conflitoStatus = signal(false);
  protected readonly recarregandoStatus = signal(false);
  protected readonly statusRevisaoRecarregada = signal(false);
  private readonly statusPreparado = signal<ConfirmacaoStatusPreparada | null>(null);
  private readonly geracaoAntesDaRecargaStatus = signal<number | null>(null);
  protected readonly statusEnviando = signal(false);
  private readonly statusAcionador = signal<StatusAdministrativoVenda | null>(null);
  private readonly statusConfirmado = signal(false);
  private readonly modalStatus = viewChild(Modal);
  private readonly alertaStatus = viewChild<ElementRef<HTMLElement>>('alertaStatus');
  private readonly focoProxima = signal(false);
  private readonly acionadorPagamento = signal<string | null>(null);
  private readonly baixaAcompanhada = signal<AcompanhamentoBaixa | null>(null);
  private readonly baixaEnviando = signal(false);
  private readonly baixaConfirmadaId = signal<string | null>(null);
  private readonly correcaoConfirmadaId = signal<string | null>(null);
  private readonly acionadorCorrecao = signal<string | null>(null);
  protected readonly estadoConsulta = this.consultaInterna.estado;
  protected readonly estadoConfirmacao = this.confirmacoes.estado;
  private readonly acompanharBaixa = effect(() => {
    const acompanhamento = this.baixaAcompanhada();
    if (!acompanhamento) return;
    const estado = this.confirmacoes.estado();
    const contexto =
      estado.tipo === 'enviando' || estado.tipo === 'incerto'
        ? estado.contexto
        : estado.ultimoResultado?.contexto;
    if (
      !contexto ||
      contexto.operacao !== 'baixa' ||
      contexto.alvo.tipo !== 'detalhe' ||
      contexto.alvo.vendaId !== acompanhamento.vendaId ||
      (contexto.rascunho as { readonly parcelaId?: unknown }).parcelaId !== acompanhamento.parcelaId
    ) {
      return;
    }
    if (estado.tipo === 'enviando') {
      this.baixaEnviando.set(true);
      return;
    }
    if (estado.tipo === 'incerto') {
      this.erroRecebimento.set(
        'O resultado do pagamento está incerto. Não reenvie; consulte e confira os dados antes de outra confirmação.',
      );
      this.mensagemRecebimento.set('');
      this.parcelaPagamento.set(null);
      this.baixaEnviando.set(false);
      this.baixaAcompanhada.set(null);
      afterNextRender(
        () => {
          const host = this.elemento.nativeElement;
          const alerta = host
            .closest('app-root')
            ?.querySelector<HTMLElement>('[data-foco-confirmacao-incerta]');
          (alerta ?? host.querySelector<HTMLElement>('#titulo-parcelas'))?.focus();
        },
        { injector: this.injector },
      );
      return;
    }
    const ultimoResultado = estado.ultimoResultado;
    if (!ultimoResultado) return;
    if (ultimoResultado.tipo === 'confirmado' && ultimoResultado.resultado.tipo === 'sucesso') {
      this.mensagemRecebimento.set(ultimoResultado.resultado.mensagem);
      this.erroRecebimento.set('');
      this.baixaConfirmadaId.set(acompanhamento.vendaId);
      this.focoProxima.set(true);
    }
    this.baixaEnviando.set(false);
    this.baixaAcompanhada.set(null);
  });
  private readonly reconciliarBaixaConfirmada = effect(() => {
    const vendaId = this.baixaConfirmadaId();
    if (!vendaId) return;
    const estado = this.estadoConsulta();
    if (
      estado.tipo === 'erro' &&
      estado.chave.tipo === 'detalhe' &&
      estado.chave.vendaId === vendaId
    ) {
      this.erroRecebimento.set(
        'A baixa foi confirmada, mas não foi possível atualizar o detalhe. Recarregue para consultar o resultado; não repita o pagamento.',
      );
      return;
    }
    if (
      estado.tipo === 'pronto' &&
      estado.chave.tipo === 'detalhe' &&
      estado.chave.vendaId === vendaId
    ) {
      this.baixaConfirmadaId.set(null);
      this.erroRecebimento.set('');
    }
  });
  private readonly reconciliarCorrecaoConfirmada = effect(() => {
    const vendaId = this.correcaoConfirmadaId();
    if (!vendaId) return;
    const estado = this.estadoConsulta();
    if (
      estado.tipo === 'erro' &&
      estado.chave.tipo === 'detalhe' &&
      estado.chave.vendaId === vendaId
    ) {
      this.erroCorrecao.set(
        'A correção foi confirmada, mas não foi possível atualizar o detalhe. Recarregue para consultar o resultado; não repita a correção.',
      );
      return;
    }
    if (
      estado.tipo === 'pronto' &&
      estado.chave.tipo === 'detalhe' &&
      estado.chave.vendaId === vendaId
    ) {
      afterNextRender(
        () => {
          const host = this.elemento.nativeElement;
          const acionador = this.acionadorCorrecao();
          const botao = [...host.querySelectorAll<HTMLElement>('[data-acao-corrigir]')].find(
            (item) => item.dataset['acaoCorrigir'] === acionador,
          );
          (botao ?? host.querySelector<HTMLElement>('#titulo-parcelas'))?.focus();
        },
        { injector: this.injector },
      );
      this.correcaoConfirmadaId.set(null);
      this.erroCorrecao.set('');
    }
  });
  private readonly focarProximaAcaoBaixa = effect(() => {
    if (!this.focoProxima()) return;
    const estado = this.estadoConsulta();
    if (estado.tipo !== 'pronto') return;
    afterNextRender(
      () => {
        const host = this.elemento.nativeElement;
        (
          host.querySelector<HTMLElement>('[data-acao-pagar]') ??
          host.querySelector<HTMLElement>('#titulo-parcelas')
        )?.focus();
        this.focoProxima.set(false);
      },
      { injector: this.injector },
    );
  });
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
  private readonly descartarStatusDeOutraVenda = effect(() => {
    const id = this.id().get('id');
    const preparado = this.statusPreparado();
    if (preparado && preparado.vendaId !== id) {
      untracked(() => {
        this.statusAlvo.set(null);
        this.statusPreparado.set(null);
        this.conflitoStatus.set(false);
        this.recarregandoStatus.set(false);
        this.statusRevisaoRecarregada.set(false);
        this.geracaoAntesDaRecargaStatus.set(null);
        this.erroStatus.set('');
        this.mensagemStatus.set('');
      });
    }
  });
  private readonly aceitarLeituraAposConflitoStatus = effect(() => {
    if (!this.recarregandoStatus()) return;
    const preparado = this.statusPreparado();
    const geracaoAnterior = this.geracaoAntesDaRecargaStatus();
    const estado = this.estadoConsulta();
    if (!preparado || geracaoAnterior === null) return;

    if (
      (estado.tipo === 'erro' || estado.tipo === 'inexistente') &&
      estado.geracao > geracaoAnterior
    ) {
      this.recarregandoStatus.set(false);
      this.erroStatus.set(
        'Não foi possível recarregar a venda. Nenhuma nova mudança foi enviada; tente consultar novamente.',
      );
      afterNextRender(() => this.alertaStatus()?.nativeElement.focus(), {
        injector: this.injector,
      });
      return;
    }
    if (
      estado.tipo !== 'pronto' ||
      estado.geracao <= geracaoAnterior ||
      estado.chave.tipo !== 'detalhe' ||
      estado.chave.vendaId !== preparado.vendaId ||
      estado.valor === null
    ) {
      return;
    }

    const atual = estado.valor.resumo;
    if (this.modo === 'local' && atual.revisao === null) {
      this.recarregandoStatus.set(false);
      this.erroStatus.set(
        'A consulta atual não forneceu uma revisão válida. Recarregue a venda antes de confirmar.',
      );
      return;
    }
    if (!this.transicaoStatusPermitida(atual, preparado.status)) {
      this.recarregandoStatus.set(false);
      this.statusAlvo.set(null);
      this.statusPreparado.set(null);
      this.conflitoStatus.set(false);
      this.erroStatus.set('');
      this.mensagemStatus.set(
        'A venda mudou e o destino escolhido não é mais permitido. Confira o status atual antes de iniciar outra mudança.',
      );
      this.statusConfirmado.set(true);
      this.modalStatus()?.fechar();
      return;
    }

    this.statusPreparado.set({
      ...preparado,
      revisaoEsperada: atual.revisao,
    });
    if (this.statusAlvo() === null) this.statusAlvo.set(preparado.status);
    this.recarregandoStatus.set(false);
    this.statusRevisaoRecarregada.set(true);
    this.geracaoAntesDaRecargaStatus.set(null);
    this.conflitoStatus.set(false);
    this.erroStatus.set(
      `A venda foi recarregada. O status atual é ${atual.statusAdministrativo}; revise e confirme novamente.`,
    );
    afterNextRender(
      () =>
        this.elemento.nativeElement
          .querySelector<HTMLButtonElement>('dialog [data-foco-inicial]')
          ?.focus(),
      { injector: this.injector },
    );
  });
  protected readonly restaurarFoco = () => {
    afterNextRender(
      () => {
        const host = this.elemento.nativeElement;
        const alertaIncerta =
          this.confirmacoes.estado().tipo === 'incerto'
            ? host
                .closest('app-root')
                ?.querySelector<HTMLElement>('[data-foco-confirmacao-incerta]')
            : null;
        if (alertaIncerta) {
          alertaIncerta.focus();
          this.focoProxima.set(false);
          return;
        }
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
        const alertaIncerta =
          this.confirmacoes.estado().tipo === 'incerto'
            ? host
                .closest('app-root')
                ?.querySelector<HTMLElement>('[data-foco-confirmacao-incerta]')
            : null;
        if (alertaIncerta) {
          alertaIncerta.focus();
          return;
        }
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
      this.erroRecebimento.set('');
      this.focoProxima.set(true);
    } else if (this.baixaEnviando()) {
      this.mensagemRecebimento.set(
        'A baixa foi enviada. Fechar o diálogo não cancela a operação; o resultado continuará sendo acompanhado nesta aba.',
      );
    }
  }

  protected acompanharBaixaIniciada(alvo: AcompanhamentoBaixa): void {
    this.baixaAcompanhada.set(alvo);
    this.baixaEnviando.set(true);
    this.mensagemRecebimento.set('');
    this.erroRecebimento.set('');
  }

  protected abrirPagamento(parcelaId: string): void {
    this.mensagemRecebimento.set('');
    this.erroRecebimento.set('');
    this.acionadorPagamento.set(parcelaId);
    this.parcelaPagamento.set(parcelaId);
  }

  protected abrirCorrecao(recebimentoId: string): void {
    this.mensagemCorrecao.set('');
    this.erroCorrecao.set('');
    this.acionadorCorrecao.set(recebimentoId);
    this.recebimentoCorrecao.set(recebimentoId);
  }

  protected fecharCorrecao(mensagem: string | null): void {
    this.recebimentoCorrecao.set(null);
    if (mensagem) {
      this.mensagemCorrecao.set(mensagem);
      this.erroCorrecao.set('');
      if (this.modo === 'local') this.correcaoConfirmadaId.set(this.id().get('id'));
    }
  }

  protected registrarCorrecaoIncerta(mensagem: string): void {
    this.mensagemCorrecao.set('');
    this.erroCorrecao.set(mensagem);
  }

  protected abrirConfirmacaoStatus(status: StatusAdministrativoVenda): void {
    const estado = this.estadoConsulta();
    if (
      estado.tipo !== 'pronto' ||
      estado.chave.tipo !== 'detalhe' ||
      estado.chave.vendaId !== this.id().get('id') ||
      estado.valor === null ||
      estado.valor.resumo.id !== estado.chave.vendaId ||
      !this.transicaoStatusPermitida(estado.valor.resumo, status) ||
      !this.podeAbrirStatus(estado.valor.resumo)
    ) {
      return;
    }
    this.statusAcionador.set(status);
    this.statusPreparado.set({
      vendaId: estado.valor.resumo.id,
      status,
      referencia: this.fonte.referencia,
      revisaoEsperada: estado.valor.resumo.revisao,
    });
    this.statusConfirmado.set(false);
    this.erroStatus.set('');
    this.conflitoStatus.set(false);
    this.statusRevisaoRecarregada.set(false);
    this.statusAlvo.set(status);
  }

  protected podeAbrirStatus(venda: VendaResumoLeitura): boolean {
    return (
      !this.conflitoStatus() &&
      this.confirmacoes.estado().tipo === 'disponivel' &&
      (this.modo === 'demonstrativo' || venda.revisao !== null)
    );
  }

  protected bloqueioStatus(venda: VendaResumoLeitura): string {
    if (this.modo === 'local' && venda.revisao === null) {
      return 'A consulta não forneceu uma revisão válida. Nenhuma mudança de status foi enviada.';
    }
    const estado = this.confirmacoes.estado();
    if (estado.tipo === 'enviando') {
      return 'Outra confirmação está em andamento; aguarde a resposta antes de mudar o status.';
    }
    if (estado.tipo === 'incerto') {
      return 'Há um resultado incerto nesta aba. Confira os dados antes de iniciar outra confirmação.';
    }
    return '';
  }

  protected readonly podeConfirmarStatus = computed(() => {
    const preparado = this.statusPreparado();
    return (
      preparado !== null &&
      this.statusAlvo() === preparado.status &&
      this.id().get('id') === preparado.vendaId &&
      !this.statusEnviando() &&
      !this.recarregandoStatus() &&
      !this.conflitoStatus() &&
      this.confirmacoes.estado().tipo === 'disponivel' &&
      (this.modo === 'demonstrativo' || preparado.revisaoEsperada !== null)
    );
  });

  private transicaoStatusPermitida(
    venda: VendaResumoLeitura,
    destino: StatusAdministrativoVenda,
  ): boolean {
    if (venda.statusAdministrativo === destino) return true;
    if (venda.statusAdministrativo === 'Ativo') {
      return destino === 'Inativo' || (destino === 'Prejuízo' && venda.saldoCentavos > 0);
    }
    return destino === 'Ativo';
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

  protected async confirmarMudancaStatus(): Promise<void> {
    const preparado = this.statusPreparado();
    if (!preparado || !this.podeConfirmarStatus()) return;
    this.statusEnviando.set(true);
    this.erroStatus.set('');
    this.statusRevisaoRecarregada.set(false);
    try {
      const resultado = await this.confirmacoes.confirmar(
        {
          operacao: 'status',
          alvo: { tipo: 'detalhe', vendaId: preparado.vendaId },
          referencia: preparado.referencia,
          revisaoEsperada: preparado.revisaoEsperada,
          rascunho: { vendaId: preparado.vendaId, status: preparado.status },
        },
        (contexto) => {
          const comando: ComandoMudancaStatus = {
            vendaId: preparado.vendaId,
            status: preparado.status,
          };
          return this.fonte
            .alterarStatus({
              comando,
              revisaoEsperada: contexto.revisaoEsperada,
            })
            .pipe(
              map((resposta) => {
                if (
                  resposta.tipo === 'sucesso' &&
                  (resposta.valor.resumo.id !== preparado.vendaId ||
                    resposta.valor.resumo.statusAdministrativo !== preparado.status)
                ) {
                  throw new ErroContratoApi('A mudança retornou venda ou status incompatível.');
                }
                return resposta;
              }),
            );
        },
      );
      if (this.id().get('id') !== preparado.vendaId) return;
      if (resultado.tipo !== 'sucesso') {
        if (resultado.codigo === 'conflito-revisao') {
          this.conflitoStatus.set(true);
          this.statusRevisaoRecarregada.set(false);
          this.geracaoAntesDaRecargaStatus.set(this.estadoConsulta().geracao);
          this.mensagemStatus.set('');
          this.erroStatus.set(
            'A venda mudou desde a consulta. Recarregue e revise o mesmo alvo antes de confirmar novamente.',
          );
          afterNextRender(() => this.alertaStatus()?.nativeElement.focus(), {
            injector: this.injector,
          });
        } else if (this.confirmacoes.estado().tipo === 'incerto') {
          const mensagem =
            'O resultado da mudança está incerto. Não reenvie; confira os dados antes de tentar novamente.';
          this.erroStatus.set(mensagem);
          this.mensagemStatus.set('');
          this.statusPreparado.set(null);
          this.statusAlvo.set(null);
          afterNextRender(
            () => {
              const host = this.elemento.nativeElement;
              const alerta = host
                .closest('app-root')
                ?.querySelector<HTMLElement>('[data-foco-confirmacao-incerta]');
              (alerta ?? host.querySelector<HTMLElement>('#titulo-status-administrativo'))?.focus();
            },
            {
              injector: this.injector,
            },
          );
        } else {
          this.erroStatus.set(resultado.mensagem);
          if (this.statusAlvo() === null) this.statusPreparado.set(null);
          afterNextRender(() => this.alertaStatus()?.nativeElement.focus(), {
            injector: this.injector,
          });
        }
        return;
      }
      this.statusConfirmado.set(true);
      this.mensagemStatus.set(resultado.mensagem);
      this.statusPreparado.set(null);
      this.conflitoStatus.set(false);
      this.erroStatus.set('');
      this.statusEnviando.set(false);
      this.modalStatus()?.fechar();
    } catch {
      if (this.id().get('id') === preparado.vendaId) {
        const mensagem =
          'O resultado da mudança está incerto. Não reenvie; confira os dados antes de tentar novamente.';
        this.erroStatus.set(mensagem);
        this.mensagemStatus.set('');
      }
    } finally {
      this.statusEnviando.set(false);
    }
  }

  protected recarregarStatusAposConflito(): void {
    const preparado = this.statusPreparado();
    if (!preparado || !this.conflitoStatus() || this.recarregandoStatus()) return;
    this.geracaoAntesDaRecargaStatus.set(this.estadoConsulta().geracao);
    this.recarregandoStatus.set(true);
    this.statusRevisaoRecarregada.set(false);
    this.erroStatus.set('Consultando a venda para revisar a confirmação…');
    this.carregarDetalhe(preparado.vendaId);
  }

  protected descartarMudancaStatus(): void {
    if (this.statusEnviando()) return;
    this.statusAlvo.set(null);
    this.statusPreparado.set(null);
    this.conflitoStatus.set(false);
    this.recarregandoStatus.set(false);
    this.statusRevisaoRecarregada.set(false);
    this.geracaoAntesDaRecargaStatus.set(null);
    this.erroStatus.set('');
    this.mensagemStatus.set('');
  }

  protected cancelarConfirmacaoStatus(): void {
    this.modalStatus()?.fechar();
  }

  protected fecharConfirmacaoStatus(): void {
    this.statusAlvo.set(null);
    if (this.statusEnviando()) {
      this.mensagemStatus.set(
        'A mudança já foi enviada. Fechar o diálogo não a cancela; o resultado continuará sendo acompanhado nesta aba.',
      );
      return;
    }
    if (!this.conflitoStatus()) this.statusPreparado.set(null);
    this.erroStatus.set('');
  }

  protected readonly restaurarFocoStatus = () => {
    afterNextRender(
      () => {
        const host = this.elemento.nativeElement;
        const alertaIncerta =
          this.confirmacoes.estado().tipo === 'incerto'
            ? host
                .closest('app-root')
                ?.querySelector<HTMLElement>('[data-foco-confirmacao-incerta]')
            : null;
        if (alertaIncerta) {
          alertaIncerta.focus();
          this.statusConfirmado.set(false);
          return;
        }
        const tituloStatus = host.querySelector<HTMLElement>('#titulo-status-administrativo');
        const destino = this.statusConfirmado()
          ? (tituloStatus ?? host.querySelector<HTMLElement>('h1'))
          : [...host.querySelectorAll<HTMLButtonElement>('[data-acao-status]')].find(
              (botao) => botao.dataset['acaoStatus'] === this.statusAcionador(),
            );
        (destino ?? tituloStatus ?? host.querySelector<HTMLElement>('h1'))?.focus();
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
    if (venda.statusAdministrativo !== 'Ativo') return false;
    return (
      this.modo !== 'local' ||
      (venda.revisao !== null && this.confirmacoes.estado().tipo === 'disponivel')
    );
  }

  protected bloqueioPagamento(venda: VendaResumoLeitura): string {
    if (venda.revisao === null) return 'A consulta não forneceu revisão para confirmar a baixa.';
    const estado = this.confirmacoes.estado();
    return estado.tipo === 'enviando'
      ? 'Aguarde a confirmação em andamento.'
      : estado.tipo === 'incerto'
        ? 'Confira o resultado da confirmação anterior antes de outra baixa.'
        : 'A baixa não está disponível nesta venda.';
  }

  protected parcelaAlvo(venda: ProjecaoVenda): ProjecaoParcela | null {
    const id = this.parcelaPagamento();
    return id ? (venda.parcelas.find((parcela) => parcela.id === id) ?? null) : null;
  }

  protected parcelaAlvoLeitura(
    detalhe: VendaDetalheLeitura,
    parcelaId: string,
  ): ParcelaLeitura | null {
    return detalhe.parcelas.find((parcela) => parcela.id === parcelaId) ?? null;
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

  protected recebimentoCorrigivel(
    detalhe: VendaDetalheLeitura,
    parcela: ParcelaLeitura,
  ): RecebimentoLeitura | null {
    return (
      detalhe.recebimentos.find(
        (recebimento) =>
          recebimento.origem === 'Individual' &&
          recebimento.alocacoes.length === 1 &&
          recebimento.alocacoes[0]?.parcelaId === parcela.id,
      ) ?? null
    );
  }

  protected podeCorrigir(venda: VendaResumoLeitura): boolean {
    if (venda.statusAdministrativo !== 'Ativo') return false;
    if (this.modo === 'demonstrativo') return this.podePagar(venda);
    return venda.revisao !== null && this.confirmacoes.estado().tipo === 'disponivel';
  }

  protected bloqueioCorrecao(venda: VendaResumoLeitura): string {
    if (venda.revisao === null)
      return 'A consulta não forneceu revisão para corrigir o recebimento.';
    const estado = this.confirmacoes.estado();
    return estado.tipo === 'enviando'
      ? 'Aguarde a confirmação em andamento.'
      : estado.tipo === 'incerto'
        ? 'Confira o resultado da confirmação anterior antes de corrigir o recebimento.'
        : 'A correção não está disponível nesta venda.';
  }

  protected recebimentoAlvoLeitura(
    detalhe: VendaDetalheLeitura,
    recebimentoId: string,
  ): RecebimentoLeitura | null {
    return (
      detalhe.recebimentos.find(
        (recebimento) => recebimento.id === recebimentoId && recebimento.origem === 'Individual',
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

  protected parcelaDemonstrativa(
    venda: ProjecaoVenda | null,
    parcelaId: string,
  ): ProjecaoParcela | null {
    return venda?.parcelas.find((parcela) => parcela.id === parcelaId) ?? null;
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
        if (resultado.tipo === 'sucesso') {
          if (resultado.valor.resumo.id !== id) {
            throw new ErroContratoApi('A consulta retornou outro identificador de venda.');
          }
          return resultado.valor;
        }
        if (resultado.tipo === 'inexistencia' && resultado.codigo === 'venda-inexistente') {
          return null;
        }
        throw new Error('A consulta do detalhe não foi concluída.');
      }),
    );
  }
}
