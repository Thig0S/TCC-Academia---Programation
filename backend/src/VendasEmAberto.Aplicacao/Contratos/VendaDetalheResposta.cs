namespace VendasEmAberto.Aplicacao.Contratos;

public sealed class VendaDetalheResposta
{
    public VendaResumoResposta Resumo { get; }

    public IReadOnlyList<ParcelaDetalheResposta> Parcelas { get; }

    public IReadOnlyList<RecebimentoDetalheResposta> Recebimentos { get; }

    public VendaDetalheResposta(
        VendaResumoResposta resumo,
        IEnumerable<ParcelaDetalheResposta> parcelas,
        IEnumerable<RecebimentoDetalheResposta> recebimentos)
    {
        ArgumentNullException.ThrowIfNull(resumo);
        ArgumentNullException.ThrowIfNull(parcelas);
        ArgumentNullException.ThrowIfNull(recebimentos);

        Resumo = resumo;
        Parcelas = Array.AsReadOnly(parcelas.ToArray());
        Recebimentos = Array.AsReadOnly(recebimentos.ToArray());
    }
}

public sealed record ParcelaDetalheResposta(
    string Id,
    int Numero,
    long ValorBaseCentavos,
    long AcrescimoCentavos,
    long ValorEfetivoCentavos,
    long ValorRecebidoCentavos,
    long SaldoCentavos,
    DateOnly Vencimento,
    SituacaoParcelaResposta Situacao,
    DateOnly? DataPagamento,
    FormaPagamentoResposta? FormaPagamento);

public sealed class RecebimentoDetalheResposta
{
    public string Id { get; }

    public DateOnly Data { get; }

    public FormaPagamentoResposta Forma { get; }

    public OrigemRecebimentoResposta Origem { get; }

    public long ValorCentavos { get; }

    public long AcrescimoCentavos { get; }

    public string Observacao { get; }

    public IReadOnlyList<AlocacaoResposta> Alocacoes { get; }

    public RecebimentoDetalheResposta(
        string id,
        DateOnly data,
        FormaPagamentoResposta forma,
        OrigemRecebimentoResposta origem,
        long valorCentavos,
        long acrescimoCentavos,
        string observacao,
        IEnumerable<AlocacaoResposta> alocacoes)
    {
        ArgumentNullException.ThrowIfNull(alocacoes);

        Id = id;
        Data = data;
        Forma = forma;
        Origem = origem;
        ValorCentavos = valorCentavos;
        AcrescimoCentavos = acrescimoCentavos;
        Observacao = observacao;
        Alocacoes = Array.AsReadOnly(alocacoes.ToArray());
    }
}

public sealed record AlocacaoResposta(string ParcelaId, long ValorCentavos);
