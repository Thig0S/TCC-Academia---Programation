using System.Globalization;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Projecoes;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal sealed class GravadorVendasSqlite
{
    private readonly AbridorVendasSqlite _abridor = new();
    private readonly LeitorVendasSqlite _leitor = new();
    private readonly IIntervencaoTransacionalGravacaoSqlite? _intervencaoTeste;

    public GravadorVendasSqlite()
    {
    }

    internal GravadorVendasSqlite(IIntervencaoTransacionalGravacaoSqlite intervencaoTeste)
    {
        _intervencaoTeste = intervencaoTeste ?? throw new ArgumentNullException(nameof(intervencaoTeste));
    }

    public async Task<ResultadoArmazenamento<long>> SalvarAsync(
        string caminhoAbsoluto,
        IEnumerable<Venda> candidatoCompleto,
        long revisaoEsperada,
        DateOnly referencia,
        CancellationToken cancellationToken = default)
    {
        var candidato = PrepararCandidato(candidatoCompleto, referencia);
        if (candidato is ResultadoArmazenamento<ConjuntoVendas>.Falha falhaCandidato)
        {
            return ResultadoArmazenamento<long>.CriarFalha(falhaCandidato.Erro);
        }

        var conjunto = ((ResultadoArmazenamento<ConjuntoVendas>.Sucesso)candidato).Valor;
        var resultadoAbertura = await _abridor.AbrirAsync(caminhoAbsoluto, cancellationToken);
        if (resultadoAbertura is ResultadoArmazenamento<SessaoVendasSqlite>.Falha falhaAbertura)
        {
            return ResultadoArmazenamento<long>.CriarFalha(falhaAbertura.Erro);
        }

        await using var sessao = ((ResultadoArmazenamento<SessaoVendasSqlite>.Sucesso)resultadoAbertura).Valor;
        var contexto = sessao.Contexto;
        var conexao = (SqliteConnection)contexto.Database.GetDbConnection();

        try
        {
            cancellationToken.ThrowIfCancellationRequested();
            await using var transacaoSqlite = conexao.BeginTransaction(deferred: false);
            var transacaoContexto = await contexto.Database.UseTransactionAsync(
                transacaoSqlite,
                cancellationToken);
            if (transacaoContexto is null)
            {
                throw new InvalidOperationException("A transação SQLite não foi associada ao contexto.");
            }

            await using (transacaoContexto)
            {
                // A transação imediata impede outro escritor de alterar dados entre esta
                // leitura integral e a confirmação do token de revisão.
                var resultadoAtual = await _leitor.CarregarNaTransacaoAtualAsync(
                    contexto,
                    referencia,
                    cancellationToken);
                if (resultadoAtual is ResultadoArmazenamento<SnapshotVendas>.Falha falhaAtual)
                {
                    return ResultadoArmazenamento<long>.CriarFalha(falhaAtual.Erro);
                }

                var atual = ((ResultadoArmazenamento<SnapshotVendas>.Sucesso)resultadoAtual).Valor;
                if (atual.Revisao != revisaoEsperada)
                {
                    return Falha(
                        CodigosErroArmazenamento.ConflitoRevisao,
                        "A revisão do armazenamento mudou; carregue novamente antes de salvar.");
                }

                if (atual.Revisao == long.MaxValue)
                {
                    return Falha(
                        CodigosErroArmazenamento.LimiteRevisaoExcedido,
                        "O armazenamento atingiu o limite de revisões suportado.");
                }

                var validacaoPreservacao = ValidarPreservacaoHistorico(atual.Conjunto, conjunto);
                if (validacaoPreservacao is not null)
                {
                    return ResultadoArmazenamento<long>.CriarFalha(validacaoPreservacao);
                }

                var novaRevisao = atual.Revisao + 1;
                var linhasAtualizadas = await ExecutarAsync(
                    conexao,
                    transacaoSqlite,
                    "UPDATE EstadoArmazenamento SET Revisao = $nova WHERE Id = 1 AND Revisao = $esperada;",
                    ("$nova", novaRevisao),
                    ("$esperada", revisaoEsperada));
                if (linhasAtualizadas != 1)
                {
                    return Falha(
                        CodigosErroArmazenamento.ConflitoRevisao,
                        "A revisão do armazenamento mudou; carregue novamente antes de salvar.");
                }

                if (_intervencaoTeste is not null)
                {
                    await _intervencaoTeste.DepoisDaPrimeiraAlteracaoAsync(cancellationToken);
                }

                await MoverOrdensParaFaixaTemporariaAsync(conexao, transacaoSqlite, atual.Conjunto, cancellationToken);
                await GravarIdentificadoresAsync(conexao, transacaoSqlite, conjunto, cancellationToken);
                await GravarVendasAsync(conexao, transacaoSqlite, conjunto, cancellationToken);
                await GravarParcelasAsync(conexao, transacaoSqlite, conjunto, cancellationToken);
                await GravarRecebimentosAsync(conexao, transacaoSqlite, conjunto, cancellationToken);
                await GravarAlocacoesAsync(
                    conexao,
                    transacaoSqlite,
                    atual.Conjunto,
                    conjunto,
                    cancellationToken);

                cancellationToken.ThrowIfCancellationRequested();
                try
                {
                    if (_intervencaoTeste is null)
                    {
                        await transacaoContexto.CommitAsync(cancellationToken);
                    }
                    else
                    {
                        await _intervencaoTeste.ConfirmarAsync(transacaoContexto, cancellationToken);
                    }
                }
                catch (Exception)
                {
                    // Uma falha no protocolo de confirmação não prova que o SQLite
                    // deixou a transação sem commit; exigir releitura, nunca retry cego.
                    return Falha(
                        CodigosErroArmazenamento.ConfirmacaoIndeterminada,
                        "A confirmação da gravação é indeterminada; recarregue o armazenamento antes de tentar novamente.");
                }

                return ResultadoArmazenamento<long>.CriarSucesso(novaRevisao);
            }
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
        catch (SqliteException excecao) when (EhViolacaoDeConstraint(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.CandidatoInvalido,
                "O candidato não corresponde às regras do armazenamento.");
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

    private static ResultadoArmazenamento<ConjuntoVendas> PrepararCandidato(
        IEnumerable<Venda> candidatoCompleto,
        DateOnly referencia)
    {
        var resultadoConjunto = ConjuntoVendas.Criar(candidatoCompleto);
        if (resultadoConjunto is not ResultadoDominio<ConjuntoVendas>.Sucesso conjuntoValido)
        {
            return FalhaCandidato();
        }

        foreach (var venda in conjuntoValido.Valor.Vendas)
        {
            if (venda.Projetar(referencia) is not ResultadoDominio<ProjecaoVenda>.Sucesso)
            {
                return FalhaCandidato();
            }
        }

        return ResultadoArmazenamento<ConjuntoVendas>.CriarSucesso(conjuntoValido.Valor);
    }

    private static ErroArmazenamento? ValidarPreservacaoHistorico(
        ConjuntoVendas atual,
        ConjuntoVendas candidato)
    {
        var vendasCandidatas = candidato.Vendas.ToDictionary(venda => venda.Id, StringComparer.Ordinal);
        foreach (var vendaAtual in atual.Vendas)
        {
            if (!vendasCandidatas.TryGetValue(vendaAtual.Id, out var vendaCandidata))
            {
                return new ErroArmazenamento(
                    CodigosErroArmazenamento.ExclusaoNaoPermitida,
                        "Não é permitido omitir uma venda já armazenada.");
            }

            if (vendaCandidata.DataVenda != vendaAtual.DataVenda ||
                vendaCandidata.ValorTotalBase.Centavos != vendaAtual.ValorTotalBase.Centavos ||
                !ContratoParcelasIgual(vendaAtual, vendaCandidata))
            {
                return FalhaHistorico();
            }

            if (vendaCandidata.Recebimentos.Count < vendaAtual.Recebimentos.Count)
            {
                return FalhaHistorico();
            }

            for (var indice = 0; indice < vendaAtual.Recebimentos.Count; indice++)
            {
                var recebimentoAtual = vendaAtual.Recebimentos[indice];
                var recebimentoCandidato = vendaCandidata.Recebimentos[indice];
                if (!RecebimentoPreservado(recebimentoAtual, recebimentoCandidato))
                {
                    return FalhaHistorico();
                }
            }

            if (vendaCandidata.Recebimentos
                .Skip(vendaAtual.Recebimentos.Count)
                .Any(recebimento => recebimento.Origem != OrigemRecebimento.Individual))
            {
                return FalhaHistorico();
            }
        }

        return null;
    }

    private static bool ContratoParcelasIgual(Venda atual, Venda candidato)
    {
        if (atual.Parcelas.Count != candidato.Parcelas.Count)
        {
            return false;
        }

        for (var indice = 0; indice < atual.Parcelas.Count; indice++)
        {
            var parcelaAtual = atual.Parcelas[indice];
            var parcelaCandidata = candidato.Parcelas[indice];
            if (!string.Equals(parcelaAtual.Id, parcelaCandidata.Id, StringComparison.Ordinal) ||
                parcelaAtual.Numero != parcelaCandidata.Numero ||
                parcelaAtual.ValorBase.Centavos != parcelaCandidata.ValorBase.Centavos ||
                parcelaAtual.Vencimento != parcelaCandidata.Vencimento)
            {
                return false;
            }
        }

        return true;
    }

    private static bool RecebimentoPreservado(
        RecebimentoVenda atual,
        RecebimentoVenda candidato)
    {
        if (!string.Equals(atual.Id, candidato.Id, StringComparison.Ordinal) ||
            atual.Origem != candidato.Origem ||
            atual.Alocacoes.Count != candidato.Alocacoes.Count)
        {
            return false;
        }

        for (var indice = 0; indice < atual.Alocacoes.Count; indice++)
        {
            if (!string.Equals(
                    atual.Alocacoes[indice].ParcelaId,
                    candidato.Alocacoes[indice].ParcelaId,
                    StringComparison.Ordinal))
            {
                return false;
            }
        }

        if (atual.Origem == OrigemRecebimento.Individual)
        {
            // A correção de domínio pode alterar valor/acréscimo, data, forma e observação;
            // a identidade, origem, sequência e parcela alocada continuam estáveis.
            return true;
        }

        if (atual.Data != candidato.Data ||
            atual.Forma != candidato.Forma ||
            atual.Valor.Centavos != candidato.Valor.Centavos ||
            atual.Acrescimo.Centavos != candidato.Acrescimo.Centavos ||
            !string.Equals(atual.Observacao, candidato.Observacao, StringComparison.Ordinal))
        {
            return false;
        }

        for (var indice = 0; indice < atual.Alocacoes.Count; indice++)
        {
            if (atual.Alocacoes[indice].Valor.Centavos != candidato.Alocacoes[indice].Valor.Centavos)
            {
                return false;
            }
        }

        return true;
    }

    private static async Task MoverOrdensParaFaixaTemporariaAsync(
        SqliteConnection conexao,
        SqliteTransaction transacao,
        ConjuntoVendas atual,
        CancellationToken cancellationToken)
    {
        for (var indiceVenda = 0; indiceVenda < atual.Vendas.Count; indiceVenda++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var venda = atual.Vendas[indiceVenda];
            await ExecutarAsync(
                conexao,
                transacao,
                "UPDATE Vendas SET Ordem = $temporaria WHERE Id = $id;",
                ("$temporaria", int.MaxValue - indiceVenda),
                ("$id", venda.Id));

            for (var indiceParcela = 0; indiceParcela < venda.Parcelas.Count; indiceParcela++)
            {
                await ExecutarAsync(
                    conexao,
                    transacao,
                    "UPDATE Parcelas SET Numero = $temporario WHERE Id = $id;",
                    ("$temporario", int.MaxValue - indiceParcela),
                    ("$id", venda.Parcelas[indiceParcela].Id));
            }

            for (var indiceRecebimento = 0; indiceRecebimento < venda.Recebimentos.Count; indiceRecebimento++)
            {
                var recebimento = venda.Recebimentos[indiceRecebimento];
                await ExecutarAsync(
                    conexao,
                    transacao,
                    "UPDATE Recebimentos SET Ordem = $temporaria WHERE Id = $id;",
                    ("$temporaria", int.MaxValue - indiceRecebimento),
                    ("$id", recebimento.Id));

                for (var indiceAlocacao = 0; indiceAlocacao < recebimento.Alocacoes.Count; indiceAlocacao++)
                {
                    await ExecutarAsync(
                        conexao,
                        transacao,
                        "UPDATE Alocacoes SET Ordem = $temporaria WHERE RecebimentoId = $recebimentoId AND Ordem = $ordem;",
                        ("$temporaria", int.MaxValue - indiceAlocacao),
                        ("$recebimentoId", recebimento.Id),
                        ("$ordem", indiceAlocacao));
                }
            }
        }
    }

    private static async Task GravarIdentificadoresAsync(
        SqliteConnection conexao,
        SqliteTransaction transacao,
        ConjuntoVendas conjunto,
        CancellationToken cancellationToken)
    {
        foreach (var venda in conjunto.Vendas)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await ExecutarAsync(
                conexao,
                transacao,
                "INSERT INTO Identificadores (Id, Tipo) VALUES ($id, 0) ON CONFLICT (Id) DO UPDATE SET Tipo = excluded.Tipo;",
                ("$id", venda.Id));
            foreach (var parcela in venda.Parcelas)
            {
                await ExecutarAsync(
                    conexao,
                    transacao,
                    "INSERT INTO Identificadores (Id, Tipo) VALUES ($id, 1) ON CONFLICT (Id) DO UPDATE SET Tipo = excluded.Tipo;",
                    ("$id", parcela.Id));
            }

            foreach (var recebimento in venda.Recebimentos)
            {
                await ExecutarAsync(
                    conexao,
                    transacao,
                    "INSERT INTO Identificadores (Id, Tipo) VALUES ($id, 2) ON CONFLICT (Id) DO UPDATE SET Tipo = excluded.Tipo;",
                    ("$id", recebimento.Id));
            }
        }
    }

    private static async Task GravarVendasAsync(
        SqliteConnection conexao,
        SqliteTransaction transacao,
        ConjuntoVendas conjunto,
        CancellationToken cancellationToken)
    {
        for (var ordem = 0; ordem < conjunto.Vendas.Count; ordem++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var venda = conjunto.Vendas[ordem];
            await ExecutarAsync(
                conexao,
                transacao,
                """
                INSERT INTO Vendas
                    (Id, Ordem, StatusAdministrativo, ClienteNome, ClienteCpf, ClienteTelefone,
                     ClienteDescricao, DataVenda, ValorTotalBaseCentavos)
                VALUES
                    ($id, $ordem, $status, $nome, $cpf, $telefone, $descricao, $data, $valorBase)
                ON CONFLICT (Id) DO UPDATE SET
                    Ordem = excluded.Ordem,
                    StatusAdministrativo = excluded.StatusAdministrativo,
                    ClienteNome = excluded.ClienteNome,
                    ClienteCpf = excluded.ClienteCpf,
                    ClienteTelefone = excluded.ClienteTelefone,
                    ClienteDescricao = excluded.ClienteDescricao,
                    DataVenda = excluded.DataVenda,
                    ValorTotalBaseCentavos = excluded.ValorTotalBaseCentavos;
                """,
                ("$id", venda.Id),
                ("$ordem", ordem),
                ("$status", (int)venda.StatusAdministrativo),
                ("$nome", venda.Cliente.Nome),
                ("$cpf", venda.Cliente.Cpf),
                ("$telefone", venda.Cliente.Telefone),
                ("$descricao", venda.Cliente.Descricao),
                ("$data", FormatarData(venda.DataVenda)),
                ("$valorBase", venda.ValorTotalBase.Centavos));
        }
    }

    private static async Task GravarParcelasAsync(
        SqliteConnection conexao,
        SqliteTransaction transacao,
        ConjuntoVendas conjunto,
        CancellationToken cancellationToken)
    {
        foreach (var venda in conjunto.Vendas)
        {
            foreach (var parcela in venda.Parcelas)
            {
                cancellationToken.ThrowIfCancellationRequested();
                await ExecutarAsync(
                    conexao,
                    transacao,
                    """
                    INSERT INTO Parcelas (Id, VendaId, Numero, ValorBaseCentavos, Vencimento)
                    VALUES ($id, $vendaId, $numero, $valorBase, $vencimento)
                    ON CONFLICT (Id) DO UPDATE SET
                        VendaId = excluded.VendaId,
                        Numero = excluded.Numero,
                        ValorBaseCentavos = excluded.ValorBaseCentavos,
                        Vencimento = excluded.Vencimento;
                    """,
                    ("$id", parcela.Id),
                    ("$vendaId", venda.Id),
                    ("$numero", parcela.Numero),
                    ("$valorBase", parcela.ValorBase.Centavos),
                    ("$vencimento", FormatarData(parcela.Vencimento)));
            }
        }
    }

    private static async Task GravarRecebimentosAsync(
        SqliteConnection conexao,
        SqliteTransaction transacao,
        ConjuntoVendas conjunto,
        CancellationToken cancellationToken)
    {
        foreach (var venda in conjunto.Vendas)
        {
            for (var ordem = 0; ordem < venda.Recebimentos.Count; ordem++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var recebimento = venda.Recebimentos[ordem];
                await ExecutarAsync(
                    conexao,
                    transacao,
                    """
                    INSERT INTO Recebimentos
                        (Id, VendaId, Ordem, Data, Forma, Origem, ValorCentavos, AcrescimoCentavos, Observacao)
                    VALUES
                        ($id, $vendaId, $ordem, $data, $forma, $origem, $valor, $acrescimo, $observacao)
                    ON CONFLICT (Id) DO UPDATE SET
                        VendaId = excluded.VendaId,
                        Ordem = excluded.Ordem,
                        Data = excluded.Data,
                        Forma = excluded.Forma,
                        Origem = excluded.Origem,
                        ValorCentavos = excluded.ValorCentavos,
                        AcrescimoCentavos = excluded.AcrescimoCentavos,
                        Observacao = excluded.Observacao;
                    """,
                    ("$id", recebimento.Id),
                    ("$vendaId", venda.Id),
                    ("$ordem", ordem),
                    ("$data", FormatarData(recebimento.Data)),
                    ("$forma", (int)recebimento.Forma),
                    ("$origem", (int)recebimento.Origem),
                    ("$valor", recebimento.Valor.Centavos),
                    ("$acrescimo", recebimento.Acrescimo.Centavos),
                    ("$observacao", recebimento.Observacao));
            }
        }
    }

    private static async Task GravarAlocacoesAsync(
        SqliteConnection conexao,
        SqliteTransaction transacao,
        ConjuntoVendas atual,
        ConjuntoVendas candidato,
        CancellationToken cancellationToken)
    {
        var recebimentosAtuais = atual.Vendas
            .SelectMany(venda => venda.Recebimentos)
            .ToDictionary(recebimento => recebimento.Id, StringComparer.Ordinal);
        foreach (var venda in candidato.Vendas)
        {
            foreach (var recebimento in venda.Recebimentos)
            {
                recebimentosAtuais.TryGetValue(recebimento.Id, out var recebimentoAtual);
                for (var ordem = 0; ordem < recebimento.Alocacoes.Count; ordem++)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    var alocacao = recebimento.Alocacoes[ordem];
                    if (recebimentoAtual is not null && ordem < recebimentoAtual.Alocacoes.Count)
                    {
                        var atualizada = await ExecutarAsync(
                            conexao,
                            transacao,
                            """
                            UPDATE Alocacoes
                            SET Ordem = $ordem, VendaId = $vendaId, ParcelaId = $parcelaId, ValorCentavos = $valor
                            WHERE RecebimentoId = $recebimentoId AND Ordem = $ordemTemporaria;
                            """,
                            ("$ordem", ordem),
                            ("$vendaId", venda.Id),
                            ("$parcelaId", alocacao.ParcelaId),
                            ("$valor", alocacao.Valor.Centavos),
                            ("$recebimentoId", recebimento.Id),
                            ("$ordemTemporaria", int.MaxValue - ordem));
                        if (atualizada != 1)
                        {
                            throw new InvalidOperationException("Uma alocação lida não foi encontrada para atualização.");
                        }
                    }
                    else
                    {
                        await ExecutarAsync(
                            conexao,
                            transacao,
                            "INSERT INTO Alocacoes (RecebimentoId, Ordem, VendaId, ParcelaId, ValorCentavos) VALUES ($recebimentoId, $ordem, $vendaId, $parcelaId, $valor);",
                            ("$recebimentoId", recebimento.Id),
                            ("$ordem", ordem),
                            ("$vendaId", venda.Id),
                            ("$parcelaId", alocacao.ParcelaId),
                            ("$valor", alocacao.Valor.Centavos));
                    }
                }
            }
        }
    }

    private static async Task<int> ExecutarAsync(
        SqliteConnection conexao,
        SqliteTransaction transacao,
        string sql,
        params (string Nome, object? Valor)[] parametros)
    {
        await using var comando = conexao.CreateCommand();
        comando.Transaction = transacao;
        comando.CommandText = sql;
        foreach (var (nome, valor) in parametros)
        {
            comando.Parameters.AddWithValue(nome, valor ?? DBNull.Value);
        }

        return await comando.ExecuteNonQueryAsync();
    }

    private static string FormatarData(DateOnly data) =>
        data.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static bool EhBancoOcupado(SqliteException excecao) =>
        excecao.SqliteErrorCode is 5 or 6;

    private static bool EhSchemaIncompativel(SqliteException excecao) =>
        excecao.SqliteErrorCode is 1 or 11 or 26;

    private static bool EhFalhaDeAcesso(SqliteException excecao) =>
        excecao.SqliteErrorCode is 3 or 7 or 8 or 10 or 13 or 14;

    private static bool EhViolacaoDeConstraint(SqliteException excecao) =>
        excecao.SqliteErrorCode == 19;

    private static ResultadoArmazenamento<ConjuntoVendas> FalhaCandidato() =>
        ResultadoArmazenamento<ConjuntoVendas>.CriarFalha(new ErroArmazenamento(
            CodigosErroArmazenamento.CandidatoInvalido,
            "O candidato completo contém vendas ou histórico inválidos."));

    private static ErroArmazenamento FalhaHistorico() =>
        new(
            CodigosErroArmazenamento.AlteracaoHistoricoNaoPermitida,
            "Não é permitido remover vendas, parcelas ou recebimentos nem alterar contrato ou histórico protegido.");

    private static ResultadoArmazenamento<long> Falha(string codigo, string mensagem) =>
        ResultadoArmazenamento<long>.CriarFalha(new ErroArmazenamento(codigo, mensagem));
}
