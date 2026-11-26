using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using VendasEmAberto.Aplicacao.Persistencia;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal sealed class InicializadorSqlite
{
    private const string TabelaHistoricoMigracoes = "__EFMigrationsHistory";
    private const string TabelaBloqueioMigracoes = "__EFMigrationsLock";

    public async Task<ResultadoOperacaoArmazenamento> InicializarAsync(
        string caminhoAbsoluto,
        CancellationToken cancellationToken = default)
    {
        if (!TentarNormalizarCaminho(caminhoAbsoluto, out var caminho, out var erroCaminho))
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
            var inspecao = await InspecionarBancoExistenteAsync(
                contexto,
                caminho,
                migracoesConhecidas,
                cancellationToken);

            if (inspecao == EstadoInspecao.BancoOcupado)
            {
                return Falha(
                    CodigosErroArmazenamento.BancoOcupado,
                    "O banco está ocupado por outra operação.");
            }

            if (inspecao == EstadoInspecao.Incompativel)
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

    private static bool TentarNormalizarCaminho(
        string caminhoAbsoluto,
        out string caminho,
        out string mensagem)
    {
        caminho = string.Empty;
        mensagem = "Informe um caminho absoluto válido para o banco.";

        if (string.IsNullOrWhiteSpace(caminhoAbsoluto) || !Path.IsPathFullyQualified(caminhoAbsoluto))
        {
            return false;
        }

        try
        {
            caminho = Path.GetFullPath(caminhoAbsoluto);
            return true;
        }
        catch (ArgumentException)
        {
            return false;
        }
        catch (NotSupportedException)
        {
            return false;
        }
        catch (PathTooLongException)
        {
            return false;
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
            // Outro consumidor criou o caminho primeiro; a inspeção abaixo decide se é próprio.
        }
    }

    private static async Task<EstadoInspecao> InspecionarBancoExistenteAsync(
        VendasDbContext contexto,
        string caminho,
        IReadOnlyList<string> migracoesConhecidas,
        CancellationToken cancellationToken)
    {
        if (new FileInfo(caminho).Length == 0)
        {
            return EstadoInspecao.Vazio;
        }

        await using var conexao = new SqliteConnection(
            new SqliteConnectionStringBuilder
            {
                DataSource = caminho,
                Mode = SqliteOpenMode.ReadWrite,
                ForeignKeys = true,
                DefaultTimeout = 5,
                Pooling = false
            }.ToString());

        await conexao.OpenAsync(cancellationToken);
        var applicationId = await ConsultarPragmaAsync(conexao, "application_id", cancellationToken);
        var userVersion = await ConsultarPragmaAsync(conexao, "user_version", cancellationToken);
        if (applicationId != 0 || userVersion != 0)
        {
            return EstadoInspecao.Incompativel;
        }

        var objetos = await ConsultarObjetosAsync(conexao, cancellationToken);
        var tabelas = objetos
            .Where(objeto => objeto.Tipo == "table")
            .Select(objeto => objeto.Nome)
            .ToHashSet(StringComparer.Ordinal);

        var tabelasDaAplicacao = contexto.Model.GetEntityTypes()
            .Select(entidade => entidade.GetTableName())
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);
        var indicesDaAplicacao = contexto.Model.GetEntityTypes()
            .SelectMany(entidade => entidade.GetIndexes())
            .Select(indice => indice.GetDatabaseName())
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);

        if (objetos.Any(objeto => !ObjetoReconhecido(
                objeto,
                tabelasDaAplicacao,
                indicesDaAplicacao)))
        {
            return EstadoInspecao.Incompativel;
        }

        if (!tabelas.Contains(TabelaHistoricoMigracoes))
        {
            return tabelas.Any(tabelasDaAplicacao.Contains)
                ? EstadoInspecao.Incompativel
                : tabelas.Contains(TabelaBloqueioMigracoes)
                    ? await VerificarBloqueioAsync(conexao, cancellationToken)
                    : EstadoInspecao.Vazio;
        }

        if (!await HistoricoTemFormatoConhecidoAsync(conexao, cancellationToken))
        {
            return EstadoInspecao.Incompativel;
        }

        var migracoesAplicadas = await ConsultarHistoricoAsync(conexao, cancellationToken);
        if (migracoesAplicadas.Count == 0)
        {
            return tabelas.Any(tabelasDaAplicacao.Contains)
                ? EstadoInspecao.Incompativel
                : tabelas.Contains(TabelaBloqueioMigracoes)
                    ? await VerificarBloqueioAsync(conexao, cancellationToken)
                    : EstadoInspecao.Vazio;
        }

        if (migracoesAplicadas.Count > migracoesConhecidas.Count)
        {
            return EstadoInspecao.Incompativel;
        }

        for (var indice = 0; indice < migracoesAplicadas.Count; indice++)
        {
            if (!string.Equals(
                    migracoesAplicadas[indice],
                    migracoesConhecidas[indice],
                    StringComparison.Ordinal))
            {
                return EstadoInspecao.Incompativel;
            }
        }

        if (migracoesAplicadas.Count == migracoesConhecidas.Count &&
            !tabelasDaAplicacao.SetEquals(tabelas.Where(tabelasDaAplicacao.Contains)))
        {
            return EstadoInspecao.Incompativel;
        }

        if (tabelas.Contains(TabelaBloqueioMigracoes))
        {
            var bloqueio = await VerificarBloqueioAsync(conexao, cancellationToken);
            if (bloqueio != EstadoInspecao.Compativel)
            {
                return bloqueio;
            }
        }

        return EstadoInspecao.Compativel;
    }

    private static bool ObjetoReconhecido(
        ObjetoSqlite objeto,
        IReadOnlySet<string> tabelasDaAplicacao,
        IReadOnlySet<string> indicesDaAplicacao) =>
        objeto.Tipo switch
        {
            "table" => tabelasDaAplicacao.Contains(objeto.Nome) ||
                       objeto.Nome is TabelaHistoricoMigracoes or TabelaBloqueioMigracoes,
            "index" => objeto.Nome.StartsWith("sqlite_autoindex_", StringComparison.Ordinal) ||
                       indicesDaAplicacao.Contains(objeto.Nome),
            _ => false
        };

    private static async Task<bool> HistoricoTemFormatoConhecidoAsync(
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var comando = conexao.CreateCommand();
            comando.CommandText = "PRAGMA table_info(\"__EFMigrationsHistory\");";
            await using var leitor = await comando.ExecuteReaderAsync(cancellationToken);
            var colunas = new List<(string Nome, string Tipo, bool NotNull, int ChavePrimaria)>();
            while (await leitor.ReadAsync(cancellationToken))
            {
                colunas.Add((
                    leitor.GetString(1),
                    leitor.GetString(2),
                    leitor.GetInt32(3) != 0,
                    leitor.GetInt32(5)));
            }

            return colunas.Count == 2 &&
                   colunas[0] == ("MigrationId", "TEXT", true, 1) &&
                   colunas[1] == ("ProductVersion", "TEXT", true, 0);
        }
        catch (SqliteException)
        {
            return false;
        }
    }

    private static async Task<List<string>> ConsultarHistoricoAsync(
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = "SELECT MigrationId FROM \"__EFMigrationsHistory\" ORDER BY rowid;";
        await using var leitor = await comando.ExecuteReaderAsync(cancellationToken);
        var migracoes = new List<string>();
        while (await leitor.ReadAsync(cancellationToken))
        {
            migracoes.Add(leitor.GetString(0));
        }

        return migracoes;
    }

    private static async Task<EstadoInspecao> VerificarBloqueioAsync(
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = "SELECT COUNT(*) FROM \"__EFMigrationsLock\";";
        var quantidade = Convert.ToInt64(await comando.ExecuteScalarAsync(cancellationToken));
        return quantidade == 0 ? EstadoInspecao.Compativel : EstadoInspecao.BancoOcupado;
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

    private static async Task<IReadOnlyList<ObjetoSqlite>> ConsultarObjetosAsync(
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = """
            SELECT type, name
            FROM sqlite_master
            WHERE substr(name, 1, 7) <> 'sqlite_'
            ORDER BY type, name;
            """;
        await using var leitor = await comando.ExecuteReaderAsync(cancellationToken);
        var objetos = new List<ObjetoSqlite>();
        while (await leitor.ReadAsync(cancellationToken))
        {
            objetos.Add(new ObjetoSqlite(leitor.GetString(0), leitor.GetString(1)));
        }

        return objetos;
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

    private sealed record ObjetoSqlite(string Tipo, string Nome);

    private enum EstadoInspecao
    {
        Vazio,
        Compativel,
        Incompativel,
        BancoOcupado
    }
}
