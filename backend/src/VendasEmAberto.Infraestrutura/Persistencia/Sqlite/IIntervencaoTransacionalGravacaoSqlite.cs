using Microsoft.EntityFrameworkCore.Storage;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

/// <summary>
/// Seam interno para testes de falhas transacionais; não faz parte do contrato de aplicação.
/// </summary>
internal interface IIntervencaoTransacionalGravacaoSqlite
{
    Task DepoisDaPrimeiraAlteracaoAsync(CancellationToken cancellationToken);

    Task ConfirmarAsync(
        IDbContextTransaction transacao,
        CancellationToken cancellationToken);
}
