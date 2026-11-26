using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

internal sealed class VendaLinha
{
    public string Id { get; set; } = string.Empty;

    public int Ordem { get; set; }

    public StatusAdministrativoVenda StatusAdministrativo { get; set; }

    public string ClienteNome { get; set; } = string.Empty;

    public string ClienteCpf { get; set; } = string.Empty;

    public string ClienteTelefone { get; set; } = string.Empty;

    public string? ClienteDescricao { get; set; }

    public DateOnly DataVenda { get; set; }

    public long ValorTotalBaseCentavos { get; set; }
}
