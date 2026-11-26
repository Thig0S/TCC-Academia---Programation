using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Vendas;

public sealed partial class Venda
{
    public static ResultadoDominio<Venda> Reconstruir(
        DadosReconstrucaoVenda dados,
        DateOnly referencia)
    {
        if (dados is null || string.IsNullOrEmpty(dados.Id))
        {
            return FalhaReconstrucao(
                "historico-invalido",
                "Informe os dados e o identificador da venda reconstruída.",
                "id");
        }

        if (dados.Cliente is null)
        {
            return FalhaReconstrucao(
                "identificacao-obrigatoria",
                "Informe os dados do cliente.",
                "cliente");
        }

        if (dados.StatusAdministrativo is not (StatusAdministrativoVenda.Ativo or
            StatusAdministrativoVenda.Inativo or StatusAdministrativoVenda.Prejuizo))
        {
            return FalhaReconstrucao("status-invalido", "O status administrativo não é válido.", "statusAdministrativo");
        }

        if (dados.ValorTotalBase.Centavos <= 0)
        {
            return FalhaReconstrucao("valor-invalido", "O total-base deve ser positivo.", "valorTotalBase");
        }

        if (dados.DataVenda > referencia)
        {
            return FalhaReconstrucao("data-invalida", "A data da venda não pode ser futura.", "dataVenda");
        }

        if (dados.Parcelas is null || dados.Parcelas.Count == 0 || dados.Recebimentos is null)
        {
            return FalhaReconstrucao("historico-invalido", "Informe parcelas e recebimentos válidos.", "historico");
        }

        var parcelasInformadas = dados.Parcelas.ToArray();
        var recebimentosInformados = dados.Recebimentos.ToArray();
        if (parcelasInformadas.Any(parcela => parcela is null) ||
            recebimentosInformados.Any(recebimento => recebimento is null))
        {
            return FalhaReconstrucao("historico-invalido", "O histórico contém um registro ausente.", "historico");
        }

        var entradas = recebimentosInformados
            .Where(recebimento => recebimento.Origem == OrigemRecebimento.Entrada)
            .ToArray();
        if (entradas.Length > 1 || (entradas.Length == 1 && recebimentosInformados[0].Origem != OrigemRecebimento.Entrada))
        {
            return FalhaReconstrucao("historico-invalido", "A entrada deve aparecer uma única vez e iniciar o histórico.", "recebimentos");
        }

        var temEntrada = entradas.Length == 1;
        var quantidadeFutura = parcelasInformadas.Length - (temEntrada ? 1 : 0);
        if (quantidadeFutura < 1)
        {
            return FalhaReconstrucao("historico-invalido", "A venda deve conter ao menos uma parcela futura.", "parcelas");
        }

        var entrada = temEntrada ? entradas[0] : null;
        var valorEntrada = entrada?.Valor.Centavos ?? 0;
        if (temEntrada && (valorEntrada <= 0 || valorEntrada >= dados.ValorTotalBase.Centavos))
        {
            return FalhaReconstrucao("historico-invalido", "A entrada deve ser positiva e menor que o total-base.", "recebimentos");
        }

        if (temEntrada && entrada!.Data != dados.DataVenda)
        {
            return FalhaReconstrucao("data-invalida", "A entrada deve estar registrada na data da venda.", "recebimentos.data");
        }

        if (temEntrada && !FormasPagamento.EhValida(entrada!.Forma))
        {
            return FalhaReconstrucao("dados-recebimento-invalidos", "A forma da entrada não é válida.", "recebimentos.forma");
        }

        var saldoFuturo = dados.ValorTotalBase.Centavos - valorEntrada;
        if (quantidadeFutura > saldoFuturo)
        {
            return FalhaReconstrucao("historico-invalido", "Cada parcela futura deve conter ao menos um centavo.", "parcelas");
        }

        var vencimentosResult = CalendarioCivil.GerarVencimentos(dados.DataVenda, quantidadeFutura);
        if (vencimentosResult is not ResultadoDominio<IReadOnlyList<DateOnly>>.Sucesso vencimentos)
        {
            return ResultadoDominio<Venda>.CriarFalha(
                ((ResultadoDominio<IReadOnlyList<DateOnly>>.Falha)vencimentosResult).Erro);
        }

        var ids = new HashSet<string>(StringComparer.Ordinal) { dados.Id };
        long somaBaseParcelas = 0;
        var valorFuturoBase = saldoFuturo / quantidadeFutura;
        var restoFuturoBase = saldoFuturo % quantidadeFutura;
        var parcelas = new ParcelaVenda[parcelasInformadas.Length];
        for (var indice = 0; indice < parcelasInformadas.Length; indice++)
        {
            var parcela = parcelasInformadas[indice];
            if (string.IsNullOrEmpty(parcela.Id))
            {
                return FalhaReconstrucao("identificador-invalido", "O identificador da parcela é obrigatório.", "parcelas.id");
            }

            if (!ids.Add(parcela.Id))
            {
                return FalhaReconstrucao(
                    "identificador-duplicado",
                    "Os identificadores da venda e de seus registros devem ser únicos.",
                    "parcelas.id",
                    CategoriaErroDominio.Conflito);
            }

            var parcelaEntrada = temEntrada && indice == 0;
            var indiceFuturo = indice - (temEntrada ? 1 : 0);
            var vencimentoEsperado = parcelaEntrada ? dados.DataVenda : vencimentos.Valor[indiceFuturo];
            var valorBaseEsperado = parcelaEntrada
                ? valorEntrada
                : valorFuturoBase + (indiceFuturo < restoFuturoBase ? 1 : 0);
            if (parcela.Numero != indice + 1 || parcela.ValorBase.Centavos != valorBaseEsperado ||
                parcela.Vencimento != vencimentoEsperado)
            {
                return FalhaReconstrucao(
                    "historico-invalido",
                    "Número, valor ou vencimento de parcela não corresponde ao contrato reconstruído.",
                    "parcelas");
            }

            if (!TentarSomar(somaBaseParcelas, parcela.ValorBase.Centavos, out somaBaseParcelas))
            {
                return FalhaLimite("A soma das parcelas excede o limite seguro de centavos.");
            }

            parcelas[indice] = new ParcelaVenda(parcela.Id, parcela.Numero, parcela.ValorBase, parcela.Vencimento);
        }

        if (somaBaseParcelas != dados.ValorTotalBase.Centavos)
        {
            return FalhaReconstrucao(
                "historico-invalido",
                "A soma das parcelas deve corresponder ao total-base da venda.",
                "parcelas");
        }

        long totalPago = 0;
        long totalAcrescimos = 0;
        var proximaParcela = 0;
        var recebimentos = new RecebimentoVenda[recebimentosInformados.Length];
        for (var indiceRecebimento = 0; indiceRecebimento < recebimentosInformados.Length; indiceRecebimento++)
        {
            var recebimento = recebimentosInformados[indiceRecebimento];
            if (string.IsNullOrEmpty(recebimento.Id))
            {
                return FalhaReconstrucao("identificador-invalido", "O identificador do recebimento é obrigatório.", "recebimentos.id");
            }

            if (!ids.Add(recebimento.Id))
            {
                return FalhaReconstrucao(
                    "identificador-duplicado",
                    "Os identificadores da venda e de seus registros devem ser únicos.",
                    "recebimentos.id",
                    CategoriaErroDominio.Conflito);
            }

            if (!FormasPagamento.EhValida(recebimento.Forma) ||
                recebimento.Data < dados.DataVenda || recebimento.Data > referencia ||
                recebimento.Valor.Centavos <= 0)
            {
                return FalhaReconstrucao(
                    "dados-recebimento-invalidos",
                    "Data, forma ou valor do recebimento não é válido para esta venda.",
                    "recebimentos");
            }

            if (recebimento.Alocacoes is null || recebimento.Alocacoes.Count == 0 ||
                recebimento.Alocacoes.Any(alocacao => alocacao is null))
            {
                return FalhaReconstrucao("historico-invalido", "O recebimento deve conter alocações válidas.", "recebimentos.alocacoes");
            }

            var alocacoesInformadas = recebimento.Alocacoes.ToArray();
            var alocacoes = new AlocacaoPagamento[alocacoesInformadas.Length];
            var observacao = recebimento.Observacao ?? "";
            switch (recebimento.Origem)
            {
                case OrigemRecebimento.Entrada:
                    if (indiceRecebimento != 0 || proximaParcela != 0 || alocacoesInformadas.Length != 1 ||
                        recebimento.Data != dados.DataVenda || recebimento.Acrescimo.Centavos != 0 ||
                        !string.IsNullOrEmpty(recebimento.Observacao))
                    {
                        return FalhaReconstrucao("historico-invalido", "A entrada deve liquidar somente a primeira parcela na data da venda.", "recebimentos");
                    }

                    if (!ValidarAlocacao(alocacoesInformadas[0], parcelas, proximaParcela, out var valorBaseEntrada) ||
                        recebimento.Valor.Centavos != valorBaseEntrada.Centavos ||
                        alocacoesInformadas[0].Valor.Centavos != recebimento.Valor.Centavos)
                    {
                        return FalhaReconstrucao("historico-invalido", "O recebimento da entrada não corresponde à primeira parcela.", "recebimentos.alocacoes");
                    }

                    alocacoes[0] = new AlocacaoPagamento(alocacoesInformadas[0].ParcelaId, alocacoesInformadas[0].Valor);
                    proximaParcela++;
                    break;

                case OrigemRecebimento.Individual:
                    if (alocacoesInformadas.Length != 1 || proximaParcela >= parcelas.Length ||
                        !ValidarAlocacao(alocacoesInformadas[0], parcelas, proximaParcela, out var valorBaseIndividual) ||
                        alocacoesInformadas[0].Valor.Centavos != recebimento.Valor.Centavos ||
                        recebimento.Valor.Centavos < valorBaseIndividual.Centavos ||
                        recebimento.Acrescimo.Centavos != recebimento.Valor.Centavos - valorBaseIndividual.Centavos ||
                        observacao.EnumerateRunes().Count() > 20)
                    {
                        return FalhaReconstrucao("historico-invalido", "O pagamento individual não corresponde à próxima parcela.", "recebimentos");
                    }

                    if (!TentarSomar(totalAcrescimos, recebimento.Acrescimo.Centavos, out totalAcrescimos))
                    {
                        return FalhaLimite("A soma dos acréscimos excede o limite seguro de centavos.");
                    }

                    alocacoes[0] = new AlocacaoPagamento(alocacoesInformadas[0].ParcelaId, alocacoesInformadas[0].Valor);
                    proximaParcela++;
                    break;

                case OrigemRecebimento.HistoricoLote:
                    if (recebimento.Acrescimo.Centavos != 0 || !string.IsNullOrEmpty(recebimento.Observacao))
                    {
                        return FalhaReconstrucao("historico-invalido", "Lote histórico não pode conter metadados individuais.", "recebimentos");
                    }

                    long somaLote = 0;
                    for (var indiceAlocacao = 0; indiceAlocacao < alocacoesInformadas.Length; indiceAlocacao++)
                    {
                        var alocacao = alocacoesInformadas[indiceAlocacao];
                        if (!ValidarAlocacao(alocacao, parcelas, proximaParcela, out var valorBaseLote) ||
                            alocacao.Valor.Centavos != valorBaseLote.Centavos)
                        {
                            return FalhaReconstrucao("historico-invalido", "O lote deve alocar parcelas-base em sequência, sem saltos.", "recebimentos.alocacoes");
                        }

                        if (!TentarSomar(somaLote, alocacao.Valor.Centavos, out somaLote))
                        {
                            return FalhaLimite("A soma das alocações do lote excede o limite seguro de centavos.");
                        }

                        alocacoes[indiceAlocacao] = new AlocacaoPagamento(alocacao.ParcelaId, alocacao.Valor);
                        proximaParcela++;
                    }

                    if (recebimento.Valor.Centavos != somaLote)
                    {
                        return FalhaReconstrucao("historico-invalido", "O valor do lote deve reconciliar com suas alocações.", "recebimentos.valor");
                    }

                    break;

                default:
                    return FalhaReconstrucao("historico-invalido", "A origem do recebimento não é reconhecida.", "recebimentos.origem");
            }

            if (!TentarSomar(totalPago, recebimento.Valor.Centavos, out totalPago))
            {
                return FalhaLimite("A soma dos recebimentos excede o limite seguro de centavos.");
            }

            recebimentos[indiceRecebimento] = new RecebimentoVenda(
                recebimento.Id,
                recebimento.Data,
                recebimento.Forma,
                recebimento.Valor,
                recebimento.Origem,
                recebimento.Acrescimo,
                observacao,
                alocacoes);
        }

        if (!TentarSomar(dados.ValorTotalBase.Centavos, totalAcrescimos, out var totalEfetivo) ||
            totalPago > totalEfetivo)
        {
            return FalhaLimite("Os totais financeiros excedem o limite seguro ou não podem ser reconciliados.");
        }

        long saldoPendente = 0;
        for (var indice = proximaParcela; indice < parcelas.Length; indice++)
        {
            if (!TentarSomar(saldoPendente, parcelas[indice].ValorBase.Centavos, out saldoPendente))
            {
                return FalhaLimite("A soma das parcelas pendentes excede o limite seguro de centavos.");
            }
        }

        if (totalEfetivo - totalPago != saldoPendente ||
            (dados.StatusAdministrativo == StatusAdministrativoVenda.Prejuizo && saldoPendente == 0))
        {
            return FalhaReconstrucao("historico-invalido", "O saldo ou a elegibilidade do status não reconcilia com o histórico.", "historico");
        }

        return ResultadoDominio<Venda>.CriarSucesso(new Venda(
            dados.Id,
            dados.StatusAdministrativo,
            dados.Cliente,
            dados.DataVenda,
            dados.ValorTotalBase,
            parcelas,
            recebimentos));
    }

