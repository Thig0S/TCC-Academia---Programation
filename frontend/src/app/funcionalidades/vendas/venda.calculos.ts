import { projetarParcela, ProjecaoParcela } from '../parcelas/parcela.calculos';
import { formaAceita } from '../parcelas/pagamento.modelos';
import { compararDatasCivis, limitesDoMes } from './data-civil';
import { somarCentavos, subtrairCentavos, validarCentavos } from './dinheiro';
import { Resultado, SituacaoVenda, statusAdministrativoValido, Venda } from './venda.modelos';
import { prepararCadastro } from './venda.validacoes';

export interface ProjecaoVenda extends Venda {
  readonly parcelas: readonly ProjecaoParcela[];
  readonly valorTotalEfetivoCentavos: number;
  readonly totalPagoCentavos: number;
  readonly saldoCentavos: number;
  readonly quantidadePaga: number;
  readonly proximoVencimento: string | null;
  readonly situacao: SituacaoVenda;
}

export interface ResumoVendas {
  readonly totalEmAbertoCentavos: number;
  readonly valoresEmAtrasoCentavos: number;
  readonly recebidoNoMesCentavos: number;
  readonly vendasCadastradas: number;
}

function exigir(condicao: boolean, mensagem: string): void {
  if (!condicao) throw new RangeError(mensagem);
}

/** Confere o histórico inteiro, não apenas o último comando. Sem efeitos colaterais. */
export function validarVenda(venda: Venda, referencia: string): void {
  exigir(statusAdministrativoValido(venda.statusAdministrativo), 'Status administrativo inválido.');
  const preparada = prepararCadastro(
    { ...venda, quantidadeParcelas: venda.parcelas.length },
    referencia,
    venda.id,
  );
  exigir(preparada.tipo === 'sucesso', 'A venda contém dados inválidos.');
  if (preparada.tipo !== 'sucesso') return;
  exigir(venda.id.length > 0, 'A venda precisa de identificador.');
  const ids = new Set<string>();
  venda.parcelas.forEach((parcela, indice) => {
    const esperada = preparada.valor.parcelas[indice];
    exigir(!!parcela.id && !ids.has(parcela.id), 'Identificador de parcela inválido ou repetido.');
    ids.add(parcela.id);
    exigir(
      parcela.numero === esperada.numero &&
        parcela.valorCentavos === esperada.valorCentavos &&
        parcela.vencimento === esperada.vencimento,
      'Parcelamento incompatível com o cadastro.',
    );
  });
  const recebimentoEntrada = preparada.valor.recebimentos[0];
  if (venda.entrada) {
    const recebido = venda.recebimentos[0];
    exigir(!!recebimentoEntrada && !!recebido, 'A entrada precisa estar liquidada no cadastro.');
    exigir(
      recebido.id === recebimentoEntrada.id &&
        recebido.valorCentavos === venda.entrada.valorCentavos &&
        recebido.data === venda.entrada.data &&
        recebido.forma === venda.entrada.forma &&
        recebido.origem === undefined &&
        recebido.acrescimoCentavos === undefined &&
        recebido.observacao === undefined &&
        recebido.alocacoes.length === 1 &&
        recebido.alocacoes[0].parcelaId === preparada.valor.parcelas[0].id &&
        recebido.alocacoes[0].valorCentavos === venda.entrada.valorCentavos,
      'O recebimento inicial precisa corresponder integralmente à entrada.',
    );
  }
  const recebimentoIds = new Set<string>();
  let proxima = 0;
  for (const recebimento of venda.recebimentos) {
    exigir(
      !!recebimento.id && !recebimentoIds.has(recebimento.id),
      'Identificador de recebimento inválido ou repetido.',
    );
    recebimentoIds.add(recebimento.id);
    exigir(formaAceita(recebimento.forma), 'Forma de recebimento inválida.');
    exigir(
      compararDatasCivis(recebimento.data, venda.dataVenda) >= 0 &&
        compararDatasCivis(recebimento.data, referencia) <= 0,
      'Data de recebimento fora do intervalo permitido.',
    );
    exigir(recebimento.alocacoes.length > 0, 'O recebimento precisa de alocações.');
    validarCentavos(recebimento.valorCentavos);
    if (recebimento.origem === 'individual') {
      exigir(recebimento.alocacoes.length === 1, 'Pagamento individual deve quitar uma parcela.');
      const parcela = venda.parcelas[proxima++];
      const alocacao = recebimento.alocacoes[0];
      const acrescimo = validarCentavos(recebimento.acrescimoCentavos);
      exigir(
        typeof recebimento.observacao === 'string' &&
          Array.from(recebimento.observacao).length <= 20,
        'A observação do pagamento individual deve ter no máximo 20 caracteres.',
      );
      exigir(
        !!parcela &&
          alocacao.parcelaId === parcela.id &&
          validarCentavos(alocacao.valorCentavos) === recebimento.valorCentavos &&
          recebimento.valorCentavos >= parcela.valorCentavos &&
          acrescimo === recebimento.valorCentavos - parcela.valorCentavos,
        'Pagamento individual incompatível com a parcela-base e seu acréscimo.',
      );
    } else {
      exigir(
        recebimento.origem === undefined &&
          recebimento.acrescimoCentavos === undefined &&
          recebimento.observacao === undefined,
        'Recebimento histórico não pode conter metadados de pagamento individual.',
      );
      for (const alocacao of recebimento.alocacoes) {
        const parcela = venda.parcelas[proxima++];
        exigir(
          !!parcela &&
            alocacao.parcelaId === parcela.id &&
            alocacao.valorCentavos === parcela.valorCentavos,
          'Alocação fora da sequência integral permitida.',
        );
      }
      exigir(
        recebimento.valorCentavos ===
          somarCentavos(recebimento.alocacoes.map((item) => item.valorCentavos)),
        'Valor do recebimento diferente das alocações históricas.',
      );
    }
  }
  const acrescimos = somarCentavos(
    venda.recebimentos
      .filter((item) => item.origem === 'individual')
      .map((item) => item.acrescimoCentavos),
  );
  const totalEfetivo = somarCentavos([venda.valorTotalCentavos, acrescimos]);
  const pago = somarCentavos(venda.recebimentos.map((item) => item.valorCentavos));
  const saldo = subtrairCentavos(totalEfetivo, pago);
  exigir(
    saldo === somarCentavos(venda.parcelas.slice(proxima).map((item) => item.valorCentavos)),
    'Saldo incompatível com as parcelas pendentes.',
  );
  exigir(venda.statusAdministrativo !== 'Prejuízo' || saldo > 0, 'Prejuízo exige saldo em aberto.');
}

