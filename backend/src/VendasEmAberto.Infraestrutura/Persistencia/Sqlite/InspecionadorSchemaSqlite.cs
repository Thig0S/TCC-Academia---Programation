using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal static class InspecionadorSchemaSqlite
{
    private const string TabelaHistoricoMigracoes = "__EFMigrationsHistory";
    private const string TabelaBloqueioMigracoes = "__EFMigrationsLock";

    public static async Task<EstadoSchemaSqlite> InspecionarAsync(
        VendasDbContext contexto,
        string caminho,
        IReadOnlyList<string> migracoesConhecidas,
        CancellationToken cancellationToken)
    {
        if (new FileInfo(caminho).Length == 0)
        {
            return EstadoSchemaSqlite.Vazio;
        }

        await using var conexao = new SqliteConnection(
            OpcoesVendasDbContext.CriarStringConexao(caminho, SqliteOpenMode.ReadWrite));
        await conexao.OpenAsync(cancellationToken);

        var applicationId = await ConsultarPragmaAsync(conexao, "application_id", cancellationToken);
        var userVersion = await ConsultarPragmaAsync(conexao, "user_version", cancellationToken);
        if (applicationId != 0 || userVersion != 0)
        {
            return EstadoSchemaSqlite.Incompativel;
        }

        var objetos = await ConsultarObjetosAsync(conexao, cancellationToken);
        var tabelas = objetos
            .Where(objeto => objeto.Tipo == "table")
            .Select(objeto => objeto.Nome)
            .ToHashSet(StringComparer.Ordinal);

        var modelo = contexto.GetService<IDesignTimeModel>().Model;
        var tabelasDaAplicacao = modelo.GetEntityTypes()
            .Select(entidade => entidade.GetTableName())
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);
        var indicesDaAplicacao = modelo.GetEntityTypes()
            .SelectMany(entidade => entidade.GetIndexes())
            .Select(indice => indice.GetDatabaseName())
            .OfType<string>()
            .ToHashSet(StringComparer.Ordinal);

        if (objetos.Any(objeto => !ObjetoReconhecido(
                objeto,
                tabelasDaAplicacao,
                indicesDaAplicacao)))
        {
            return EstadoSchemaSqlite.Incompativel;
        }

        if (!tabelas.Contains(TabelaHistoricoMigracoes))
        {
            return tabelas.Any(tabelasDaAplicacao.Contains)
                ? EstadoSchemaSqlite.Incompativel
                : tabelas.Contains(TabelaBloqueioMigracoes)
                    ? await VerificarBloqueioEmBancoVazioAsync(conexao, cancellationToken)
                    : EstadoSchemaSqlite.Vazio;
        }

        if (!await HistoricoTemFormatoConhecidoAsync(conexao, cancellationToken))
        {
            return EstadoSchemaSqlite.Incompativel;
        }

        var migracoesAplicadas = await ConsultarHistoricoAsync(conexao, cancellationToken);
        if (migracoesAplicadas.Count == 0)
        {
            return tabelas.Any(tabelasDaAplicacao.Contains)
                ? EstadoSchemaSqlite.Incompativel
                : tabelas.Contains(TabelaBloqueioMigracoes)
                    ? await VerificarBloqueioEmBancoVazioAsync(conexao, cancellationToken)
                    : EstadoSchemaSqlite.Vazio;
        }

        if (migracoesAplicadas.Count > migracoesConhecidas.Count)
        {
            return EstadoSchemaSqlite.Incompativel;
        }

        for (var indice = 0; indice < migracoesAplicadas.Count; indice++)
        {
            if (!string.Equals(
                    migracoesAplicadas[indice],
                    migracoesConhecidas[indice],
                    StringComparison.Ordinal))
            {
                return EstadoSchemaSqlite.Incompativel;
            }
        }

        if (migracoesAplicadas.Count == migracoesConhecidas.Count &&
            !tabelasDaAplicacao.SetEquals(tabelas.Where(tabelasDaAplicacao.Contains)))
        {
            return EstadoSchemaSqlite.Incompativel;
        }

        if (tabelas.Contains(TabelaBloqueioMigracoes))
        {
            var bloqueio = await VerificarBloqueioAsync(conexao, cancellationToken);
            if (bloqueio != EstadoSchemaSqlite.Atual)
            {
                return bloqueio;
            }
        }

        if (migracoesAplicadas.Count != migracoesConhecidas.Count)
        {
            return EstadoSchemaSqlite.MigracoesPendentes;
        }

        return await SchemaFisicoCorrespondeAsync(
            modelo,
            conexao,
            tabelasDaAplicacao,
            indicesDaAplicacao,
            objetos,
            cancellationToken)
            ? EstadoSchemaSqlite.Atual
            : EstadoSchemaSqlite.Incompativel;
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

    private static async Task<EstadoSchemaSqlite> VerificarBloqueioAsync(
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = "SELECT COUNT(*) FROM \"__EFMigrationsLock\";";
        var quantidade = Convert.ToInt64(await comando.ExecuteScalarAsync(cancellationToken));
        return quantidade == 0 ? EstadoSchemaSqlite.Atual : EstadoSchemaSqlite.BancoOcupado;
    }

    private static async Task<EstadoSchemaSqlite> VerificarBloqueioEmBancoVazioAsync(
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        var estado = await VerificarBloqueioAsync(conexao, cancellationToken);
        return estado == EstadoSchemaSqlite.BancoOcupado
            ? estado
            : EstadoSchemaSqlite.Vazio;
    }

    private static async Task<bool> SchemaFisicoCorrespondeAsync(
        IModel modelo,
        SqliteConnection conexao,
        IReadOnlySet<string> tabelasDaAplicacao,
        IReadOnlySet<string> indicesDaAplicacao,
        IReadOnlyList<ObjetoSqlite> objetos,
        CancellationToken cancellationToken)
    {
        var indicesExistentes = objetos
            .Where(objeto => objeto.Tipo == "index")
            .Select(objeto => objeto.Nome)
            .ToHashSet(StringComparer.Ordinal);
        if (!indicesDaAplicacao.IsSubsetOf(indicesExistentes))
        {
            return false;
        }

        foreach (var entidade in modelo.GetEntityTypes())
        {
            var nomeTabela = entidade.GetTableName();
            if (nomeTabela is null)
            {
                return false;
            }

            var identificadorTabela = StoreObjectIdentifier.Table(nomeTabela, entidade.GetSchema());
            var colunasEsperadas = entidade.GetProperties()
                .Select(propriedade => new ColunaEsperada(
                    propriedade.GetColumnName(identificadorTabela),
                    propriedade.GetColumnType(),
                    propriedade.IsNullable,
                    entidade.FindPrimaryKey()?.Properties.ToList().IndexOf(propriedade) + 1 ?? 0))
                .ToArray();

            if (colunasEsperadas.Any(coluna => coluna.Nome is null || coluna.Tipo is null))
            {
                return false;
            }

            var colunasExistentes = await ConsultarColunasAsync(
                conexao,
                nomeTabela,
                cancellationToken);
            if (colunasExistentes.Count != colunasEsperadas.Length)
            {
                return false;
            }

            foreach (var esperada in colunasEsperadas)
            {
                if (!colunasExistentes.TryGetValue(esperada.Nome!, out var existente) ||
                    !string.Equals(esperada.Tipo, existente.Tipo, StringComparison.OrdinalIgnoreCase) ||
                    esperada.NotNull != existente.NotNull ||
                    esperada.OrdemChavePrimaria != existente.OrdemChavePrimaria)
                {
                    return false;
                }
            }

            var sqlTabela = await ConsultarSqlTabelaAsync(conexao, nomeTabela, cancellationToken);
            if (sqlTabela is null || entidade.GetCheckConstraints().Any(
                    constraint => !sqlTabela.Contains($"\"{constraint.Name}\"", StringComparison.Ordinal)))
            {
                return false;
            }

            if (!await ChavesEstrangeirasCorrespondemAsync(
                    entidade,
                    identificadorTabela,
                    conexao,
                    cancellationToken))
            {
                return false;
            }
        }

        return tabelasDaAplicacao.Count == modelo.GetEntityTypes().Count();
    }

    private static async Task<IReadOnlyDictionary<string, ColunaExistente>> ConsultarColunasAsync(
        SqliteConnection conexao,
        string tabela,
        CancellationToken cancellationToken)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = $"PRAGMA table_info({DelimitarIdentificador(tabela)});";
        await using var leitor = await comando.ExecuteReaderAsync(cancellationToken);
        var colunas = new Dictionary<string, ColunaExistente>(StringComparer.Ordinal);
        while (await leitor.ReadAsync(cancellationToken))
        {
            colunas.Add(
                leitor.GetString(1),
                new ColunaExistente(
                    leitor.GetString(2),
                    leitor.GetInt32(3) != 0,
                    leitor.GetInt32(5)));
        }

        return colunas;
    }

    private static async Task<string?> ConsultarSqlTabelaAsync(
        SqliteConnection conexao,
        string tabela,
        CancellationToken cancellationToken)
    {
        await using var comando = conexao.CreateCommand();
        comando.CommandText = "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = $nome;";
        comando.Parameters.AddWithValue("$nome", tabela);
        return await comando.ExecuteScalarAsync(cancellationToken) as string;
    }

    private static async Task<bool> ChavesEstrangeirasCorrespondemAsync(
        IEntityType entidade,
        StoreObjectIdentifier identificadorTabela,
        SqliteConnection conexao,
        CancellationToken cancellationToken)
    {
        var esperadas = new HashSet<string>(StringComparer.Ordinal);
        foreach (var chave in entidade.GetForeignKeys())
        {
            var nomeTabelaPrincipal = chave.PrincipalEntityType.GetTableName();
            if (nomeTabelaPrincipal is null)
            {
                return false;
            }

            var identificadorPrincipal = StoreObjectIdentifier.Table(
                nomeTabelaPrincipal,
                chave.PrincipalEntityType.GetSchema());
            var colunasOrigem = chave.Properties
                .Select(propriedade => propriedade.GetColumnName(identificadorTabela))
                .ToArray();
            var colunasDestino = chave.PrincipalKey.Properties
                .Select(propriedade => propriedade.GetColumnName(identificadorPrincipal))
                .ToArray();
            if (colunasOrigem.Any(coluna => coluna is null) || colunasDestino.Any(coluna => coluna is null))
            {
                return false;
            }

            esperadas.Add(CriarAssinaturaChaveEstrangeira(
                nomeTabelaPrincipal,
                colunasOrigem!,
                colunasDestino!,
                AcoesAoExcluir(chave.DeleteBehavior)));
        }

        var nomeTabela = entidade.GetTableName();
        if (nomeTabela is null)
        {
            return false;
        }

        await using var comando = conexao.CreateCommand();
        comando.CommandText = $"PRAGMA foreign_key_list({DelimitarIdentificador(nomeTabela)});";
        await using var leitor = await comando.ExecuteReaderAsync(cancellationToken);
        var partes = new List<ParteChaveEstrangeira>();
        while (await leitor.ReadAsync(cancellationToken))
        {
            partes.Add(new ParteChaveEstrangeira(
                leitor.GetInt32(0),
                leitor.GetInt32(1),
                leitor.GetString(2),
                leitor.GetString(3),
                leitor.GetString(4),
                leitor.GetString(5),
                leitor.GetString(6)));
        }

        var existentes = partes
            .GroupBy(parte => parte.Id)
            .Select(grupo =>
            {
                var ordenadas = grupo.OrderBy(parte => parte.Sequencia).ToArray();
                return CriarAssinaturaChaveEstrangeira(
                    ordenadas[0].Tabela,
                    ordenadas.Select(parte => parte.Origem).ToArray(),
                    ordenadas.Select(parte => parte.Destino).ToArray(),
                    ordenadas[0].AcaoAoExcluir,
                    ordenadas[0].AcaoAoAtualizar);
            })
            .ToHashSet(StringComparer.Ordinal);

        return esperadas.SetEquals(existentes);
    }

    private static string CriarAssinaturaChaveEstrangeira(
        string tabela,
        IReadOnlyList<string?> origem,
        IReadOnlyList<string?> destino,
        string acaoAoExcluir,
        string acaoAoAtualizar = "NO ACTION") =>
        string.Join("\u001f", [
            tabela,
            string.Join("\u001e", origem),
            string.Join("\u001e", destino),
            acaoAoAtualizar,
            acaoAoExcluir]);

    private static string AcoesAoExcluir(DeleteBehavior comportamento) => comportamento switch
    {
        DeleteBehavior.Restrict => "RESTRICT",
        DeleteBehavior.Cascade => "CASCADE",
        DeleteBehavior.SetNull => "SET NULL",
        _ => "NO ACTION"
    };

    private static string DelimitarIdentificador(string identificador) =>
        $"\"{identificador.Replace("\"", "\"\"", StringComparison.Ordinal)}\"";

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

    private sealed record ColunaEsperada(
        string? Nome,
        string? Tipo,
        bool Nullable,
        int OrdemChavePrimaria)
    {
        public bool NotNull => !Nullable;
    }

    private sealed record ColunaExistente(
        string Tipo,
        bool NotNull,
        int OrdemChavePrimaria);

    private sealed record ParteChaveEstrangeira(
        int Id,
        int Sequencia,
        string Tabela,
        string Origem,
        string Destino,
        string AcaoAoAtualizar,
        string AcaoAoExcluir);

    private sealed record ObjetoSqlite(string Tipo, string Nome);
}

internal enum EstadoSchemaSqlite
{
    Vazio,
    Atual,
    MigracoesPendentes,
    Incompativel,
    BancoOcupado
}
