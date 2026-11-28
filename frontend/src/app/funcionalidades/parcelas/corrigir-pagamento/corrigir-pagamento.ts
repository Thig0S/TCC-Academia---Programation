import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
  linkedSignal,
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
import { RecebimentoLeitura, VendaDetalheLeitura } from '../../../nucleo/dados/modelos-leitura';
import { ServicoDemonstracao } from '../../../nucleo/demonstracao/servico-demonstracao';
import { ErroCampo } from '../../vendas/formulario-venda/erro-campo';
import {
  converterEdicaoRecebimento,
  converterEdicaoRecebimentoLocal,
  iniciarEdicaoRecebimento,
  RascunhoRecebimento,
} from '../../vendas/formulario-venda/rascunhos';
import { ProjecaoParcela } from '../parcela.calculos';
import { ProjecaoVenda } from '../../vendas/venda.calculos';
import { Resultado } from '../../vendas/venda.modelos';
import { formatarDinheiro } from '../../vendas/dinheiro';
import { formatarDataCivil } from '../../vendas/data-civil';
import {
  ComandoCorrecaoPagamento,
  FORMAS_PAGAMENTO,
  PagamentoIndividualDemonstrativo,
} from '../pagamento.modelos';

interface CorrecaoPreparada {
  readonly detalhe: VendaDetalheLeitura;
  readonly recebimentoId: string;
  readonly parcelaId: string;
  readonly revisaoEsperada: string | null;
  readonly referencia: string;
}

