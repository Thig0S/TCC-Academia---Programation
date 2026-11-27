namespace VendasEmAberto.Api.Contratos;

public sealed class VendaDetalheApiResposta
{
    public VendaResumoApiResposta Resumo { get; }

    public IReadOnlyList<ParcelaDetalheApiResposta> Parcelas { get; }

    public IReadOnlyList<RecebimentoDetalheApiResposta> Recebimentos { get; }

    public VendaDetalheApiResposta(
        VendaResumoApiResposta resumo,
        IEnumerable<ParcelaDetalheApiResposta> parcelas,
        IEnumerable<RecebimentoDetalheApiResposta> recebimentos)
    {
        ArgumentNullException.ThrowIfNull(resumo);
        ArgumentNullException.ThrowIfNull(parcelas);
        ArgumentNullException.ThrowIfNull(recebimentos);

        Resumo = resumo;
        Parcelas = Array.AsReadOnly(parcelas.ToArray());
        Recebimentos = Array.AsReadOnly(recebimentos.ToArray());
    }
}

public sealed record VendaResumoApiResposta(
    string Id,
    ClienteApiResposta Cliente,
    DateOnly DataVenda,
    StatusAdministrativoApi StatusAdministrativo,
    SituacaoVendaApi Situacao,
    long ValorTotalBaseCentavos,
    long TotalAcrescimosCentavos,
    long ValorTotalEfetivoCentavos,
    long TotalRecebidoCentavos,
    long SaldoCentavos,
    int QuantidadePaga,
    int QuantidadeParcelas,
    DateOnly? ProximoVencimento,
    RevisaoApi Revisao,
    DateOnly Referencia);

public sealed record ClienteApiResposta(string Nome, string Cpf, string Telefone, string? Descricao);

public sealed record ParcelaDetalheApiResposta(
    string Id,
    int Numero,
    long ValorBaseCentavos,
    long AcrescimoCentavos,
    long ValorEfetivoCentavos,
    long ValorRecebidoCentavos,
    long SaldoCentavos,
    DateOnly Vencimento,
    SituacaoParcelaApi Situacao,
    DateOnly? DataPagamento,
    FormaPagamentoApi? FormaPagamento);

public sealed class RecebimentoDetalheApiResposta
{
    public string Id { get; }

    public DateOnly Data { get; }

    public FormaPagamentoApi Forma { get; }

    public OrigemRecebimentoApi Origem { get; }

    public long ValorCentavos { get; }

    public long AcrescimoCentavos { get; }

    public string Observacao { get; }

    public IReadOnlyList<AlocacaoApiResposta> Alocacoes { get; }

    public RecebimentoDetalheApiResposta(
        string id,
        DateOnly data,
        FormaPagamentoApi forma,
        OrigemRecebimentoApi origem,
        long valorCentavos,
        long acrescimoCentavos,
        string observacao,
        IEnumerable<AlocacaoApiResposta> alocacoes)
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

public sealed record AlocacaoApiResposta(string ParcelaId, long ValorCentavos);

public enum StatusAdministrativoApi
{
    Ativo,
    Inativo,
    Prejuizo
}

public enum SituacaoVendaApi
{
    Quitada,
    Atrasada,
    ProximosDias,
    EmAberto
}

public enum SituacaoParcelaApi
{
    Paga,
    Atrasada,
    ProximosDias,
    EmAberto
}

public enum FormaPagamentoApi
{
    Dinheiro,
    Pix,
    CartaoDebito,
    CartaoCredito
}

public enum OrigemRecebimentoApi
{
    Entrada,
    Individual,
    HistoricoLote
}
