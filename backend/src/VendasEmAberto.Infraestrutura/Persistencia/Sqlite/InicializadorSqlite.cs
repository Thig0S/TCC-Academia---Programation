using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using VendasEmAberto.Aplicacao.Persistencia;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal sealed class InicializadorSqlite
{
    public async Task<ResultadoOperacaoArmazenamento> InicializarAsync(
        string caminhoAbsoluto,
        CancellationToken cancellationToken = default)
    {
        if (!CaminhoBancoSqlite.TentarNormalizar(caminhoAbsoluto, out var caminho, out var erroCaminho))
        {
            return Falha(CodigosErroArmazenamento.CaminhoInvalido, erroCaminho);
        }

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            var diretorioPai = Path.GetDirectoryName(caminho);
            if (string.IsNullOrEmpty(diretorioPai) || !Directory.Exists(diretorioPai))
            {
                return Falha(
                    CodigosErroArmazenamento.CaminhoInvalido,
                    "O diretório pai do banco deve existir.");
            }

            if (Directory.Exists(caminho))
            {
                return Falha(
                    CodigosErroArmazenamento.CaminhoInvalido,
                    "O caminho informado deve apontar para um arquivo de banco.");
            }

            CriarArquivoSeAusente(caminho);

            await using var contexto = new VendasDbContext(
                OpcoesVendasDbContext.Criar(caminho, SqliteOpenMode.ReadWrite));
            var migracoesConhecidas = contexto.Database.GetMigrations().ToArray();
            var inspecao = await InspecionadorSchemaSqlite.InspecionarAsync(
                contexto,
                caminho,
                migracoesConhecidas,
                cancellationToken);

            if (inspecao == EstadoSchemaSqlite.BancoOcupado)
            {
                return Falha(
                    CodigosErroArmazenamento.BancoOcupado,
                    "O banco está ocupado por outra operação.");
            }

            if (inspecao == EstadoSchemaSqlite.Incompativel)
            {
                return Falha(
                    CodigosErroArmazenamento.SchemaIncompativel,
                    "O arquivo não contém um schema de vendas reconhecido.");
            }

            await contexto.Database.MigrateAsync(cancellationToken);
            await contexto.Database.OpenConnectionAsync(cancellationToken);
            try
            {
                await InserirEstadoInicialSeAusenteAsync(contexto, cancellationToken);
            }
            finally
            {
                await contexto.Database.CloseConnectionAsync();
            }

            return ResultadoOperacaoArmazenamento.CriarSucesso();
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
                "O arquivo não contém um schema de vendas reconhecido.");
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
    }

    private static void CriarArquivoSeAusente(string caminho)
    {
        if (File.Exists(caminho))
        {
            return;
        }

        try
        {
            using var arquivo = new FileStream(
                caminho,
                FileMode.CreateNew,
                FileAccess.ReadWrite,
                FileShare.None);
        }
        catch (IOException) when (File.Exists(caminho))
        {
            // Outro consumidor criou o caminho primeiro; a inspeção decide se o arquivo é próprio.
        }
    }

    private static async Task InserirEstadoInicialSeAusenteAsync(
        VendasDbContext contexto,
        CancellationToken cancellationToken)
    {
        var conexao = contexto.Database.GetDbConnection();
        await using var comando = conexao.CreateCommand();
        comando.CommandText = """
            INSERT INTO "EstadoArmazenamento" ("Id", "Revisao")
            VALUES (1, 0)
            ON CONFLICT ("Id") DO NOTHING;
            """;
        await comando.ExecuteNonQueryAsync(cancellationToken);
    }

    private static bool EhBancoOcupado(SqliteException excecao) =>
        excecao.SqliteErrorCode is 5 or 6;

    private static bool EhSchemaIncompativel(SqliteException excecao) =>
        excecao.SqliteErrorCode is 11 or 26;

    private static bool EhFalhaDeAcesso(SqliteException excecao) =>
        excecao.SqliteErrorCode is 3 or 7 or 8 or 10 or 13 or 14;

    private static ResultadoOperacaoArmazenamento Falha(string codigo, string mensagem) =>
        ResultadoOperacaoArmazenamento.CriarFalha(new ErroArmazenamento(codigo, mensagem));
}
