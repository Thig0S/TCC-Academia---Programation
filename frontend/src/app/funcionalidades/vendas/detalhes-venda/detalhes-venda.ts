import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SeloSituacao } from '../../../compartilhado/componentes/selo-situacao/selo-situacao';
import { Modal } from '../../../compartilhado/componentes/modal/modal';
import { formatarDataCivil } from '../data-civil';
import { formatarDinheiro } from '../dinheiro';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { RetornoFormulario } from '../../../nucleo/demonstracao/retorno-formulario';
import { RegistrarPagamento } from '../../parcelas/registrar-pagamento/registrar-pagamento';
import { CorrigirPagamento } from '../../parcelas/corrigir-pagamento/corrigir-pagamento';
import { ProjecaoParcela } from '../../parcelas/parcela.calculos';
import { ProjecaoVenda } from '../venda.calculos';
import { StatusAdministrativoVenda } from '../venda.modelos';
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
  private readonly rota = inject(ActivatedRoute);
  private readonly servico = inject(ServicoDemonstracao);
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
    const consulta = this.consulta();
    if (status === null || consulta?.tipo !== 'sucesso') return;
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

  protected rotaRetorno(venda: ProjecaoVenda): readonly string[] {
    if (venda.statusAdministrativo === 'Inativo') return ['/vendas/inativas'];
    if (venda.statusAdministrativo === 'Prejuízo') return ['/vendas/prejuizo'];
    return venda.saldoCentavos > 0 ? ['/vendas'] : ['/vendas/quitadas'];
  }

  protected textoRetorno(venda: ProjecaoVenda): string {
    if (venda.statusAdministrativo === 'Inativo') return 'Voltar para Vendas inativas';
    if (venda.statusAdministrativo === 'Prejuízo') return 'Voltar para Prejuízo';
    return venda.saldoCentavos > 0 ? 'Voltar para Vendas' : 'Voltar para Quitadas';
  }

  protected primeiraPendente(venda: ProjecaoVenda, parcela: ProjecaoParcela): boolean {
    return venda.parcelas.find((item) => item.situacao !== 'Paga')?.id === parcela.id;
  }

  protected podePagar(venda: ProjecaoVenda): boolean {
    return venda.statusAdministrativo === 'Ativo';
  }

  protected parcelaAlvo(venda: ProjecaoVenda): ProjecaoParcela | null {
    const id = this.parcelaPagamento();
    return id ? (venda.parcelas.find((parcela) => parcela.id === id) ?? null) : null;
  }

  protected pagamentoDaParcela(
    venda: ProjecaoVenda,
    parcela: ProjecaoParcela,
  ): PagamentoDemonstrativo | null {
    return (
      venda.recebimentos.find((recebimento) =>
        recebimento.alocacoes.some((alocacao) => alocacao.parcelaId === parcela.id),
      ) ?? null
    );
  }

  protected pagamentoIndividual(
    venda: ProjecaoVenda,
    parcela: ProjecaoParcela,
  ): PagamentoIndividualDemonstrativo | null {
    const pagamento = this.pagamentoDaParcela(venda, parcela);
    return pagamento?.origem === 'individual' ? pagamento : null;
  }

  protected valorAlocado(
    pagamento: PagamentoDemonstrativo | null,
    parcela: ProjecaoParcela,
  ): number | null {
    return (
      pagamento?.alocacoes.find((alocacao) => alocacao.parcelaId === parcela.id)?.valorCentavos ??
      null
    );
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

  protected readonly consulta = computed(() => {
    const id = this.id().get('id');
    return id === null ? null : this.servico.consultarVenda(id);
  });
  protected readonly referencia = this.servico.referencia;
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
}
