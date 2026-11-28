import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, submit, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { MODO_APLICACAO } from '../../../nucleo/configuracao/modo-aplicacao';
import { ControleConfirmacoes } from '../../../nucleo/dados/controle-confirmacoes';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { ErroContratoApi } from '../../../nucleo/dados/contratos-api';
import { EstadoConsultaPorChave } from '../../../nucleo/dados/estado-consulta';
import { FONTE_VENDAS } from '../../../nucleo/dados/fonte-vendas';
import { VendaDetalheLeitura } from '../../../nucleo/dados/modelos-leitura';
import { RetornoFormulario } from '../../../nucleo/navegacao/retorno-formulario';
import { IdentificacaoCliente } from '../formulario-venda/identificacao-cliente';
import {
  copiarCliente,
  ErrosCampos,
  converterEdicao,
  errosCliente,
  RascunhoCliente,
} from '../formulario-venda/rascunhos';
import { Resultado } from '../venda.modelos';

type CampoEdicao = keyof RascunhoCliente;

const CAMPOS_EDICAO_API: Readonly<Record<string, CampoEdicao>> = {
  nome: 'nome',
  cpf: 'cpf',
  telefone: 'telefone',
  descricao: 'descricao',
};

function mapearCampoApi(campo: string | null | undefined): CampoEdicao | null {
  return campo && Object.hasOwn(CAMPOS_EDICAO_API, campo) ? CAMPOS_EDICAO_API[campo] : null;
}

function rascunhoVazio(): RascunhoCliente {
  return { nome: '', cpf: '', telefone: '', descricao: '' };
}

