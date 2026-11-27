import {
  AlocacaoLeitura,
  ClienteLeitura,
  ColecaoVendas,
  ColecaoVendasLeitura,
  FormaPagamentoLeitura,
  IndicadoresVisaoGeralLeitura,
  OrigemRecebimentoLeitura,
  ParcelaAtrasadaMensalLeitura,
  ParcelaLeitura,
  ParcelaPrejuizoMensalLeitura,
  ParcelaVisaoGeralLeitura,
  RecebimentoDiarioLeitura,
  RecebimentoLeitura,
  RecebimentoMensalLeitura,
  RelatorioMensalLeitura,
  SaldoMensalLeitura,
  SituacaoParcelaLeitura,
  SituacaoVendaLeitura,
  StatusAdministrativoLeitura,
  VendaDetalheLeitura,
  VendaResumoLeitura,
  VisaoGeralLeitura,
} from './modelos-leitura';

const REVISAO_MAXIMA = '9223372036854775807';
const CODIGOS_COLECAO: Readonly<Record<ColecaoVendas, string>> = {
  abertas: 'Abertas',
  quitadas: 'Quitadas',
  inativas: 'Inativas',
  prejuizos: 'Prejuizo',
};

export class ErroContratoApi extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErroContratoApi';
  }
}

type ObjetoJson = Record<string, unknown>;

function erro(caminho: string, esperado: string): never {
  throw new ErroContratoApi(`Resposta da API incompatível em ${caminho}; esperado ${esperado}.`);
}

function objeto(valor: unknown, caminho: string): ObjetoJson {
  if (valor === null || typeof valor !== 'object' || Array.isArray(valor)) {
    return erro(caminho, 'objeto');
  }
  return valor as ObjetoJson;
}

function propriedade(obj: ObjetoJson, nome: string, caminho: string): unknown {
  if (!Object.hasOwn(obj, nome)) return erro(`${caminho}.${nome}`, 'campo obrigatório');
  return obj[nome];
}

function lista(valor: unknown, caminho: string): readonly unknown[] {
  if (!Array.isArray(valor)) return erro(caminho, 'lista');
  return valor;
}

function texto(valor: unknown, caminho: string): string {
  if (typeof valor !== 'string') return erro(caminho, 'texto');
  return valor;
}

function id(valor: unknown, caminho: string): string {
  const resultado = texto(valor, caminho);
  if (resultado.length === 0) return erro(caminho, 'identificador textual não vazio');
  return resultado;
}

function inteiroSeguro(valor: unknown, caminho: string): number {
  if (typeof valor !== 'number' || !Number.isSafeInteger(valor) || valor < 0) {
    return erro(caminho, 'inteiro não negativo seguro');
  }
  return valor;
}

function dataCivil(valor: unknown, caminho: string): string {
  const resultado = texto(valor, caminho);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resultado)) return erro(caminho, 'data ISO civil');
  const [ano, mes, dia] = resultado.split('-').map((parte) => Number.parseInt(parte, 10));
  if (ano < 1 || ano > 9999 || mes < 1 || mes > 12) return erro(caminho, 'data ISO civil');
  const dias =
    mes === 2
      ? ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0)
        ? 29
        : 28
      : [4, 6, 9, 11].includes(mes)
        ? 30
        : 31;
  if (dia < 1 || dia > dias) return erro(caminho, 'data ISO civil existente');
  return resultado;
}

function dataCivilOpcional(valor: unknown, caminho: string): string | null {
  return valor === null ? null : dataCivil(valor, caminho);
}

