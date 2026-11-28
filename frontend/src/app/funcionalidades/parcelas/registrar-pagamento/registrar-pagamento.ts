import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { disabled, form, FormField, submit, validate } from '@angular/forms/signals';
import { firstValueFrom, map } from 'rxjs';
import { Modal } from '../../../compartilhado/componentes/modal/modal';
import { MODO_APLICACAO } from '../../../nucleo/configuracao/modo-aplicacao';
import { ControleConfirmacoes } from '../../../nucleo/dados/controle-confirmacoes';
import { ErroContratoApi } from '../../../nucleo/dados/contratos-api';
import { FONTE_VENDAS, FonteVendas } from '../../../nucleo/dados/fonte-vendas';
import { FonteVendasDemonstracao } from '../../../nucleo/dados/fonte-vendas-demonstracao';
import { ParcelaLeitura, VendaDetalheLeitura } from '../../../nucleo/dados/modelos-leitura';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { formatarDataCivil } from '../../vendas/data-civil';
import { formatarDinheiro } from '../../vendas/dinheiro';
import { ProjecaoVenda } from '../../vendas/venda.calculos';
import { Resultado } from '../../vendas/venda.modelos';
import { ErroCampo } from '../../vendas/formulario-venda/erro-campo';
import {
  converterRecebimento,
  converterRecebimentoLocal,
  Conversao,
  iniciarRecebimento,
  RascunhoRecebimento,
} from '../../vendas/formulario-venda/rascunhos';
import { ComandoPagamento, FORMAS_PAGAMENTO } from '../pagamento.modelos';
import { ProjecaoParcela } from '../parcela.calculos';

interface BaixaPreparada {
  readonly detalhe: VendaDetalheLeitura;
  readonly parcelaId: string;
  readonly revisaoEsperada: string | null;
  readonly referencia: string;
}