@Component({
  selector: 'app-corrigir-pagamento',
  imports: [Modal, FormField, ErroCampo],
  templateUrl: './corrigir-pagamento.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CorrigirPagamento implements OnInit {
  readonly venda = input<ProjecaoVenda | null>(null);
  readonly parcela = input<ProjecaoParcela | null>(null);
  readonly pagamento = input<PagamentoIndividualDemonstrativo | null>(null);
  readonly detalhe = input<VendaDetalheLeitura | null>(null);
  readonly recebimento = input<RecebimentoLeitura | null>(null);
  readonly restaurarFoco = input.required<() => void>();
  readonly encerrado = output<string | null>();
  readonly resultadoIncerto = output<string>();
  protected readonly modo = inject(MODO_APLICACAO);
  private readonly fonte: FonteVendas = inject(FONTE_VENDAS);
  private readonly servico =
    this.fonte instanceof FonteVendasDemonstracao ? inject(ServicoDemonstracao) : null;
  private readonly confirmacoes = inject(ControleConfirmacoes);
  private readonly modal = viewChild.required(Modal);
  protected readonly preparada = signal<CorrecaoPreparada | null>(null);
  private readonly injector = inject(Injector);
  private readonly alerta = viewChild<ElementRef<HTMLElement>>('alerta');
  private readonly botaoConfirmar = viewChild<ElementRef<HTMLButtonElement>>('botaoConfirmar');
  protected readonly rascunho = linkedSignal({
    source: () => this.pagamento()?.id ?? this.recebimento()?.id ?? null,
    computation: () => {
      const pagamento = this.pagamento();
      const recebimento = this.recebimento();
      if (pagamento) return iniciarEdicaoRecebimento(pagamento);
      if (recebimento) return iniciarEdicaoRecebimento(recebimento);
      return { data: this.fonte.referencia, forma: '', valorRecebido: '', observacao: '' };
    },
  });
  protected readonly conversao = computed(() => {
    if (this.modo === 'local') {
      const preparada = this.preparada();
      if (!preparada) {
        return {
          tipo: 'invalido' as const,
          erros: {},
          resumo: 'Não foi possível preparar o recebimento consultado. Feche e recarregue a venda.',
        };
      }
      return converterEdicaoRecebimentoLocal(
        this.rascunho(),
        preparada.detalhe,
        preparada.recebimentoId,
        preparada.referencia,
      );
    }

    const servico = this.servico;
    const venda = this.venda();
    const pagamento = this.pagamento();
    if (!servico || !venda || !pagamento) {
      return {
        tipo: 'invalido' as const,
        erros: {},
        resumo: 'Não foi possível preparar o recebimento demonstrativo.',
      };
    }
    const atual = servico.consultarVenda(venda.id);
    return converterEdicaoRecebimento(
      this.rascunho(),
      atual.tipo === 'sucesso' ? atual.valor : venda,
      pagamento.id,
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
        ? { kind: 'alvo', message: resultado.resumo }
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
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly referencia = this.fonte.referencia;
  protected readonly clienteNome = computed(() =>
    this.modo === 'local'
      ? (this.preparada()?.detalhe.resumo.cliente.nome ?? this.detalhe()?.resumo.cliente.nome ?? '')
      : (this.venda()?.cliente.nome ?? ''),
  );
  protected readonly numeroParcela = computed(() => {
    if (this.modo !== 'local') return this.parcela()?.numero ?? 0;
    const detalhe = this.preparada()?.detalhe ?? this.detalhe();
    const parcelaId = this.preparada()?.parcelaId ?? this.recebimento()?.alocacoes[0]?.parcelaId;
    return detalhe?.parcelas.find((item) => item.id === parcelaId)?.numero ?? 0;
  });
  protected readonly quantidadeParcelas = computed(() =>
    this.modo === 'local'
      ? (this.preparada()?.detalhe.parcelas.length ?? this.detalhe()?.parcelas.length ?? 0)
      : (this.venda()?.parcelas.length ?? 0),
  );
  protected readonly valorBase = computed(() => {
    if (this.modo !== 'local') return this.parcela()?.valorCentavos ?? 0;
    const detalhe = this.preparada()?.detalhe ?? this.detalhe();
    const parcelaId = this.preparada()?.parcelaId ?? this.recebimento()?.alocacoes[0]?.parcelaId;
    return detalhe?.parcelas.find((item) => item.id === parcelaId)?.valorBaseCentavos ?? 0;
  });
  protected readonly recebimentoAtual = computed(() =>
    this.modo !== 'local'
      ? this.pagamento()
      : (this.preparada()?.detalhe.recebimentos.find(
          (item) => item.id === this.preparada()?.recebimentoId,
        ) ?? (this.preparada() ? null : this.recebimento())),
  );
  private sucesso: string | null = null;

  ngOnInit(): void {
    if (this.modo === 'local') {
      const detalhe = this.detalhe();
      const recebimento = this.recebimento();
      const alocacao = recebimento?.alocacoes[0];
      if (detalhe && recebimento && recebimento.alocacoes.length === 1 && alocacao) {
        this.preparada.set({
          detalhe,
          recebimentoId: recebimento.id,
          parcelaId: alocacao.parcelaId,
          revisaoEsperada: detalhe.resumo.revisao,
          referencia: this.fonte.referencia,
        });
      }
    }
  }

  protected async confirmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.concluido() || this.enviando() || this.incerto() || this.alvoDesatualizado()) return;
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
            const resultado = servico.corrigirPagamento(conversao.comando);
            if (resultado.tipo !== 'sucesso') {
              this.mensagem.set(resultado.mensagem);
              this.focarAlerta();
              return;
            }
            this.concluido.set(true);
            this.sucesso = resultado.mensagem;
            this.modal().fechar();
          } catch {
            this.mensagem.set(
              'Não foi possível corrigir o recebimento. Seus dados foram mantidos para nova tentativa.',
            );
            this.focarAlerta();
          }
        },
      });
    } catch {
      this.mensagem.set('Não foi possível enviar. Seus dados foram mantidos para nova tentativa.');
      this.focarAlerta();
    }
  }

  private async confirmarLocal(comandoValidado: ComandoCorrecaoPagamento): Promise<void> {
    const preparada = this.preparada();
    if (
      !preparada ||
      preparada.revisaoEsperada === null ||
      this.alvoDesatualizado() ||
      this.conflito()
    ) {
      this.mensagem.set(
        'A correção exige a revisão válida e o recebimento individual original. Recarregue e revise a venda.',
      );
      this.focarAlerta();
      return;
    }
    if (this.confirmacoes.estado().tipo !== 'disponivel') {
      this.mensagem.set(
        'Há outra confirmação em andamento ou aguardando conferência. Nenhuma correção foi enviada.',
      );
      this.focarAlerta();
      return;
    }

    this.enviando.set(true);
    try {
      const resultado = await this.confirmacoes.confirmar(
        {
          operacao: 'correcao',
          alvo: { tipo: 'detalhe', vendaId: preparada.detalhe.resumo.id },
          referencia: preparada.referencia,
          revisaoEsperada: preparada.revisaoEsperada,
          rascunho: {
            comando: comandoValidado,
            formulario: this.rascunho(),
            parcelaId: preparada.parcelaId,
          },
        },
        (contexto) => {
          const rascunhoFixo = contexto.rascunho as {
            readonly comando: ComandoCorrecaoPagamento;
            readonly formulario: RascunhoRecebimento;
            readonly parcelaId: string;
          };
          if (
            rascunhoFixo.comando.vendaId !== preparada.detalhe.resumo.id ||
            rascunhoFixo.comando.recebimentoId !== preparada.recebimentoId ||
            rascunhoFixo.parcelaId !== preparada.parcelaId
          ) {
            throw new ErroContratoApi('A correção preparada não corresponde ao alvo capturado.');
          }
          return this.fonte
            .corrigirPagamento({
              comando: rascunhoFixo.comando,
              revisaoEsperada: contexto.revisaoEsperada,
            })
            .pipe(
              map((resposta) =>
                this.validarRespostaCorrecao(resposta, rascunhoFixo.comando, preparada),
              ),
            );
        },
      );
      if (resultado.tipo !== 'sucesso') {
        if (this.confirmacoes.estado().tipo === 'incerto') {
          this.notificarIncerteza();
        } else if (resultado.codigo === 'conflito-revisao') {
          this.conflito.set(true);
          this.mensagem.set(
            'A venda mudou desde a consulta. A correção não foi aplicada; recarregue e revise o mesmo recebimento antes de confirmar novamente.',
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
      if (this.confirmacoes.estado().tipo === 'incerto') {
        this.notificarIncerteza();
      } else {
        this.mensagem.set(
          'Não foi possível preparar a correção. Seus dados foram mantidos e nenhuma confirmação foi aceita.',
        );
        this.focarAlerta();
      }
    } finally {
      this.enviando.set(false);
    }
  }

  private validarRespostaCorrecao(
    resposta: Resultado<VendaDetalheLeitura>,
    comando: ComandoCorrecaoPagamento,
    preparada: CorrecaoPreparada,
  ) {
    if (resposta.tipo !== 'sucesso') return resposta;
    const detalhe = resposta.valor;
    const recebimentosComMesmoId = detalhe.recebimentos.filter(
      (item) => item.id === comando.recebimentoId,
    );
    const recebimento = recebimentosComMesmoId[0];
    const parcela = detalhe.parcelas.find((item) => item.id === preparada.parcelaId);
    const alocacao = recebimento?.alocacoes[0];
    const quantidadeAnterior = preparada.detalhe.recebimentos.length;
    const outrosRecebimentosAntes = preparada.detalhe.recebimentos.filter(
      (item) => item.id !== comando.recebimentoId,
    );
    const outrosRecebimentosDepois = detalhe.recebimentos.filter(
      (item) => item.id !== comando.recebimentoId,
    );
    const preservouOutrosRecebimentos =
      outrosRecebimentosAntes.length === outrosRecebimentosDepois.length &&
      outrosRecebimentosAntes.every((anterior, indice) => {
        const atual = outrosRecebimentosDepois[indice];
        return (
          atual?.id === anterior.id &&
          atual.data === anterior.data &&
          atual.forma === anterior.forma &&
          atual.origem === anterior.origem &&
          atual.valorCentavos === anterior.valorCentavos &&
          atual.acrescimoCentavos === anterior.acrescimoCentavos &&
          atual.observacao === anterior.observacao &&
          atual.alocacoes.length === anterior.alocacoes.length &&
          atual.alocacoes.every(
            (item, posicao) =>
              item.parcelaId === anterior.alocacoes[posicao]?.parcelaId &&
              item.valorCentavos === anterior.alocacoes[posicao]?.valorCentavos,
          )
        );
      });
    if (
      detalhe.resumo.id !== preparada.detalhe.resumo.id ||
      detalhe.resumo.revisao === null ||
      detalhe.recebimentos.length !== quantidadeAnterior ||
      recebimentosComMesmoId.length !== 1 ||
      recebimento?.origem !== 'Individual' ||
      !preservouOutrosRecebimentos ||
      recebimento.data !== comando.data ||
      recebimento.forma !== comando.forma ||
      recebimento.valorCentavos !== comando.valorCentavos ||
      recebimento.observacao !== comando.observacao ||
      recebimento.alocacoes.length !== 1 ||
      alocacao?.parcelaId !== preparada.parcelaId ||
      alocacao.valorCentavos !== comando.valorCentavos ||
      !parcela ||
      recebimento.acrescimoCentavos !== comando.valorCentavos - parcela.valorBaseCentavos
    ) {
      throw new ErroContratoApi('A resposta da correção não preservou o recebimento e a alocação.');
    }
    return resposta;
  }

  protected async recarregarAposConflito(): Promise<void> {
    const preparada = this.preparada();
    if (!preparada || !this.conflito() || this.recarregando()) return;
    this.recarregando.set(true);
    this.mensagem.set('Consultando a venda para revisar o mesmo recebimento…');
    try {
      const resultado = await firstValueFrom(
        this.fonte.consultarVenda(preparada.detalhe.resumo.id),
      );
      if (resultado.tipo !== 'sucesso') {
        throw new Error('A consulta da venda não foi concluída.');
      }
      const detalhe = resultado.valor;
      if (detalhe.resumo.id !== preparada.detalhe.resumo.id || detalhe.resumo.revisao === null) {
        throw new ErroContratoApi('A consulta não confirmou a venda e revisão originais.');
      }
      const recebimento = detalhe.recebimentos.find((item) => item.id === preparada.recebimentoId);
      const elegivel =
        detalhe.resumo.statusAdministrativo === 'Ativo' &&
        recebimento?.origem === 'Individual' &&
        recebimento.alocacoes.length === 1 &&
        recebimento.alocacoes[0]?.parcelaId === preparada.parcelaId &&
        detalhe.parcelas.some((item) => item.id === preparada.parcelaId);

      this.conflito.set(false);
      this.preparada.set({
        ...preparada,
        detalhe,
        revisaoEsperada: detalhe.resumo.revisao,
      });
      if (!elegivel) {
        this.alvoDesatualizado.set(true);
        this.mensagem.set(
          'O recebimento original não está mais elegível para correção. Nenhum novo comando foi enviado.',
        );
        this.focarAlerta();
        return;
      }

      this.mensagem.set('Venda recarregada. Revise os dados e confirme novamente.');
      afterNextRender(() => this.botaoConfirmar()?.nativeElement.focus(), {
        injector: this.injector,
      });
    } catch {
      this.mensagem.set(
        'Não foi possível recarregar a venda. O recebimento e o rascunho foram preservados; nenhuma nova correção foi enviada.',
      );
      this.focarAlerta();
    } finally {
      this.recarregando.set(false);
    }
  }

  private focarAlerta(): void {
    afterNextRender(() => this.alerta()?.nativeElement.focus(), { injector: this.injector });
  }

  private notificarIncerteza(): void {
    const aviso =
      'O resultado da correção está incerto. O rascunho foi mantido em memória; feche e confira os dados antes de repetir qualquer confirmação.';
    this.incerto.set(true);
    this.mensagem.set(aviso);
    this.resultadoIncerto.emit(aviso);
    this.modal().fechar();
  }

  protected cancelar(): void {
    this.modal().fechar();
  }

  protected fechar(): void {
    this.encerrado.emit(this.sucesso);
  }
}
