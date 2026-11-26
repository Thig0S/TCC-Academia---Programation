using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Aplicacao.Persistencia;

public interface IArmazenamentoVendas
{
    Task<ResultadoOperacaoArmazenamento> InicializarAsync(
        string caminhoAbsoluto,
        CancellationToken cancellationToken = default);

    Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
        string caminhoAbsoluto,
        DateOnly referencia,
        CancellationToken cancellationToken = default);

    Task<ResultadoArmazenamento<long>> SalvarAsync(
        string caminhoAbsoluto,
        IEnumerable<Venda> candidatoCompleto,
        long revisaoEsperada,
        DateOnly referencia,
        CancellationToken cancellationToken = default);
}
