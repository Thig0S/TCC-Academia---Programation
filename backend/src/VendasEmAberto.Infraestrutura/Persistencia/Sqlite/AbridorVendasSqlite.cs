using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using VendasEmAberto.Aplicacao.Persistencia;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal sealed class AbridorVendasSqlite
{
    public async Task<ResultadoArmazenamento<SessaoVendasSqlite>> AbrirAsync(
        string caminhoAbsoluto,
        CancellationToken cancellationToken = default)
    {
        if (!CaminhoBancoSqlite.TentarNormalizar(caminhoAbsoluto, out var caminho, out var erroCaminho))
        {
            return Falha(CodigosErroArmazenamento.CaminhoInvalido, erroCaminho);
        }

        if (Directory.Exists(caminho))
        {
            return Falha(
                CodigosErroArmazenamento.CaminhoInvalido,
                "O caminho informado deve apontar para um arquivo de banco.");
        }

        if (!File.Exists(caminho))
        {
            return Falha(
                CodigosErroArmazenamento.BancoAusente,
                "O arquivo de banco não existe; inicialize-o explicitamente antes do uso.");
        }

        VendasDbContext? contexto = null;
        var transferiuContexto = false;
        try
        {
            cancellationToken.ThrowIfCancellationRequested();
            contexto = new VendasDbContext(
                OpcoesVendasDbContext.Criar(caminho, SqliteOpenMode.ReadWrite));
            var migracoesConhecidas = contexto.Database.GetMigrations().ToArray();
            var estadoSchema = await InspecionadorSchemaSqlite.InspecionarAsync(
                contexto,
                caminho,
                migracoesConhecidas,
                cancellationToken);

            if (estadoSchema == EstadoSchemaSqlite.BancoOcupado)
            {
                return Falha(
                    CodigosErroArmazenamento.BancoOcupado,
                    "O banco está ocupado por outra operação.");
            }

            if (estadoSchema != EstadoSchemaSqlite.Atual)
            {
                return Falha(
                    CodigosErroArmazenamento.SchemaIncompativel,
                    "O banco não está na versão de schema esperada.");
            }

            await contexto.Database.OpenConnectionAsync(cancellationToken);
            var conexao = (SqliteConnection)contexto.Database.GetDbConnection();
            if (await HaBloqueioDeMigrationAtivoAsync(conexao, cancellationToken))
            {
                return Falha(
                    CodigosErroArmazenamento.BancoOcupado,
                    "O banco está ocupado por outra operação.");
            }

            if (await ConsultarPragmaAsync(conexao, "foreign_keys", cancellationToken) != 1)
            {
                return Falha(
                    CodigosErroArmazenamento.ArmazenamentoIndisponivel,
                    "Não foi possível habilitar as chaves estrangeiras do armazenamento.");
            }

            var estadoRevisao = await ConsultarEstadoRevisaoAsync(conexao, cancellationToken);
            if (estadoRevisao is null)
            {
                return Falha(
                    CodigosErroArmazenamento.SchemaIncompativel,
                    "O estado de revisão do banco está ausente ou incompatível.");
            }

            if (estadoRevisao < 0)
            {
                return Falha(
                    CodigosErroArmazenamento.DadosPersistidosInvalidos,
                    "O banco contém uma revisão inválida.");
            }

            transferiuContexto = true;
            return ResultadoArmazenamento<SessaoVendasSqlite>.CriarSucesso(
                new SessaoVendasSqlite(contexto));
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (SqliteException excecao) when (EhBancoOcupado(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.BancoOcupado,
                "O banco está ocupado por outra operação.");
        }
        catch (SqliteException excecao) when (EhSchemaIncompativel(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.SchemaIncompativel,
                "O banco não está na versão de schema esperada.");
        }
        catch (SqliteException excecao) when (EhFalhaDeAcesso(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.ArmazenamentoIndisponivel,
                "Não foi possível acessar o armazenamento informado.");
        }
        catch (IOException)
        {
            return Falha(
                CodigosErroArmazenamento.ArmazenamentoIndisponivel,
                "Não foi possível acessar o armazenamento informado.");
        }
        catch (UnauthorizedAccessException)
        {
            return Falha(
                CodigosErroArmazenamento.ArmazenamentoIndisponivel,
                "Não foi possível acessar o armazenamento informado.");
        }
        finally
        {
            if (!transferiuContexto && contexto is not null)
            {
                await contexto.DisposeAsync();
            }
        }
    }

    private static async Task<long?> ConsultarEstadoRevisaoAsync(
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = """
            SELECT COUNT(*), MIN(Id), MIN(Revisao)
            FROM EstadoArmazenamento;
            """;
        await using var leitor = await comando.ExecuteReaderAsync(cancellationToken);
        if (!await leitor.ReadAsync(cancellationToken) || leitor.GetInt64(0) != 1 || leitor.IsDBNull(1))
        {
            return null;
        }

        if (leitor.GetInt32(1) != 1 || leitor.IsDBNull(2))
        {
            return null;
        }

        return leitor.GetInt64(2);
    }

    private static async Task<long> ConsultarPragmaAsync(
        SqliteConnection conexao,
        string nome,
        CancellationToken cancellationToken)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = $"PRAGMA {nome};";
        return Convert.ToInt64(await comando.ExecuteScalarAsync(cancellationToken));
    }

    private static async Task<bool> HaBloqueioDeMigrationAtivoAsync(
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        await using var comandoExiste = conexao.CreateCommand();
        comandoExiste.CommandText = """
            SELECT COUNT(*)
            FROM sqlite_master
            WHERE type = 'table' AND name = '__EFMigrationsLock';
            """;
        if (Convert.ToInt64(await comandoExiste.ExecuteScalarAsync(cancellationToken)) == 0)
        {
            return false;
        }

        await using var comandoBloqueio = conexao.CreateCommand();
        comandoBloqueio.CommandText = "SELECT COUNT(*) FROM __EFMigrationsLock;";
        return Convert.ToInt64(await comandoBloqueio.ExecuteScalarAsync(cancellationToken)) > 0;
    }

    private static bool EhBancoOcupado(SqliteException excecao) =>
        excecao.SqliteErrorCode is 5 or 6;

    private static bool EhSchemaIncompativel(SqliteException excecao) =>
        excecao.SqliteErrorCode is 1 or 11 or 26;

    private static bool EhFalhaDeAcesso(SqliteException excecao) =>
        excecao.SqliteErrorCode is 3 or 7 or 8 or 10 or 13 or 14;

    private static ResultadoArmazenamento<SessaoVendasSqlite> Falha(string codigo, string mensagem) =>
        ResultadoArmazenamento<SessaoVendasSqlite>.CriarFalha(new ErroArmazenamento(codigo, mensagem));
}
