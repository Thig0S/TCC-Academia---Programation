using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;

namespace VendasEmAberto.Dominio.Projecoes;

public sealed record RecebimentoRelatorio(
    string Id,
    ProjecaoVenda Venda,
    OrigemRecebimento Origem,
    DateOnly Data,
    FormaPagamento Forma,
    Dinheiro Valor);

public sealed record RecebimentoDiarioRelatorio(DateOnly Data, Dinheiro Total);

public sealed record SaldoRelatorio(
    ProjecaoVenda Venda,
    Dinheiro Saldo,
    DateOnly? PrimeiroVencimentoPendente);

public sealed record ParcelaAtrasadaRelatorio(ProjecaoVenda Venda, ProjecaoParcelaVenda Parcela);

public sealed record ParcelaPrejuizoRelatorio(
    ProjecaoVenda Venda,
    ProjecaoParcelaVenda Parcela,
    bool IncluirNoTotal);

public sealed class RelatorioMensalVendas
{
    public DateOnly Referencia { get; }

    public DateOnly InicioMes { get; }

    public DateOnly FimMes { get; }

    public IReadOnlyList<RecebimentoRelatorio> Recebimentos { get; }

    public IReadOnlyList<RecebimentoDiarioRelatorio> RecebimentosDiarios { get; }

    public IReadOnlyList<ProjecaoVenda> VendasDoMes { get; }

    public IReadOnlyList<SaldoRelatorio> Saldos { get; }

    public IReadOnlyList<ParcelaAtrasadaRelatorio> ParcelasAtrasadas { get; }

    public IReadOnlyList<ParcelaPrejuizoRelatorio> ParcelasPrejuizo { get; }

    public Dinheiro TotalRecebido { get; }

    public int QuantidadeVendasMes { get; }

    public Dinheiro TotalVendasMes { get; }

    public Dinheiro TotalEmAberto { get; }

    public Dinheiro TotalAtrasado { get; }

    public Dinheiro TotalPrejuizo { get; }

    internal RelatorioMensalVendas(
        DateOnly referencia,
        DateOnly inicioMes,
        DateOnly fimMes,
        IEnumerable<RecebimentoRelatorio> recebimentos,
        IEnumerable<RecebimentoDiarioRelatorio> recebimentosDiarios,
        IEnumerable<ProjecaoVenda> vendasDoMes,
        IEnumerable<SaldoRelatorio> saldos,
        IEnumerable<ParcelaAtrasadaRelatorio> parcelasAtrasadas,
        IEnumerable<ParcelaPrejuizoRelatorio> parcelasPrejuizo,
        Dinheiro totalRecebido,
        int quantidadeVendasMes,
        Dinheiro totalVendasMes,
        Dinheiro totalEmAberto,
        Dinheiro totalAtrasado,
        Dinheiro totalPrejuizo)
    {
        Referencia = referencia;
        InicioMes = inicioMes;
        FimMes = fimMes;
        Recebimentos = Array.AsReadOnly(recebimentos.ToArray());
        RecebimentosDiarios = Array.AsReadOnly(recebimentosDiarios.ToArray());
        VendasDoMes = Array.AsReadOnly(vendasDoMes.ToArray());
        Saldos = Array.AsReadOnly(saldos.ToArray());
        ParcelasAtrasadas = Array.AsReadOnly(parcelasAtrasadas.ToArray());
        ParcelasPrejuizo = Array.AsReadOnly(parcelasPrejuizo.ToArray());
        TotalRecebido = totalRecebido;
        QuantidadeVendasMes = quantidadeVendasMes;
        TotalVendasMes = totalVendasMes;
        TotalEmAberto = totalEmAberto;
        TotalAtrasado = totalAtrasado;
        TotalPrejuizo = totalPrejuizo;
    }
}