function diasNoMes(ano: number, mes: number): number {
  if (mes === 2) return ano % 4 === 0 && (ano % 100 !== 0 || ano % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

export function revisaoCanonica(valor: unknown, caminho = 'revisao'): string {
  if (typeof valor !== 'string' || !/^(0|[1-9][0-9]*)$/.test(valor)) {
    return erro(caminho, 'revisão decimal textual canônica');
  }
  if (valor.length > REVISAO_MAXIMA.length || (valor.length === 19 && valor > REVISAO_MAXIMA)) {
    return erro(caminho, 'revisão entre 0 e long.MaxValue');
  }
  return valor;
}

function enumWire<T extends string>(
  valor: unknown,
  caminho: string,
  mapa: Readonly<Record<string, T>>,
): T {
  const chave = texto(valor, caminho);
  if (!Object.hasOwn(mapa, chave)) return erro(caminho, 'enum wire conhecido');
  return mapa[chave];
}

function statusAdministrativo(valor: unknown, caminho: string): StatusAdministrativoLeitura {
  return enumWire(valor, caminho, {
    Ativo: 'Ativo',
    Inativo: 'Inativo',
    Prejuizo: 'Prejuízo',
  });
}

function situacaoVenda(valor: unknown, caminho: string): SituacaoVendaLeitura {
  return enumWire(valor, caminho, {
    Quitada: 'Quitada',
    Atrasada: 'Atrasada',
    ProximosDias: 'Próximos dias',
    EmAberto: 'Em aberto',
  });
}

function situacaoParcela(valor: unknown, caminho: string): SituacaoParcelaLeitura {
  return enumWire(valor, caminho, {
    Paga: 'Paga',
    Atrasada: 'Atrasado',
    ProximosDias: 'Próximos dias',
    EmAberto: 'Aberto',
  });
}

function formaPagamento(valor: unknown, caminho: string): FormaPagamentoLeitura {
  return enumWire(valor, caminho, {
    Dinheiro: 'Dinheiro',
    Pix: 'Pix',
    CartaoDebito: 'Cartão de débito',
    CartaoCredito: 'Cartão de crédito',
  });
}

function formaPagamentoOpcional(valor: unknown, caminho: string): FormaPagamentoLeitura | null {
  return valor === null ? null : formaPagamento(valor, caminho);
}

function origemRecebimento(valor: unknown, caminho: string): OrigemRecebimentoLeitura {
  return enumWire(valor, caminho, {
    Entrada: 'Entrada',
    Individual: 'Individual',
    HistoricoLote: 'Lote',
  });
}

function colecaoWire(valor: unknown, caminho: string): ColecaoVendas {
  return enumWire(valor, caminho, {
    Abertas: 'abertas',
    Quitadas: 'quitadas',
    Inativas: 'inativas',
    Prejuizo: 'prejuizos',
  });
}

function validarReferencia(actual: string, esperada: string, caminho: string): void {
  if (actual !== esperada) return erro(caminho, `referência ${esperada}`);
}

function validarRevisao(actual: string, esperada: string | undefined, caminho: string): void {
  if (esperada !== undefined && actual !== esperada) {
    return erro(caminho, `revisão ${esperada} do mesmo snapshot`);
  }
}

export function mapearResumoApi(
  valor: unknown,
  caminho = 'resumo',
  referenciaEsperada?: string,
  revisaoEsperada?: string,
): VendaResumoLeitura {
  const obj = objeto(valor, caminho);
  const clienteObj = objeto(propriedade(obj, 'cliente', caminho), `${caminho}.cliente`);
  const descricao = propriedade(clienteObj, 'descricao', `${caminho}.cliente`);
  if (descricao !== null && typeof descricao !== 'string') {
    return erro(`${caminho}.cliente.descricao`, 'texto ou null');
  }
  const referencia = dataCivil(propriedade(obj, 'referencia', caminho), `${caminho}.referencia`);
  const revisao = revisaoCanonica(propriedade(obj, 'revisao', caminho), `${caminho}.revisao`);
  if (referenciaEsperada !== undefined) {
    validarReferencia(referencia, referenciaEsperada, `${caminho}.referencia`);
  }
  validarRevisao(revisao, revisaoEsperada, `${caminho}.revisao`);

  return {
    id: id(propriedade(obj, 'id', caminho), `${caminho}.id`),
    cliente: {
      nome: texto(propriedade(clienteObj, 'nome', `${caminho}.cliente`), `${caminho}.cliente.nome`),
      cpf: texto(propriedade(clienteObj, 'cpf', `${caminho}.cliente`), `${caminho}.cliente.cpf`),
      telefone: texto(
        propriedade(clienteObj, 'telefone', `${caminho}.cliente`),
        `${caminho}.cliente.telefone`,
      ),
      descricao,
    } satisfies ClienteLeitura,
    dataVenda: dataCivil(propriedade(obj, 'dataVenda', caminho), `${caminho}.dataVenda`),
    statusAdministrativo: statusAdministrativo(
      propriedade(obj, 'statusAdministrativo', caminho),
      `${caminho}.statusAdministrativo`,
    ),
    situacao: situacaoVenda(propriedade(obj, 'situacao', caminho), `${caminho}.situacao`),
    valorTotalCentavos: inteiroSeguro(
      propriedade(obj, 'valorTotalBaseCentavos', caminho),
      `${caminho}.valorTotalBaseCentavos`,
    ),
    acrescimosCentavos: inteiroSeguro(
      propriedade(obj, 'totalAcrescimosCentavos', caminho),
      `${caminho}.totalAcrescimosCentavos`,
    ),
    valorTotalEfetivoCentavos: inteiroSeguro(
      propriedade(obj, 'valorTotalEfetivoCentavos', caminho),
      `${caminho}.valorTotalEfetivoCentavos`,
    ),
    totalRecebidoCentavos: inteiroSeguro(
      propriedade(obj, 'totalRecebidoCentavos', caminho),
      `${caminho}.totalRecebidoCentavos`,
    ),
    saldoCentavos: inteiroSeguro(
      propriedade(obj, 'saldoCentavos', caminho),
      `${caminho}.saldoCentavos`,
    ),
    quantidadePaga: inteiroSeguro(
      propriedade(obj, 'quantidadePaga', caminho),
      `${caminho}.quantidadePaga`,
    ),
    quantidadeParcelas: inteiroSeguro(
      propriedade(obj, 'quantidadeParcelas', caminho),
      `${caminho}.quantidadeParcelas`,
    ),
    proximoVencimento: dataCivilOpcional(
      propriedade(obj, 'proximoVencimento', caminho),
      `${caminho}.proximoVencimento`,
    ),
    revisao,
    referencia,
  };
}

export function mapearParcelaApi(valor: unknown, caminho = 'parcela'): ParcelaLeitura {
  const obj = objeto(valor, caminho);
  const dataPagamento = propriedade(obj, 'dataPagamento', caminho);
  const forma = propriedade(obj, 'formaPagamento', caminho);
  return {
    id: id(propriedade(obj, 'id', caminho), `${caminho}.id`),
    numero: inteiroSeguro(propriedade(obj, 'numero', caminho), `${caminho}.numero`),
    valorBaseCentavos: inteiroSeguro(
      propriedade(obj, 'valorBaseCentavos', caminho),
      `${caminho}.valorBaseCentavos`,
    ),
    acrescimoCentavos: inteiroSeguro(
      propriedade(obj, 'acrescimoCentavos', caminho),
      `${caminho}.acrescimoCentavos`,
    ),
    valorEfetivoCentavos: inteiroSeguro(
      propriedade(obj, 'valorEfetivoCentavos', caminho),
      `${caminho}.valorEfetivoCentavos`,
    ),
    valorRecebidoCentavos: inteiroSeguro(
      propriedade(obj, 'valorRecebidoCentavos', caminho),
      `${caminho}.valorRecebidoCentavos`,
    ),
    saldoCentavos: inteiroSeguro(
      propriedade(obj, 'saldoCentavos', caminho),
      `${caminho}.saldoCentavos`,
    ),
    vencimento: dataCivil(propriedade(obj, 'vencimento', caminho), `${caminho}.vencimento`),
    situacao: situacaoParcela(propriedade(obj, 'situacao', caminho), `${caminho}.situacao`),
    dataPagamento: dataCivilOpcional(dataPagamento, `${caminho}.dataPagamento`),
    formaPagamento: formaPagamentoOpcional(forma, `${caminho}.formaPagamento`),
  };
}

function mapearAlocacaoApi(valor: unknown, caminho: string): AlocacaoLeitura {
  const obj = objeto(valor, caminho);
  return {
    parcelaId: id(propriedade(obj, 'parcelaId', caminho), `${caminho}.parcelaId`),
    valorCentavos: inteiroSeguro(
      propriedade(obj, 'valorCentavos', caminho),
      `${caminho}.valorCentavos`,
    ),
  };
}

function mapearRecebimentoApi(valor: unknown, caminho: string): RecebimentoLeitura {
  const obj = objeto(valor, caminho);
  return {
    id: id(propriedade(obj, 'id', caminho), `${caminho}.id`),
    data: dataCivil(propriedade(obj, 'data', caminho), `${caminho}.data`),
    forma: formaPagamento(propriedade(obj, 'forma', caminho), `${caminho}.forma`),
    origem: origemRecebimento(propriedade(obj, 'origem', caminho), `${caminho}.origem`),
    valorCentavos: inteiroSeguro(
      propriedade(obj, 'valorCentavos', caminho),
      `${caminho}.valorCentavos`,
    ),
    acrescimoCentavos: inteiroSeguro(
      propriedade(obj, 'acrescimoCentavos', caminho),
      `${caminho}.acrescimoCentavos`,
    ),
    observacao: texto(propriedade(obj, 'observacao', caminho), `${caminho}.observacao`),
    alocacoes: lista(propriedade(obj, 'alocacoes', caminho), `${caminho}.alocacoes`).map(
      (item, indice) => mapearAlocacaoApi(item, `${caminho}.alocacoes[${indice}]`),
    ),
  };
}

export function mapearDetalheApi(valor: unknown, referenciaEsperada: string): VendaDetalheLeitura {
  const obj = objeto(valor, 'detalhe');
  const resumo = mapearResumoApi(
    propriedade(obj, 'resumo', 'detalhe'),
    'detalhe.resumo',
    referenciaEsperada,
  );
  return {
    resumo,
    parcelas: lista(propriedade(obj, 'parcelas', 'detalhe'), 'detalhe.parcelas').map(
      (item, indice) => mapearParcelaApi(item, `detalhe.parcelas[${indice}]`),
    ),
    recebimentos: lista(propriedade(obj, 'recebimentos', 'detalhe'), 'detalhe.recebimentos').map(
      (item, indice) => mapearRecebimentoApi(item, `detalhe.recebimentos[${indice}]`),
    ),
  };
}

export function mapearColecaoApi(
  valor: unknown,
  colecaoEsperada: ColecaoVendas,
  referenciaEsperada: string,
): ColecaoVendasLeitura {
  const obj = objeto(valor, 'colecao');
  const colecao = colecaoWire(propriedade(obj, 'colecao', 'colecao'), 'colecao.colecao');
  if (colecao !== colecaoEsperada) return erro('colecao.colecao', `coleção ${colecaoEsperada}`);
  const referencia = dataCivil(propriedade(obj, 'referencia', 'colecao'), 'colecao.referencia');
  validarReferencia(referencia, referenciaEsperada, 'colecao.referencia');
  const revisao = revisaoCanonica(propriedade(obj, 'revisao', 'colecao'), 'colecao.revisao');
  const vendas = lista(propriedade(obj, 'vendas', 'colecao'), 'colecao.vendas').map(
    (item, indice) => mapearResumoApi(item, `colecao.vendas[${indice}]`, referencia, revisao),
  );
  return { colecao, referencia, revisao, vendas };
}

function mapearParcelaVisaoGeralApi(
  valor: unknown,
  caminho: string,
  referencia: string,
  revisao: string,
): ParcelaVisaoGeralLeitura {
  const obj = objeto(valor, caminho);
  return {
    venda: mapearResumoApi(
      propriedade(obj, 'venda', caminho),
      `${caminho}.venda`,
      referencia,
      revisao,
    ),
    parcela: mapearParcelaApi(propriedade(obj, 'parcela', caminho), `${caminho}.parcela`),
  };
}

export function mapearVisaoGeralApi(valor: unknown, referenciaEsperada: string): VisaoGeralLeitura {
  const obj = objeto(valor, 'visaoGeral');
  const referencia = dataCivil(
    propriedade(obj, 'referencia', 'visaoGeral'),
    'visaoGeral.referencia',
  );
  validarReferencia(referencia, referenciaEsperada, 'visaoGeral.referencia');
  const revisao = revisaoCanonica(propriedade(obj, 'revisao', 'visaoGeral'), 'visaoGeral.revisao');
  const indicadoresObj = objeto(
    propriedade(obj, 'indicadores', 'visaoGeral'),
    'visaoGeral.indicadores',
  );
  const indicadores: IndicadoresVisaoGeralLeitura = {
    totalEmAbertoCentavos: inteiroSeguro(
      propriedade(indicadoresObj, 'totalEmAbertoCentavos', 'visaoGeral.indicadores'),
      'visaoGeral.indicadores.totalEmAbertoCentavos',
    ),
    valoresEmAtrasoCentavos: inteiroSeguro(
      propriedade(indicadoresObj, 'valoresEmAtrasoCentavos', 'visaoGeral.indicadores'),
      'visaoGeral.indicadores.valoresEmAtrasoCentavos',
    ),
    recebidoNoMesCentavos: inteiroSeguro(
      propriedade(indicadoresObj, 'recebidoNoMesCentavos', 'visaoGeral.indicadores'),
      'visaoGeral.indicadores.recebidoNoMesCentavos',
    ),
    vendasCadastradas: inteiroSeguro(
      propriedade(indicadoresObj, 'quantidadeVendasAtivas', 'visaoGeral.indicadores'),
      'visaoGeral.indicadores.quantidadeVendasAtivas',
    ),
  };
  return {
    referencia,
    revisao,
    indicadores,
    vendasRecentes: lista(
      propriedade(obj, 'vendasRecentes', 'visaoGeral'),
      'visaoGeral.vendasRecentes',
    ).map((item, indice) =>
      mapearResumoApi(item, `visaoGeral.vendasRecentes[${indice}]`, referencia, revisao),
    ),
    parcelasProximas: lista(
      propriedade(obj, 'parcelasProximas', 'visaoGeral'),
      'visaoGeral.parcelasProximas',
    ).map((item, indice) =>
      mapearParcelaVisaoGeralApi(
        item,
        `visaoGeral.parcelasProximas[${indice}]`,
        referencia,
        revisao,
      ),
    ),
    parcelasAtrasadas: lista(
      propriedade(obj, 'parcelasAtrasadas', 'visaoGeral'),
      'visaoGeral.parcelasAtrasadas',
    ).map((item, indice) =>
      mapearParcelaVisaoGeralApi(
        item,
        `visaoGeral.parcelasAtrasadas[${indice}]`,
        referencia,
        revisao,
      ),
    ),
  };
}

function mapearRecebimentoMensalApi(
  valor: unknown,
  caminho: string,
  referencia: string,
  revisao: string,
): RecebimentoMensalLeitura {
  const obj = objeto(valor, caminho);
  return {
    id: id(propriedade(obj, 'id', caminho), `${caminho}.id`),
    venda: mapearResumoApi(
      propriedade(obj, 'venda', caminho),
      `${caminho}.venda`,
      referencia,
      revisao,
    ),
    origem: origemRecebimento(propriedade(obj, 'origem', caminho), `${caminho}.origem`),
    data: dataCivil(propriedade(obj, 'data', caminho), `${caminho}.data`),
    forma: formaPagamento(propriedade(obj, 'forma', caminho), `${caminho}.forma`),
    valorCentavos: inteiroSeguro(
      propriedade(obj, 'valorCentavos', caminho),
      `${caminho}.valorCentavos`,
    ),
  };
}

function mapearRecebimentoDiarioApi(valor: unknown, caminho: string): RecebimentoDiarioLeitura {
  const obj = objeto(valor, caminho);
  return {
    data: dataCivil(propriedade(obj, 'data', caminho), `${caminho}.data`),
    totalCentavos: inteiroSeguro(
      propriedade(obj, 'totalCentavos', caminho),
      `${caminho}.totalCentavos`,
    ),
  };
}

function mapearSaldoMensalApi(
  valor: unknown,
  caminho: string,
  referencia: string,
  revisao: string,
): SaldoMensalLeitura {
  const obj = objeto(valor, caminho);
  return {
    venda: mapearResumoApi(
      propriedade(obj, 'venda', caminho),
      `${caminho}.venda`,
      referencia,
      revisao,
    ),
    saldoCentavos: inteiroSeguro(
      propriedade(obj, 'saldoCentavos', caminho),
      `${caminho}.saldoCentavos`,
    ),
    primeiroVencimentoPendente: dataCivilOpcional(
      propriedade(obj, 'primeiroVencimentoPendente', caminho),
      `${caminho}.primeiroVencimentoPendente`,
    ),
  };
}

function mapearParcelaMensalApi(
  valor: unknown,
  caminho: string,
  referencia: string,
  revisao: string,
): { readonly venda: VendaResumoLeitura; readonly parcela: ParcelaLeitura } {
  const obj = objeto(valor, caminho);
  return {
    venda: mapearResumoApi(
      propriedade(obj, 'venda', caminho),
      `${caminho}.venda`,
      referencia,
      revisao,
    ),
    parcela: mapearParcelaApi(propriedade(obj, 'parcela', caminho), `${caminho}.parcela`),
  };
}

export function mapearRelatorioMensalApi(
  valor: unknown,
  referenciaEsperada: string,
  anoEsperado: number,
  mesEsperado: number,
): RelatorioMensalLeitura {
  const obj = objeto(valor, 'relatorioMensal');
  const referencia = dataCivil(
    propriedade(obj, 'referencia', 'relatorioMensal'),
    'relatorioMensal.referencia',
  );
  validarReferencia(referencia, referenciaEsperada, 'relatorioMensal.referencia');
  const revisao = revisaoCanonica(
    propriedade(obj, 'revisao', 'relatorioMensal'),
    'relatorioMensal.revisao',
  );
  const inicioMes = dataCivil(
    propriedade(obj, 'inicioMes', 'relatorioMensal'),
    'relatorioMensal.inicioMes',
  );
  const fimMes = dataCivil(propriedade(obj, 'fimMes', 'relatorioMensal'), 'relatorioMensal.fimMes');
  const prefixo = `${String(anoEsperado).padStart(4, '0')}-${String(mesEsperado).padStart(2, '0')}`;
  const fimEsperado = `${prefixo}-${String(diasNoMes(anoEsperado, mesEsperado)).padStart(2, '0')}`;
  if (inicioMes !== `${prefixo}-01` || fimMes !== fimEsperado) {
    return erro('relatorioMensal.inicioMes/fimMes', `limites do mês ${prefixo}`);
  }
  return {
    referencia,
    revisao,
    inicioMes,
    fimMes,
    recebimentos: lista(
      propriedade(obj, 'recebimentos', 'relatorioMensal'),
      'relatorioMensal.recebimentos',
    ).map((item, indice) =>
      mapearRecebimentoMensalApi(
        item,
        `relatorioMensal.recebimentos[${indice}]`,
        referencia,
        revisao,
      ),
    ),
    recebimentosDiarios: lista(
      propriedade(obj, 'recebimentosDiarios', 'relatorioMensal'),
      'relatorioMensal.recebimentosDiarios',
    ).map((item, indice) =>
      mapearRecebimentoDiarioApi(item, `relatorioMensal.recebimentosDiarios[${indice}]`),
    ),
    vendasDoMes: lista(
      propriedade(obj, 'vendasDoMes', 'relatorioMensal'),
      'relatorioMensal.vendasDoMes',
    ).map((item, indice) =>
      mapearResumoApi(item, `relatorioMensal.vendasDoMes[${indice}]`, referencia, revisao),
    ),
    saldos: lista(propriedade(obj, 'saldos', 'relatorioMensal'), 'relatorioMensal.saldos').map(
      (item, indice) =>
        mapearSaldoMensalApi(item, `relatorioMensal.saldos[${indice}]`, referencia, revisao),
    ),
    parcelasAtrasadas: lista(
      propriedade(obj, 'parcelasAtrasadas', 'relatorioMensal'),
      'relatorioMensal.parcelasAtrasadas',
    ).map((item, indice): ParcelaAtrasadaMensalLeitura =>
      mapearParcelaMensalApi(
        item,
        `relatorioMensal.parcelasAtrasadas[${indice}]`,
        referencia,
        revisao,
      ),
    ),
    parcelasPrejuizo: lista(
      propriedade(obj, 'parcelasPrejuizo', 'relatorioMensal'),
      'relatorioMensal.parcelasPrejuizo',
    ).map((item, indice): ParcelaPrejuizoMensalLeitura => {
      const caminho = `relatorioMensal.parcelasPrejuizo[${indice}]`;
      const parcela = mapearParcelaMensalApi(item, caminho, referencia, revisao);
      const incluirNoTotal = propriedade(objeto(item, caminho), 'incluirNoTotal', caminho);
      if (typeof incluirNoTotal !== 'boolean') return erro(`${caminho}.incluirNoTotal`, 'boolean');
      return { ...parcela, incluirNoTotal };
    }),
    totalRecebidoCentavos: inteiroSeguro(
      propriedade(obj, 'totalRecebidoCentavos', 'relatorioMensal'),
      'relatorioMensal.totalRecebidoCentavos',
    ),
    quantidadeVendasMes: inteiroSeguro(
      propriedade(obj, 'quantidadeVendasMes', 'relatorioMensal'),
      'relatorioMensal.quantidadeVendasMes',
    ),
    totalVendasMesCentavos: inteiroSeguro(
      propriedade(obj, 'totalVendasMesCentavos', 'relatorioMensal'),
      'relatorioMensal.totalVendasMesCentavos',
    ),
    totalEmAbertoCentavos: inteiroSeguro(
      propriedade(obj, 'totalEmAbertoCentavos', 'relatorioMensal'),
      'relatorioMensal.totalEmAbertoCentavos',
    ),
    totalAtrasadoCentavos: inteiroSeguro(
      propriedade(obj, 'totalAtrasadoCentavos', 'relatorioMensal'),
      'relatorioMensal.totalAtrasadoCentavos',
    ),
    totalPrejuizoCentavos: inteiroSeguro(
      propriedade(obj, 'totalPrejuizoCentavos', 'relatorioMensal'),
      'relatorioMensal.totalPrejuizoCentavos',
    ),
  };
}

export function nomeColecaoWire(colecao: ColecaoVendas): string {
  return CODIGOS_COLECAO[colecao];
}

export function formaPagamentoWire(forma: string): string {
  switch (forma) {
    case 'Dinheiro':
      return 'Dinheiro';
    case 'Pix':
      return 'Pix';
    case 'Cartão de débito':
      return 'CartaoDebito';
    case 'Cartão de crédito':
      return 'CartaoCredito';
    default:
      return erro('forma', 'enum de pagamento reconhecido');
  }
}

export function statusAdministrativoWire(status: string): string {
  switch (status) {
    case 'Ativo':
      return 'Ativo';
    case 'Inativo':
      return 'Inativo';
    case 'Prejuízo':
      return 'Prejuizo';
    default:
      return erro('status', 'enum administrativo reconhecido');
  }
}

export function validarDataCivilEntrada(valor: string, caminho: string): string {
  return dataCivil(valor, caminho);
}

export function validarCentavosEntrada(valor: number, caminho: string): number {
  return inteiroSeguro(valor, caminho);
}

export function validarIdentificadorEntrada(valor: string, caminho: string): string {
  return id(valor, caminho);
}
