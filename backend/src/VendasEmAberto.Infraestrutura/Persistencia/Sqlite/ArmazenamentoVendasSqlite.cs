using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal sealed class ArmazenamentoVendasSqlite : IArmazenamentoVendas
{
    private readonly InicializadorSqlite _inicializador = new();
    private readonly LeitorVendasSqlite _leitor = new();
    private readonly GravadorVendasSqlite _gravador = new();

    public Task<ResultadoOperacaoArmazenamento> InicializarAsync(
        string caminhoAbsoluto,
        CancellationToken cancellationToken = default) =>
        _inicializador.InicializarAsync(caminhoAbsoluto, cancellationToken);

    public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
        string caminhoAbsoluto,
        DateOnly referencia,
        CancellationToken cancellationToken = default) =>
        _leitor.CarregarAsync(caminhoAbsoluto, referencia, cancellationToken);

    public Task<ResultadoArmazenamento<long>> SalvarAsync(
        string caminhoAbsoluto,
        IEnumerable<Venda> candidatoCompleto,
        long revisaoEsperada,
        DateOnly referencia,
        CancellationToken cancellationToken = default) =>
        _gravador.SalvarAsync(
            caminhoAbsoluto,
            candidatoCompleto,
            revisaoEsperada,
            referencia,
            cancellationToken);
}
