import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { form, FormField, submit, validate } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { Cabecalho } from '../../../compartilhado/componentes/cabecalho/cabecalho';
import { MODO_APLICACAO } from '../../../nucleo/configuracao/modo-aplicacao';
import { ControleConfirmacoes } from '../../../nucleo/dados/controle-confirmacoes';
import { ControleConsultas } from '../../../nucleo/dados/controle-consultas';
import { EstadoConsultaPorChave } from '../../../nucleo/dados/estado-consulta';
import { FONTE_VENDAS } from '../../../nucleo/dados/fonte-vendas';
import { ColecaoVendasLeitura, VendaDetalheLeitura } from '../../../nucleo/dados/modelos-leitura';
import { RetornoFormulario } from '../../../nucleo/navegacao/retorno-formulario';
import { FORMAS_PAGAMENTO } from '../../parcelas/pagamento.modelos';
import { formatarDataCivil } from '../data-civil';
import { formatarDinheiro, subtrairCentavos } from '../dinheiro';
import { IdentificacaoCliente } from '../formulario-venda/identificacao-cliente';
import { ErroCampo } from '../formulario-venda/erro-campo';
import {
  converterCadastro,
  ErrosCampos,
  iniciarCadastro,
  prepararPrevia,
  RascunhoCadastro,
} from '../formulario-venda/rascunhos';
import { Resultado } from '../venda.modelos';

type CampoCadastro = keyof RascunhoCadastro;

const CAMPOS_CADASTRO_API: Readonly<Record<string, CampoCadastro>> = {
  nome: 'nome',
  cpf: 'cpf',
  telefone: 'telefone',
  descricao: 'descricao',
  data: 'dataVenda',
  dataVenda: 'dataVenda',
  valor: 'valorTotal',
  valorTotal: 'valorTotal',
  valorTotalCentavos: 'valorTotal',
  quantidadeParcelas: 'quantidadeParcelas',
  entrada: 'valorEntrada',
  'entrada.valorCentavos': 'valorEntrada',
  'entrada.data': 'dataVenda',
  'entrada.forma': 'formaEntrada',
  forma: 'formaEntrada',
};

function mapearCampoApi(campo: string | null | undefined): CampoCadastro | null {
  return campo && Object.hasOwn(CAMPOS_CADASTRO_API, campo) ? CAMPOS_CADASTRO_API[campo] : null;
}