    private static bool ValidarAlocacao(
        DadosReconstrucaoAlocacao alocacao,
        IReadOnlyList<ParcelaVenda> parcelas,
        int indiceEsperado,
        out Dinheiro valorBase)
    {
        valorBase = default;
        if (alocacao is null || string.IsNullOrEmpty(alocacao.ParcelaId) ||
            alocacao.Valor.Centavos <= 0 || indiceEsperado >= parcelas.Count)
        {
            return false;
        }

        var parcela = parcelas[indiceEsperado];
        if (!string.Equals(alocacao.ParcelaId, parcela.Id, StringComparison.Ordinal))
        {
            return false;
        }

        valorBase = parcela.ValorBase;
        return true;
    }

    private static bool TentarSomar(long atual, long parcela, out long resultado)
    {
        if (parcela < 0 || parcela > Dinheiro.LimiteCentavos - atual)
        {
            resultado = atual;
            return false;
        }

        resultado = atual + parcela;
        return true;
    }

    private static ResultadoDominio<Venda> FalhaLimite(string mensagem) =>
        FalhaReconstrucao(
            "limite-financeiro-excedido",
            mensagem,
            "historico");

    private static ResultadoDominio<Venda> FalhaReconstrucao(
        string codigo,
        string mensagem,
        string campo,
        CategoriaErroDominio categoria = CategoriaErroDominio.Validacao) =>
        ResultadoDominio<Venda>.CriarFalha(new ErroDominio(categoria, codigo, mensagem, campo));
}
