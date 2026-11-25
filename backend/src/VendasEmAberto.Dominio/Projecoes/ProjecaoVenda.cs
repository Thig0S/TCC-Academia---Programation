using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Dominio.Projecoes;

public sealed class ProjecaoVenda
{
    public string Id { get; }

    public StatusAdministrativoVenda StatusAdministrativo { get; }

    public IReadOnlyList<ProjecaoParcelaVenda> Parcelas { get; }

    public Dinheiro ValorTotalBase { get; }

    public Dinheiro TotalAcrescimos { get; }

    public Dinheiro ValorTotalEfetivo { get; }

    public Dinheiro TotalRecebido { get; }

    public Dinheiro Saldo { get; }

    public int QuantidadePaga { get; }

    public int QuantidadeParcelas { get; }

    public DateOnly? ProximoVencimento { get; }

    public SituacaoVendaProjetada Situacao { get; }

    internal ProjecaoVenda(
        string id,
        StatusAdministrativoVenda statusAdministrativo,
        IEnumerable<ProjecaoParcelaVenda> parcelas,
        Dinheiro valorTotalBase,
        Dinheiro totalAcrescimos,
        Dinheiro valorTotalEfetivo,
        Dinheiro totalRecebido,
        Dinheiro saldo,
        int quantidadePaga,
        DateOnly? proximoVencimento,
        SituacaoVendaProjetada situacao)
    {
        Id = id;
        StatusAdministrativo = statusAdministrativo;
        Parcelas = Array.AsReadOnly(parcelas.ToArray());
        ValorTotalBase = valorTotalBase;
        TotalAcrescimos = totalAcrescimos;
        ValorTotalEfetivo = valorTotalEfetivo;
        TotalRecebido = totalRecebido;
        Saldo = saldo;
        QuantidadePaga = quantidadePaga;
        QuantidadeParcelas = Parcelas.Count;
        ProximoVencimento = proximoVencimento;
        Situacao = situacao;
    }
}