export function projetarVenda(venda: Venda, referencia: string): ProjecaoVenda {
  validarVenda(venda, referencia);
  const parcelas = venda.parcelas.map((parcela) =>
    projetarParcela(parcela, venda.recebimentos, referencia),
  );
  const acrescimos = somarCentavos(
    venda.recebimentos
      .filter((item) => item.origem === 'individual')
      .map((item) => item.acrescimoCentavos),
  );
  const valorTotalEfetivoCentavos = somarCentavos([venda.valorTotalCentavos, acrescimos]);
  const pendentes = parcelas.filter((parcela) => parcela.situacao !== 'Paga');
  const totalPagoCentavos = somarCentavos(venda.recebimentos.map((item) => item.valorCentavos));
  const saldoCentavos = subtrairCentavos(valorTotalEfetivoCentavos, totalPagoCentavos);
  return {
    ...venda,
    parcelas,
    valorTotalEfetivoCentavos,
    totalPagoCentavos,
    saldoCentavos,
    quantidadePaga: parcelas.length - pendentes.length,
    proximoVencimento: pendentes.map((parcela) => parcela.vencimento).sort()[0] ?? null,
    situacao:
      saldoCentavos === 0
        ? 'Quitada'
        : pendentes.some((parcela) => parcela.situacao === 'Atrasado')
          ? 'Atrasada'
          : pendentes.some((parcela) => parcela.situacao === 'Próximos dias')
            ? 'Próximos dias'
            : 'Em aberto',
  };
}