@Component({
  selector: 'app-registrar-pagamento',
  imports: [Modal, FormField, ErroCampo],
  templateUrl: './registrar-pagamento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarPagamento implements OnInit {
  readonly venda = input<ProjecaoVenda | null>(null);
  readonly parcela = input<ProjecaoParcela | null>(null);
  readonly detalhe = input<VendaDetalheLeitura | null>(null);
  readonly parcelaLeitura = input<ParcelaLeitura | null>(null);
  readonly restaurarFoco = input.required<() => void>();
  readonly encerrado = output<string | null>();
  readonly confirmacaoIniciada = output<{ readonly vendaId: string; readonly parcelaId: string }>();
  protected readonly modo = inject(MODO_APLICACAO);
  private readonly fonte: FonteVendas = inject(FONTE_VENDAS);
  private readonly servico =
    this.fonte instanceof FonteVendasDemonstracao ? inject(ServicoDemonstracao) : null;
  private readonly confirmacoes = inject(ControleConfirmacoes);
  private readonly modal = viewChild.required(Modal);
  private readonly preparada = signal<BaixaPreparada | null>(null);
  protected readonly rascunho = signal<RascunhoRecebimento>(
    iniciarRecebimento(this.fonte.referencia),
  );
  protected readonly conversao = computed<Conversao<ComandoPagamento, RascunhoRecebimento>>(() => {
    if (this.modo === 'local') {
      const preparada = this.preparada();
      if (!preparada) {
        return {
          tipo: 'invalido' as const,
          erros: {},
          resumo: 'Não foi possível preparar a parcela consultada. Feche e recarregue a venda.',
        };
      }
      return converterRecebimentoLocal(
        this.rascunho(),
        preparada.detalhe,
        preparada.parcelaId,
        preparada.referencia,
      );
    }

    const servico = this.servico;
    const venda = this.venda();
    const parcela = this.parcela();
    if (!servico || !venda || !parcela) {
      return {
        tipo: 'invalido' as const,
        erros: {},
        resumo: 'Não foi possível preparar a parcela demonstrativa.',
      };
    }
    const atual = servico.consultarVenda(venda.id);
    return converterRecebimento(
      this.rascunho(),
      atual.tipo === 'sucesso' ? atual.valor : venda,
      parcela.id,
      this.fonte.referencia,
    );
  });
  protected readonly campos = form(this.rascunho, (p) => {
    for (const chave of ['data', 'forma', 'valorRecebido', 'observacao'] as const) {
      disabled(p[chave], { when: () => this.enviando() });
      validate(p[chave], () => {
        const resultado = this.conversao();
        const message = resultado.tipo === 'invalido' ? resultado.erros[chave] : null;
        return message ? { kind: 'dominio', message } : null;
      });
    }
    validate(p, () => {
      const resultado = this.conversao();
      return resultado.tipo === 'invalido' && resultado.resumo
        ? { kind: 'selecao', message: resultado.resumo }
        : null;
    });
  });
  protected readonly formas = FORMAS_PAGAMENTO;
  protected readonly mensagem = signal('');
  protected readonly concluido = signal(false);
  protected readonly enviando = signal(false);
  protected readonly incerto = signal(false);
  protected readonly conflito = signal(false);
  protected readonly recarregando = signal(false);
  protected readonly alvoDesatualizado = signal(false);
  protected readonly detalheAtual = computed(() => this.preparada()?.detalhe ?? this.detalhe());
  protected readonly parcelaAtual = computed(() => {
    const preparada = this.preparada();
    if (preparada) {
      return preparada.detalhe.parcelas.find((item) => item.id === preparada.parcelaId) ?? null;
    }
    return this.parcelaLeitura();
  });
  protected readonly nomeCliente = computed(
    () => this.detalheAtual()?.resumo.cliente.nome ?? this.venda()?.cliente.nome ?? '',
  );
  protected readonly numeroParcela = computed(
    () => this.parcelaAtual()?.numero ?? this.parcela()?.numero ?? 0,
  );
  protected readonly quantidadeParcelas = computed(
    () => this.detalheAtual()?.parcelas.length ?? this.venda()?.parcelas.length ?? 0,
  );
  protected readonly vencimento = computed(
    () => this.parcelaAtual()?.vencimento ?? this.parcela()?.vencimento ?? this.fonte.referencia,
  );
  protected readonly valorBase = computed(
    () => this.parcelaAtual()?.valorBaseCentavos ?? this.parcela()?.valorCentavos ?? 0,
  );
  protected readonly atrasada = computed(
    () => (this.parcelaAtual()?.situacao ?? this.parcela()?.situacao) === 'Atrasado',
  );
  private readonly injector = inject(Injector);
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly botaoConfirmar = viewChild<ElementRef<HTMLButtonElement>>('botaoConfirmar');
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
  private sucesso: string | null = null;

  ngOnInit(): void {
    if (this.modo === 'local') {
      const detalhe = this.detalhe();
      const parcela = this.parcelaLeitura();
      if (detalhe && parcela) {
        this.preparada.set({
          detalhe,
          parcelaId: parcela.id,
          revisaoEsperada: detalhe.resumo.revisao,
          referencia: this.fonte.referencia,
        });
      }
    }
    this.rascunho.update((atual) => ({
      ...atual,
      valorRecebido: this.formatarCampoDinheiro(this.valorBase()),
    }));
  }

  private formatarCampoDinheiro(valorCentavos: number): string {
    return `${Math.floor(valorCentavos / 100)},${String(valorCentavos % 100).padStart(2, '0')}`;
  }

  protected async confirmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.concluido() || this.enviando() || this.incerto() || this.conflito()) return;
    try {
      await submit(this.campos, {
        onInvalid: (campo) => {
          const resultado = this.conversao();
          if (resultado.tipo === 'invalido' && resultado.resumo) {
            this.mensagem.set(resultado.resumo);
            this.focarAlerta();
          } else campo().errorSummary()[0]?.fieldTree().focusBoundControl();
        },
        action: async () => {
          this.mensagem.set('');
          const conversao = this.conversao();
          if (conversao.tipo !== 'sucesso') return;
          if (this.modo === 'local') {
            await this.confirmarLocal(conversao.comando);
            return;
          }
          const servico = this.servico;
          if (!servico) return;
          try {
            const resultado = servico.registrarPagamento(conversao.comando);
            if (resultado.tipo !== 'sucesso') {
              this.mensagem.set(resultado.mensagem);
              return;
            }
            this.concluido.set(true);
            this.sucesso = resultado.mensagem;
            this.modal().fechar();
          } catch {
            this.mensagem.set(
              'Não foi possível concluir o recebimento. Seus dados foram mantidos para nova tentativa.',
            );
          }
        },
      });
    } catch {
      this.mensagem.set('Não foi possível enviar. Seus dados foram mantidos para nova tentativa.');
      this.focarAlerta();
    }
  }

  private async confirmarLocal(comandoValidado: ComandoPagamento): Promise<void> {
    const preparada = this.preparada();
    if (!preparada || preparada.revisaoEsperada === null || this.alvoDesatualizado()) {
      this.mensagem.set(
        'A baixa não pode ser confirmada sem a revisão atual e a parcela original elegível. Recarregue a venda.',
      );
      this.focarAlerta();
      return;
    }
    if (this.confirmacoes.estado().tipo !== 'disponivel') {
      this.mensagem.set(
        'Há outra confirmação em andamento ou aguardando conferência. Nenhum pagamento foi enviado.',
      );
      this.focarAlerta();
      return;
    }

    this.enviando.set(true);
    this.confirmacaoIniciada.emit({
      vendaId: preparada.detalhe.resumo.id,
      parcelaId: preparada.parcelaId,
    });
    try {
      const resultado = await this.confirmacoes.confirmar(
        {
          operacao: 'baixa',
          alvo: { tipo: 'detalhe', vendaId: preparada.detalhe.resumo.id },
          referencia: preparada.referencia,
          revisaoEsperada: preparada.revisaoEsperada,
          rascunho: {
            comando: comandoValidado,
            vendaId: preparada.detalhe.resumo.id,
            parcelaId: preparada.parcelaId,
          },
        },
        (contexto) => {
          const rascunhoFixo = contexto.rascunho as {
            readonly comando: ComandoPagamento;
            readonly vendaId: string;
            readonly parcelaId: string;
          };
          if (
            rascunhoFixo.vendaId !== preparada.detalhe.resumo.id ||
            rascunhoFixo.parcelaId !== preparada.parcelaId ||
            rascunhoFixo.comando.vendaId !== preparada.detalhe.resumo.id ||
            rascunhoFixo.comando.parcelaId !== preparada.parcelaId
          ) {
            throw new ErroContratoApi('O pagamento preparado não corresponde ao alvo capturado.');
          }
          return this.fonte
            .registrarPagamento({
              comando: rascunhoFixo.comando,
              revisaoEsperada: contexto.revisaoEsperada,
            })
            .pipe(map((resposta) => this.validarRespostaPagamento(resposta, rascunhoFixo.comando)));
        },
      );
      this.enviando.set(false);
      if (resultado.tipo !== 'sucesso') {
        if (resultado.codigo === 'conflito-revisao') {
          this.conflito.set(true);
          this.mensagem.set(
            'A venda mudou desde a consulta. O pagamento não foi enviado; recarregue e revise a mesma parcela antes de confirmar novamente.',
          );
        } else {
          this.mensagem.set(resultado.mensagem);
        }
        this.focarAlerta();
        return;
      }
      this.concluido.set(true);
      this.sucesso = resultado.mensagem;
      this.encerrado.emit(resultado.mensagem);
    } catch {
      this.enviando.set(false);
      const estado = this.confirmacoes.estado();
      if (estado.tipo === 'incerto') {
        this.incerto.set(true);
        this.mensagem.set(
          'O resultado do pagamento está incerto. Não reenvie; feche o diálogo e confira os dados antes de tentar outra operação.',
        );
      } else {
        this.mensagem.set(
          'Não foi possível preparar o pagamento. Seus dados foram mantidos e nenhuma confirmação foi aceita.',
        );
        this.focarAlerta();
      }
    }
  }

  private validarRespostaPagamento(
    resposta: Resultado<VendaDetalheLeitura>,
    comando: ComandoPagamento,
  ): Resultado<VendaDetalheLeitura> {
    if (resposta.tipo !== 'sucesso') return resposta;
    const detalhe = resposta.valor;
    const recebimento = detalhe.recebimentos.find(
      (item) =>
        item.origem === 'Individual' &&
        item.data === comando.data &&
        item.forma === comando.forma &&
        item.valorCentavos === comando.valorCentavos &&
        item.observacao === (comando.observacao ?? '') &&
        item.alocacoes.length === 1 &&
        item.alocacoes[0]?.parcelaId === comando.parcelaId &&
        item.alocacoes[0]?.valorCentavos === comando.valorCentavos,
    );
    if (detalhe.resumo.id !== comando.vendaId || detalhe.resumo.revisao === null || !recebimento) {
      throw new ErroContratoApi('A confirmação retornou um recebimento incompatível.');
    }
    return resposta;
  }

  protected async recarregarAposConflito(): Promise<void> {
    const preparada = this.preparada();
    if (!preparada || !this.conflito() || this.recarregando()) return;
    this.recarregando.set(true);
    this.mensagem.set('Consultando a venda para revisar a mesma parcela…');
    try {
      const resultado = await firstValueFrom(
        this.fonte.consultarVenda(preparada.detalhe.resumo.id),
      );
      if (resultado.tipo !== 'sucesso') {
        throw new Error('A consulta da venda não foi concluída.');
      }
      const detalhe = resultado.valor;
      if (detalhe.resumo.id !== preparada.detalhe.resumo.id) {
        throw new ErroContratoApi('A consulta retornou outro identificador de venda.');
      }
      if (detalhe.resumo.revisao === null) {
        throw new ErroContratoApi('A consulta não forneceu uma revisão válida.');
      }
      const parcela = detalhe.parcelas.find((item) => item.id === preparada.parcelaId);
      const primeiraPendente = detalhe.parcelas.find((item) => item.situacao !== 'Paga');
      this.preparada.set({
        ...preparada,
        detalhe,
        revisaoEsperada: detalhe.resumo.revisao,
      });
      this.conflito.set(false);
      if (
        detalhe.resumo.statusAdministrativo !== 'Ativo' ||
        !parcela ||
        parcela.situacao === 'Paga' ||
        primeiraPendente?.id !== preparada.parcelaId
      ) {
        this.alvoDesatualizado.set(true);
        this.mensagem.set(
          'A parcela selecionada não é mais a primeira pendente. Nenhum novo pagamento foi enviado; feche e reabra o detalhe para consultar o alvo atual.',
        );
        this.focarAlerta();
      } else {
        this.alvoDesatualizado.set(false);
        this.mensagem.set(
          `Venda recarregada. A parcela ${parcela.numero} continua sendo a primeira pendente. Revise os dados e confirme novamente.`,
        );
        afterNextRender(() => this.botaoConfirmar()?.nativeElement.focus(), {
          injector: this.injector,
        });
      }
    } catch {
      this.mensagem.set(
        'Não foi possível recarregar a venda. O alvo e o rascunho foram preservados; nenhum novo pagamento foi enviado.',
      );
      this.focarAlerta();
    } finally {
      this.recarregando.set(false);
    }
  }

  private focarAlerta(): void {
    afterNextRender(() => this.alerta()?.nativeElement.focus(), { injector: this.injector });
  }

  protected cancelar(): void {
    this.modal().fechar();
  }

  protected fechar(): void {
    this.encerrado.emit(this.sucesso);
  }
}