@Component({
  selector: 'app-cadastrar-venda',
  imports: [Cabecalho, RouterLink, FormField, IdentificacaoCliente, ErroCampo],
  templateUrl: './cadastrar-venda.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CadastrarVenda {
  private readonly fonte = inject(FONTE_VENDAS);
  private readonly router = inject(Router);
  private readonly retorno = inject(RetornoFormulario);
  protected readonly modo = inject(MODO_APLICACAO);
  private readonly controleConsultas = inject(ControleConsultas);
  private readonly confirmacoes = inject(ControleConfirmacoes);
  private readonly consultaColecao = new EstadoConsultaPorChave<ColecaoVendasLeitura>(
    this.controleConsultas,
  );
  protected readonly estadoColecao = this.consultaColecao.estado;
  protected readonly referencia = this.fonte.referencia;
  protected readonly rascunho = signal(iniciarCadastro(this.referencia));
  protected readonly errosApi = signal<ErrosCampos<RascunhoCadastro>>({});
  protected readonly conversao = computed(() =>
    converterCadastro(this.rascunho(), this.referencia),
  );
  protected readonly campos = form(this.rascunho, (p) => {
    for (const chave of [
      'nome',
      'cpf',
      'telefone',
      'descricao',
      'temEntrada',
      'dataVenda',
      'valorTotal',
      'valorEntrada',
      'formaEntrada',
      'quantidadeParcelas',
    ] as const) {
      validate(p[chave], () => {
        const resultado = this.conversao();
        const mensagem = resultado.tipo === 'invalido' ? resultado.erros[chave] : null;
        const mensagemApi = this.errosApi()[chave];
        return mensagem
          ? { kind: 'dominio', message: mensagem }
          : mensagemApi
            ? { kind: 'api', message: mensagemApi }
            : null;
      });
    }
  });
  protected readonly previa = computed(() => prepararPrevia(this.rascunho(), this.referencia));
  protected readonly formas = FORMAS_PAGAMENTO;
  protected readonly mensagem = signal('');
  protected readonly concluido = signal(false);
  protected readonly enviando = signal(false);
  protected readonly conflitoRevisao = signal(false);
  protected readonly formatarDinheiro = formatarDinheiro;
  protected readonly formatarDataCivil = formatarDataCivil;
  protected readonly subtrairCentavos = subtrairCentavos;
  protected readonly podeConfirmar = computed(() => {
    const estado = this.estadoColecao();
    const confirmacao = this.confirmacoes.estado();
    return (
      estado.tipo === 'pronto' &&
      estado.valor.colecao === 'abertas' &&
      estado.valor.referencia === this.referencia &&
      (this.modo === 'demonstrativo' || estado.valor.revisao !== null) &&
      confirmacao.tipo === 'disponivel' &&
      !this.conflitoRevisao()
    );
  });

  private readonly rascunhoRejeitado = signal<string | null>(null);

  private readonly acompanharColecao = effect((onCleanup) => {
    this.controleConsultas.geracao();
    untracked(() => this.carregarColecao());
    onCleanup(() => untracked(() => this.consultaColecao.cancelar()));
  });

  private readonly limparErrosAoEditar = effect(() => {
    const snapshot = this.rascunhoRejeitado();
    if (snapshot === null || JSON.stringify(this.rascunho()) === snapshot) return;
    this.rascunhoRejeitado.set(null);
    this.errosApi.set({});
    this.mensagem.set('');
  });

  protected recarregarColecao(): void {
    this.carregarColecao();
  }

  protected renovarRevisao(): void {
    this.conflitoRevisao.set(false);
    this.mensagem.set('');
    this.carregarColecao();
  }

  protected async confirmar(evento: Event): Promise<void> {
    evento.preventDefault();
    if (this.concluido() || this.enviando()) return;
    if (!this.podeConfirmar()) {
      this.mensagem.set(
        this.confirmacoes.estado().tipo === 'incerto'
          ? 'O resultado do cadastro está incerto. Não reenvie; consulte os dados antes de tentar novamente.'
          : 'Aguarde uma consulta válida da coleção antes de confirmar o cadastro.',
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
          const conversao = converterCadastro(this.rascunho(), this.referencia);
          if (conversao.tipo !== 'sucesso') return;
          const estado = this.estadoColecao();
          if (estado.tipo !== 'pronto' || estado.valor.revisao === undefined) {
            this.mensagem.set('A coleção precisa ser consultada novamente antes da confirmação.');
            return;
          }
          const revisaoEsperada = estado.valor.revisao;
          const rascunhoConfirmado = structuredClone(this.rascunho());
          try {
            const resultado = await this.confirmacoes.confirmar(
              {
                operacao: 'cadastro',
                alvo: { tipo: 'colecao', colecao: 'abertas' },
                referencia: this.referencia,
                revisaoEsperada,
                rascunho: rascunhoConfirmado,
              },
              (contexto) =>
                this.fonte.cadastrarVenda({
                  comando: conversao.comando,
                  revisaoEsperada: contexto.revisaoEsperada,
                }),
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
              'Não foi possível confirmar o cadastro. O resultado está incerto; não reenvie e consulte os dados antes de tentar novamente.',
            );
            this.rascunhoRejeitado.set(JSON.stringify(this.rascunho()));
          }
        },
      });
    } finally {
      this.enviando.set(false);
    }
  }

  protected cancelar(): void {
    this.retorno.preparar('nova-venda');
    void this.router.navigate(['/vendas']);
  }

  private carregarColecao(): void {
    this.consultaColecao.carregar(
      { tipo: 'colecao', colecao: 'abertas', referencia: this.referencia },
      () => this.fonte.consultarColecao('abertas'),
    );
  }

  private apresentarRecusa(
    resultado: Exclude<Resultado<VendaDetalheLeitura>, { tipo: 'sucesso' }>,
  ): void {
    if (resultado.codigo === 'conflito-revisao') {
      this.conflitoRevisao.set(true);
      this.mensagem.set(
        'A coleção mudou desde a consulta. Seus dados foram mantidos; recarregue a coleção e confirme novamente.',
      );
      return;
    }

    if (resultado.tipo === 'validacao') {
      const erros: ErrosCampos<RascunhoCadastro> = {};
      const camposConhecidos: CampoCadastro[] = [];
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
          ? 'A API recusou os dados informados. Revise o formulário; seus valores foram mantidos.'
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