@Component({
  selector: 'app-editar-venda',
  imports: [Cabecalho, RouterLink, IdentificacaoCliente],
  templateUrl: './editar-venda.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditarVenda {
  private readonly fonte = inject(FONTE_VENDAS);
  private readonly rota = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly retorno = inject(RetornoFormulario);
  protected readonly modo = inject(MODO_APLICACAO);
  private readonly controleConsultas = inject(ControleConsultas);
  private readonly confirmacoes = inject(ControleConfirmacoes);
  private readonly consultaInterna = new EstadoConsultaPorChave<Resultado<VendaDetalheLeitura>>(
    this.controleConsultas,
  );
  private readonly parametros = toSignal(this.rota.paramMap, {
    initialValue: this.rota.snapshot.paramMap,
  });
  protected readonly id = computed(() => this.parametros().get('id') ?? '');
  protected readonly estadoConsulta = this.consultaInterna.estado;
  protected readonly rascunho = signal(rascunhoVazio());
  private readonly idRascunho = signal<string | null>(null);
  private readonly idClienteCarregado = signal<string | null>(null);
  protected readonly errosApi = signal<ErrosCampos<RascunhoCliente>>({});
  protected readonly mensagem = signal('');
  protected readonly concluido = signal(false);
  protected readonly enviando = signal(false);
  protected readonly conflitoRevisao = signal(false);
  private readonly origem: unknown =
    this.router.currentNavigation()?.extras.state?.['origemEdicao'];
  private readonly rascunhoRejeitado = signal<string | null>(null);

  protected readonly campos = form(this.rascunho, (p) => {
    for (const chave of ['nome', 'cpf', 'telefone', 'descricao'] as const) {
      validate(p[chave], () => {
        const errosLocais = errosCliente(this.rascunho());
        const mensagem = errosLocais[chave] ?? this.errosApi()[chave];
        return mensagem ? { kind: 'dominio', message: mensagem } : null;
      });
    }
  });

  protected readonly podeConfirmar = computed(() => {
    const estado = this.estadoConsulta();
    const confirmacao = this.confirmacoes.estado();
    if (
      estado.tipo !== 'pronto' ||
      estado.chave.tipo !== 'detalhe' ||
      estado.chave.vendaId !== this.id() ||
      estado.valor.tipo !== 'sucesso' ||
      estado.valor.valor.resumo.id !== this.id()
    ) {
      return false;
    }
    return (
      (this.modo === 'demonstrativo' || estado.valor.valor.resumo.revisao !== null) &&
      confirmacao.tipo === 'disponivel' &&
      !this.conflitoRevisao() &&
      !this.concluido()
    );
  });

  private readonly acompanharConsulta = effect((onCleanup) => {
    this.controleConsultas.geracao();
    const id = this.id();
    untracked(() => {
      if (!id) {
        this.consultaInterna.cancelar();
        return;
      }
      this.carregarDetalhe(id);
    });
    onCleanup(() => untracked(() => this.consultaInterna.cancelar()));
  });

  private readonly prepararRascunho = effect(() => {
    const id = this.id();
    const estado = this.estadoConsulta();
    if (this.idRascunho() !== id) {
      this.rascunho.set(rascunhoVazio());
      this.idRascunho.set(id);
      this.idClienteCarregado.set(null);
      this.rascunhoRejeitado.set(null);
      this.errosApi.set({});
      this.mensagem.set('');
      this.conflitoRevisao.set(false);
      this.concluido.set(false);
      return;
    }
    if (
      this.idClienteCarregado() === id ||
      estado.tipo !== 'pronto' ||
      estado.chave.tipo !== 'detalhe' ||
      estado.chave.vendaId !== id ||
      estado.valor.tipo !== 'sucesso' ||
      estado.valor.valor.resumo.id !== id
    ) {
      return;
    }
    this.rascunho.set(copiarCliente(estado.valor.valor.resumo.cliente));
    this.idClienteCarregado.set(id);
  });

  private readonly limparErrosAoEditar = effect(() => {
    const snapshot = this.rascunhoRejeitado();
    if (snapshot === null || JSON.stringify(this.rascunho()) === snapshot) return;
    this.rascunhoRejeitado.set(null);
    this.errosApi.set({});
    this.mensagem.set('');
  });

  protected async confirmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.concluido() || this.enviando()) return;
    if (!this.podeConfirmar()) {
      this.mensagem.set(
        this.confirmacoes.estado().tipo === 'incerto'
          ? 'O resultado da edição está incerto. Não reenvie; consulte os dados antes de tentar novamente.'
          : 'Aguarde uma consulta válida do detalhe antes de confirmar a edição.',
      );
      return;
    }
    this.enviando.set(true);
    try {
      await submit(this.campos, {
        onInvalid: (campo) => campo().errorSummary()[0]?.fieldTree().focusBoundControl(),
        action: async () => {
          this.mensagem.set('');
          this.errosApi.set({});
          const estado = this.estadoConsulta();
          if (
            estado.tipo !== 'pronto' ||
            estado.chave.tipo !== 'detalhe' ||
            estado.chave.vendaId !== this.id() ||
            estado.valor.tipo !== 'sucesso'
          ) {
            this.mensagem.set('O detalhe precisa ser consultado novamente antes da confirmação.');
            return;
          }
          const vendaId = estado.chave.vendaId;
          const revisaoEsperada = estado.valor.valor.resumo.revisao;
          const conversao = converterEdicao(this.rascunho(), vendaId);
          if (conversao.tipo !== 'sucesso') return;
          const rascunhoConfirmado = structuredClone(this.rascunho());
          try {
            const resultado = await this.confirmacoes.confirmar(
              {
                operacao: 'edicao',
                alvo: { tipo: 'detalhe', vendaId },
                referencia: this.fonte.referencia,
                revisaoEsperada,
                rascunho: rascunhoConfirmado,
              },
              (contexto) =>
                this.fonte
                  .editarCliente({
                    comando: conversao.comando,
                    revisaoEsperada: contexto.revisaoEsperada,
                  })
                  .pipe(
                    map((resposta) => {
                      if (
                        resposta.tipo === 'sucesso' &&
                        (contexto.alvo.tipo !== 'detalhe' ||
                          resposta.valor.resumo.id !== contexto.alvo.vendaId)
                      ) {
                        throw new ErroContratoApi(
                          'A edição retornou outro identificador de venda.',
                        );
                      }
                      return resposta;
                    }),
                  ),
            );
            if (resultado.tipo !== 'sucesso') {
              this.apresentarRecusa(resultado);
              return;
            }
            this.concluido.set(true);
            this.retorno.anunciar(resultado.mensagem);
            await this.router.navigate(['/vendas', resultado.valor.resumo.id]);
          } catch {
            this.mensagem.set(
              'Não foi possível confirmar a edição. O resultado está incerto; não reenvie e consulte os dados antes de tentar novamente.',
            );
            this.rascunhoRejeitado.set(JSON.stringify(this.rascunho()));
          }
        },
      });
    } finally {
      this.enviando.set(false);
    }
  }

  protected recarregarDetalhe(): void {
    const id = this.id();
    if (id) this.carregarDetalhe(id);
  }

  protected renovarRevisao(): void {
    this.conflitoRevisao.set(false);
    this.mensagem.set('');
    this.recarregarDetalhe();
  }

  protected cancelar(): void {
    this.retorno.preparar(`editar-${this.id()}`);
    const destino =
      this.origem === 'abertas'
        ? ['/vendas']
        : this.origem === 'quitadas'
          ? ['/vendas/quitadas']
          : this.origem === 'inativas'
            ? ['/vendas/inativas']
            : this.origem === 'prejuizo'
              ? ['/vendas/prejuizo']
              : ['/vendas', this.id()];
    void this.router.navigate(destino);
  }

  private carregarDetalhe(id: string): void {
    this.consultaInterna.carregar(
      { tipo: 'detalhe', vendaId: id, referencia: this.fonte.referencia },
      () =>
        this.fonte.consultarVenda(id).pipe(
          map((resposta) => {
            if (resposta.tipo === 'sucesso' && resposta.valor.resumo.id !== id) {
              throw new ErroContratoApi('A consulta retornou outro identificador de venda.');
            }
            return resposta;
          }),
        ),
      (resultado) => resultado.tipo === 'inexistencia' && resultado.codigo === 'venda-inexistente',
    );
  }

  private apresentarRecusa(
    resultado: Exclude<Resultado<VendaDetalheLeitura>, { tipo: 'sucesso' }>,
  ): void {
    if (resultado.codigo === 'conflito-revisao') {
      this.conflitoRevisao.set(true);
      this.mensagem.set(
        'A venda mudou desde a consulta. Seus dados foram mantidos; recarregue o detalhe e confirme novamente.',
      );
      return;
    }

    if (resultado.tipo === 'validacao') {
      const erros: ErrosCampos<RascunhoCliente> = {};
      const camposConhecidos: CampoEdicao[] = [];
      const respostas = resultado.erros?.length
        ? resultado.erros
        : [{ campo: resultado.campo ?? null, mensagem: resultado.mensagem }];
      let possuiErroNaoMapeado = false;
      for (const erro of respostas) {
        const campo = mapearCampoApi(erro.campo);
        if (campo) {
          erros[campo] = erros[campo] ? `${erros[campo]} ${erro.mensagem}` : erro.mensagem;
          if (!camposConhecidos.includes(campo)) camposConhecidos.push(campo);
        } else {
          possuiErroNaoMapeado = true;
        }
      }
      this.errosApi.set(erros);
      this.rascunhoRejeitado.set(JSON.stringify(this.rascunho()));
      this.mensagem.set(
        possuiErroNaoMapeado || camposConhecidos.length === 0
          ? 'A API recusou os dados da edição. Revise os campos; seus valores foram mantidos.'
          : resultado.mensagem,
      );
      const primeiroCampo = camposConhecidos[0];
      if (primeiroCampo) {
        const campo = this.campos[primeiroCampo]();
        campo.markAsTouched();
        campo.focusBoundControl();
      }
      return;
    }

    this.mensagem.set(resultado.mensagem);
    this.rascunhoRejeitado.set(JSON.stringify(this.rascunho()));
  }
}