export function projetarVendas(
  vendas: readonly Venda[],
  referencia: string,
): readonly ProjecaoVenda[] {
  const ids = vendas.flatMap((venda) => [
    venda.id,
    ...venda.parcelas.map((parcela) => parcela.id),
    ...venda.recebimentos.map((recebimento) => recebimento.id),
  ]);
  exigir(ids.length === new Set(ids).size, 'Existem identificadores repetidos no conjunto.');
  const projecoes = vendas.map((venda) => projetarVenda(venda, referencia));
  // Inclui projeções não visíveis: nenhum total financeiro inseguro pode ser aceito.
  somarCentavos(projecoes.map((venda) => venda.valorTotalCentavos));
  somarCentavos(projecoes.map((venda) => venda.valorTotalEfetivoCentavos));
  somarCentavos(projecoes.map((venda) => venda.totalPagoCentavos));
  somarCentavos(projecoes.map((venda) => venda.saldoCentavos));
  return projecoes;
}

export function separarVendas(vendas: readonly ProjecaoVenda[]): {
  readonly abertas: readonly ProjecaoVenda[];
  readonly quitadas: readonly ProjecaoVenda[];
  readonly inativas: readonly ProjecaoVenda[];
  readonly prejuizos: readonly ProjecaoVenda[];
} {
  const ativas = vendas.filter((venda) => venda.statusAdministrativo === 'Ativo');
  return {
    abertas: ativas.filter((venda) => venda.saldoCentavos > 0),
    quitadas: ativas.filter((venda) => venda.saldoCentavos === 0),
    inativas: vendas.filter((venda) => venda.statusAdministrativo === 'Inativo'),
    prejuizos: vendas.filter((venda) => venda.statusAdministrativo === 'Prejuízo'),
  };
}

export function consultarPeriodo(
  vendas: readonly Venda[],
  inicio: string,
  fim: string,
): Resultado<{ readonly recebidosCentavos: number; readonly vendas: readonly Venda[] }> {
  try {
    if (compararDatasCivis(inicio, fim) > 0)
      throw new RangeError('O início do período deve ser anterior ou igual ao fim.');
    const dentro = (data: string) =>
      compararDatasCivis(data, inicio) >= 0 && compararDatasCivis(data, fim) <= 0;
    return {
      tipo: 'sucesso',
      mensagem: 'Período consultado.',
      valor: {
        vendas: vendas.filter((venda) => dentro(venda.dataVenda)),
        recebidosCentavos: somarCentavos(
          vendas.flatMap((venda) =>
            venda.recebimentos
              .filter((item) => dentro(item.data))
              .map((item) => item.valorCentavos),
          ),
        ),
      },
    };
  } catch (erro) {
    return {
      tipo: 'validacao',
      codigo: 'periodo-invalido',
      mensagem: erro instanceof RangeError ? erro.message : 'Não foi possível consultar o período.',
    };
  }
}

export function resumirVendas(vendas: readonly Venda[], referencia: string): ResumoVendas {
  const projecoes = projetarVendas(vendas, referencia);
  const ativas = projecoes.filter((venda) => venda.statusAdministrativo === 'Ativo');
  const [inicio, fim] = limitesDoMes(referencia);
  const periodo = consultarPeriodo(vendas, inicio, fim);
  if (periodo.tipo !== 'sucesso') throw new RangeError(periodo.mensagem);
  return {
    totalEmAbertoCentavos: somarCentavos(ativas.map((venda) => venda.saldoCentavos)),
    valoresEmAtrasoCentavos: somarCentavos(
      ativas.flatMap((venda) =>
        venda.parcelas
          .filter((parcela) => parcela.situacao === 'Atrasado')
          .map((parcela) => parcela.valorCentavos),
      ),
    ),
    recebidoNoMesCentavos: periodo.valor.recebidosCentavos,
    vendasCadastradas: ativas.length,
  };
}
