import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { map, Observable } from 'rxjs';
import { AlvoConfirmacao, ControleConfirmacoes } from '../../../nucleo/dados/controle-confirmacoes';
import { FONTE_VENDAS } from '../../../nucleo/dados/fonte-vendas';
import { ColecaoVendasLeitura, VendaDetalheLeitura } from '../../../nucleo/dados/modelos-leitura';

type LeituraConferencia =
  | { readonly tipo: 'colecao'; readonly valor: ColecaoVendasLeitura }
  | { readonly tipo: 'detalhe'; readonly valor: VendaDetalheLeitura };

const ROTAS_COLECAO = {
  abertas: ['/vendas'],
  quitadas: ['/vendas/quitadas'],
  inativas: ['/vendas/inativas'],
  prejuizos: ['/vendas/prejuizo'],
} as const;

const NOMES_COLECAO = {
  abertas: 'Vendas',
  quitadas: 'Vendas quitadas',
  inativas: 'Vendas inativas',
  prejuizos: 'Vendas em Prejuízo',
} as const;

const NOMES_OPERACAO = {
  cadastro: 'cadastro de venda',
  edicao: 'edição de cliente',
  status: 'mudança de status',
  baixa: 'baixa de parcela',
  correcao: 'correção de recebimento',
} as const;

function referenciaDaLeitura(leitura: LeituraConferencia): string {
  return leitura.tipo === 'colecao' ? leitura.valor.referencia : leitura.valor.resumo.referencia;
}

@Component({
  selector: 'app-aviso-confirmacao-incerta',
  imports: [RouterLink],
  templateUrl: './aviso-confirmacao-incerta.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvisoConfirmacaoIncerta {
  private readonly confirmacoes = inject(ControleConfirmacoes);
  private readonly fonte = inject(FONTE_VENDAS);
  protected readonly estado = this.confirmacoes.estado;
  private readonly leituraGuardada = signal<{
    readonly id: number;
    readonly valor: LeituraConferencia;
  } | null>(null);
  private readonly erroGuardado = signal<{ readonly id: number; readonly mensagem: string } | null>(
    null,
  );

  protected readonly leituraAtual = computed(() => {
    const estado = this.estado();
    const leitura = this.leituraGuardada();
    return estado.tipo === 'incerto' && leitura?.id === estado.id ? leitura.valor : null;
  });

  protected readonly erroAtual = computed(() => {
    const estado = this.estado();
    const erro = this.erroGuardado();
    return estado.tipo === 'incerto' && erro?.id === estado.id ? erro.mensagem : '';
  });

  protected readonly destino = computed(() => {
    const estado = this.estado();
    if (estado.tipo !== 'incerto') return ['/vendas'];
    return estado.contexto.alvo.tipo === 'colecao'
      ? ROTAS_COLECAO[estado.contexto.alvo.colecao]
      : ['/vendas', estado.contexto.alvo.vendaId];
  });

  protected readonly nomeDestino = computed(() => {
    const estado = this.estado();
    if (estado.tipo !== 'incerto') return '';
    return estado.contexto.alvo.tipo === 'colecao'
      ? NOMES_COLECAO[estado.contexto.alvo.colecao]
      : `detalhe da venda ${estado.contexto.alvo.vendaId}`;
  });

  protected readonly nomeOperacao = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'incerto' ? NOMES_OPERACAO[estado.contexto.operacao] : '';
  });

  protected readonly podeReconhecer = computed(() => {
    const estado = this.estado();
    return estado.tipo === 'incerto' && estado.consulta === 'concluida';
  });

  protected async consultar(): Promise<void> {
    const estado = this.estado();
    if (estado.tipo !== 'incerto' || estado.consulta === 'consultando') return;

    this.leituraGuardada.set(null);
    this.erroGuardado.set(null);
    try {
      const resultado = await this.confirmacoes.conferir(
        (alvo, referencia) => this.consultarAlvo(alvo, referencia),
        (leitura) => referenciaDaLeitura(leitura) === estado.contexto.referencia,
      );
      if (!resultado.bemSucedida) {
        this.erroGuardado.set({
          id: estado.id,
          mensagem:
            'A consulta não confirmou o alvo original. As confirmações continuam bloqueadas.',
        });
        return;
      }
      this.leituraGuardada.set({ id: estado.id, valor: resultado.valor });
    } catch {
      this.erroGuardado.set({
        id: estado.id,
        mensagem:
          'Não foi possível concluir a consulta de conferência. As confirmações continuam bloqueadas; tente consultar novamente.',
      });
    }
  }

  protected reconhecer(): void {
    if (this.confirmacoes.reconhecerConferencia()) {
      this.leituraGuardada.set(null);
      this.erroGuardado.set(null);
    }
  }

  protected resumoLeitura(leitura: LeituraConferencia): string {
    if (leitura.tipo === 'colecao') {
      const quantidade = leitura.valor.vendas.length;
      const substantivo = quantidade === 1 ? 'venda' : 'vendas';
      return `A coleção foi consultada e contém ${quantidade} ${substantivo}. Essa leitura não confirma o cadastro e não permite concluir pela semelhança do cliente.`;
    }
    const detalhe = leitura.valor;
    return `O detalhe do alvo original foi consultado: status ${detalhe.resumo.statusAdministrativo}, ${detalhe.parcelas.length} parcelas e ${detalhe.recebimentos.length} recebimentos. A leitura não confirma nem desfaz a operação anterior.`;
  }

  private consultarAlvo(alvo: AlvoConfirmacao, referencia: string): Observable<LeituraConferencia> {
    if (alvo.tipo === 'colecao') {
      return this.fonte.consultarColecao(alvo.colecao).pipe(
        map((valor) => {
          if (
            valor.colecao !== alvo.colecao ||
            valor.referencia !== referencia ||
            !Array.isArray(valor.vendas)
          ) {
            throw new Error('A consulta não corresponde à coleção e referência originais.');
          }
          return { tipo: 'colecao' as const, valor };
        }),
      );
    }

    return this.fonte.consultarVenda(alvo.vendaId).pipe(
      map((resposta) => {
        if (
          resposta.tipo !== 'sucesso' ||
          resposta.valor.resumo.id !== alvo.vendaId ||
          resposta.valor.resumo.referencia !== referencia
        ) {
          throw new Error('A consulta não confirmou o detalhe original.');
        }
        return { tipo: 'detalhe' as const, valor: resposta.valor };
      }),
    );
  }
}
