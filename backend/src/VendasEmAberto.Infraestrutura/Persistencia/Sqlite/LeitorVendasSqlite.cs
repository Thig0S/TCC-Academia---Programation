using System.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite;

internal sealed class LeitorVendasSqlite
{
    private readonly AbridorVendasSqlite _abridor = new();

    public async Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
        string caminhoAbsoluto,
        DateOnly referencia,
        CancellationToken cancellationToken = default)
    {
        var resultadoAbertura = await _abridor.AbrirAsync(caminhoAbsoluto, cancellationToken);
        if (resultadoAbertura is ResultadoArmazenamento<SessaoVendasSqlite>.Falha falhaAbertura)
        {
            return ResultadoArmazenamento<SnapshotVendas>.CriarFalha(falhaAbertura.Erro);
        }

        await using var sessao = ((ResultadoArmazenamento<SessaoVendasSqlite>.Sucesso)resultadoAbertura).Valor;
        var contexto = sessao.Contexto;

        try
        {
            await using var transacao = await contexto.Database.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);
            var resultado = await CarregarNaTransacaoAtualAsync(contexto, referencia, cancellationToken);
            if (resultado is ResultadoArmazenamento<SnapshotVendas>.Falha)
            {
                return resultado;
            }

            await transacao.CommitAsync(cancellationToken);
            return resultado;
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (DadosPersistidosInvalidosException)
        {
            return Falha(
                CodigosErroArmazenamento.DadosPersistidosInvalidos,
                "O banco contém dados de vendas inconsistentes.");
        }
        catch (SqliteException excecao) when (EhBancoOcupado(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.BancoOcupado,
                "O banco está ocupado por outra operação.");
        }
        catch (SqliteException excecao) when (EhFalhaDeAcesso(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.ArmazenamentoIndisponivel,
                "Não foi possível acessar o armazenamento informado.");
        }
        catch (SqliteException excecao) when (EhFalhaDeSchema(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.SchemaIncompativel,
                "O banco não está na versão de schema esperada.");
        }
        catch (SqliteException)
        {
            return Falha(
                CodigosErroArmazenamento.DadosPersistidosInvalidos,
                "O banco contém dados de vendas inconsistentes.");
        }
        catch (Exception excecao) when (excecao is FormatException or InvalidCastException or OverflowException)
        {
            return Falha(
                CodigosErroArmazenamento.DadosPersistidosInvalidos,
                "O banco contém dados de vendas inconsistentes.");
        }
    }

    internal async Task<ResultadoArmazenamento<SnapshotVendas>> CarregarNaTransacaoAtualAsync(
        VendasDbContext contexto,
        DateOnly referencia,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var estados = await contexto.Set<EstadoArmazenamentoLinha>()
                .AsNoTracking()
                .ToListAsync(cancellationToken);
            if (estados.Count != 1 || estados[0].Id != 1 || estados[0].Revisao < 0)
            {
                throw new DadosPersistidosInvalidosException();
            }

            var identificadores = await contexto.Set<IdentificadorLinha>()
                .AsNoTracking()
                .ToListAsync(cancellationToken);
            var vendas = await contexto.Set<VendaLinha>()
                .AsNoTracking()
                .OrderBy(venda => venda.Ordem)
                .ToListAsync(cancellationToken);
            var parcelas = await contexto.Set<ParcelaLinha>()
                .AsNoTracking()
                .OrderBy(parcela => parcela.VendaId)
                .ThenBy(parcela => parcela.Numero)
                .ToListAsync(cancellationToken);
            var recebimentos = await contexto.Set<RecebimentoLinha>()
                .AsNoTracking()
                .OrderBy(recebimento => recebimento.VendaId)
                .ThenBy(recebimento => recebimento.Ordem)
                .ToListAsync(cancellationToken);
            var alocacoes = await contexto.Set<AlocacaoLinha>()
                .AsNoTracking()
                .OrderBy(alocacao => alocacao.VendaId)
                .ThenBy(alocacao => alocacao.RecebimentoId)
                .ThenBy(alocacao => alocacao.Ordem)
                .ToListAsync(cancellationToken);

            cancellationToken.ThrowIfCancellationRequested();
            ValidarOrdem(vendas.Select(venda => venda.Ordem));
            ValidarRegistroIdentificadores(identificadores, vendas, parcelas, recebimentos);

            var parcelasPorVenda = parcelas.GroupBy(parcela => parcela.VendaId)
                .ToDictionary(grupo => grupo.Key, grupo => grupo.ToArray(), StringComparer.Ordinal);
            var recebimentosPorVenda = recebimentos.GroupBy(recebimento => recebimento.VendaId)
                .ToDictionary(grupo => grupo.Key, grupo => grupo.ToArray(), StringComparer.Ordinal);
            var alocacoesPorRecebimento = alocacoes.GroupBy(alocacao => alocacao.RecebimentoId)
                .ToDictionary(grupo => grupo.Key, grupo => grupo.ToArray(), StringComparer.Ordinal);

            var vendasReconstruidas = new List<Venda>(vendas.Count);
            var totalParcelasConsumidas = 0;
            var totalRecebimentosConsumidos = 0;
            var totalAlocacoesConsumidas = 0;
            foreach (var venda in vendas)
            {
                cancellationToken.ThrowIfCancellationRequested();
                var parcelasDaVenda = parcelasPorVenda.GetValueOrDefault(venda.Id) ?? [];
                var recebimentosDaVenda = recebimentosPorVenda.GetValueOrDefault(venda.Id) ?? [];
                totalParcelasConsumidas += parcelasDaVenda.Length;
                totalRecebimentosConsumidos += recebimentosDaVenda.Length;
                ValidarOrdem(recebimentosDaVenda.Select(recebimento => recebimento.Ordem));

                var dadosRecebimentos = new List<DadosReconstrucaoRecebimento>(recebimentosDaVenda.Length);
                foreach (var recebimento in recebimentosDaVenda)
                {
                    var alocacoesDoRecebimento = alocacoesPorRecebimento.GetValueOrDefault(recebimento.Id) ?? [];
                    ValidarOrdem(alocacoesDoRecebimento.Select(alocacao => alocacao.Ordem));
                    totalAlocacoesConsumidas += alocacoesDoRecebimento.Length;

                    if (alocacoesDoRecebimento.Any(alocacao =>
                            !string.Equals(alocacao.VendaId, recebimento.VendaId, StringComparison.Ordinal)))
                    {
                        throw new DadosPersistidosInvalidosException();
                    }

                    dadosRecebimentos.Add(new DadosReconstrucaoRecebimento(
                        recebimento.Id,
                        recebimento.Data,
                        recebimento.Forma,
                        CriarDinheiro(recebimento.ValorCentavos),
                        recebimento.Origem,
                        CriarDinheiro(recebimento.AcrescimoCentavos),
                        ExigirObservacao(recebimento.Observacao),
                        alocacoesDoRecebimento.Select(alocacao => new DadosReconstrucaoAlocacao(
                            alocacao.ParcelaId,
                            CriarDinheiro(alocacao.ValorCentavos))).ToArray()));
                }

                var dadosCliente = DadosClienteVenda.Criar(
                    venda.ClienteNome,
                    venda.ClienteCpf,
                    venda.ClienteTelefone,
                    venda.ClienteDescricao);
                if (dadosCliente is not ResultadoDominio<DadosClienteVenda>.Sucesso clienteValido ||
                    !ClienteFoiPreservado(venda, clienteValido.Valor))
                {
                    throw new DadosPersistidosInvalidosException();
                }

                var dados = new DadosReconstrucaoVenda(
                    venda.Id,
                    venda.StatusAdministrativo,
                    clienteValido.Valor,
                    venda.DataVenda,
                    CriarDinheiro(venda.ValorTotalBaseCentavos),
                    parcelasDaVenda.Select(parcela => new DadosReconstrucaoParcela(
                        parcela.Id,
                        parcela.Numero,
                        CriarDinheiro(parcela.ValorBaseCentavos),
                        parcela.Vencimento)).ToArray(),
                    dadosRecebimentos);

                if (Venda.Reconstruir(dados, referencia) is not ResultadoDominio<Venda>.Sucesso vendaReconstruida)
                {
                    throw new DadosPersistidosInvalidosException();
                }

                vendasReconstruidas.Add(vendaReconstruida.Valor);
            }

            if (totalParcelasConsumidas != parcelas.Count ||
                totalRecebimentosConsumidos != recebimentos.Count ||
                totalAlocacoesConsumidas != alocacoes.Count)
            {
                throw new DadosPersistidosInvalidosException();
            }

            var conjunto = ConjuntoVendas.Criar(vendasReconstruidas);
            if (conjunto is not ResultadoDominio<ConjuntoVendas>.Sucesso conjuntoValido)
            {
                throw new DadosPersistidosInvalidosException();
            }

            return ResultadoArmazenamento<SnapshotVendas>.CriarSucesso(
                new SnapshotVendas(conjuntoValido.Valor, estados[0].Revisao));
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (DadosPersistidosInvalidosException)
        {
            return Falha(
                CodigosErroArmazenamento.DadosPersistidosInvalidos,
                "O banco contém dados de vendas inconsistentes.");
        }
        catch (SqliteException excecao) when (EhBancoOcupado(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.BancoOcupado,
                "O banco está ocupado por outra operação.");
        }
        catch (SqliteException excecao) when (EhFalhaDeAcesso(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.ArmazenamentoIndisponivel,
                "Não foi possível acessar o armazenamento informado.");
        }
        catch (SqliteException excecao) when (EhFalhaDeSchema(excecao))
        {
            return Falha(
                CodigosErroArmazenamento.SchemaIncompativel,
                "O banco não está na versão de schema esperada.");
        }
        catch (SqliteException)
        {
            return Falha(
                CodigosErroArmazenamento.DadosPersistidosInvalidos,
                "O banco contém dados de vendas inconsistentes.");
        }
        catch (Exception excecao) when (excecao is FormatException or InvalidCastException or OverflowException)
        {
            return Falha(
                CodigosErroArmazenamento.DadosPersistidosInvalidos,
                "O banco contém dados de vendas inconsistentes.");
        }
    }

    private static void ValidarRegistroIdentificadores(
        IReadOnlyCollection<IdentificadorLinha> identificadores,
        IReadOnlyCollection<VendaLinha> vendas,
        IReadOnlyCollection<ParcelaLinha> parcelas,
        IReadOnlyCollection<RecebimentoLinha> recebimentos)
    {
        var esperados = new Dictionary<string, TipoIdentificadorPersistido>(StringComparer.Ordinal);
        foreach (var venda in vendas)
        {
            AdicionarIdentificadorEsperado(esperados, venda.Id, TipoIdentificadorPersistido.Venda);
        }

        foreach (var parcela in parcelas)
        {
            AdicionarIdentificadorEsperado(esperados, parcela.Id, TipoIdentificadorPersistido.Parcela);
        }

        foreach (var recebimento in recebimentos)
        {
            AdicionarIdentificadorEsperado(esperados, recebimento.Id, TipoIdentificadorPersistido.Recebimento);
        }

        if (identificadores.Count != esperados.Count)
        {
            throw new DadosPersistidosInvalidosException();
        }

        foreach (var identificador in identificadores)
        {
            if (!esperados.TryGetValue(identificador.Id, out var tipoEsperado) ||
                identificador.Tipo != tipoEsperado)
            {
                throw new DadosPersistidosInvalidosException();
            }
        }
    }

    private static void AdicionarIdentificadorEsperado(
        IDictionary<string, TipoIdentificadorPersistido> identificadores,
        string id,
        TipoIdentificadorPersistido tipo)
    {
        if (string.IsNullOrEmpty(id) || !identificadores.TryAdd(id, tipo))
        {
            throw new DadosPersistidosInvalidosException();
        }
    }

    private static void ValidarOrdem(IEnumerable<int> ordens)
    {
        var indice = 0;
        foreach (var ordem in ordens)
        {
            if (ordem != indice++)
            {
                throw new DadosPersistidosInvalidosException();
            }
        }
    }

    private static bool ClienteFoiPreservado(VendaLinha linha, DadosClienteVenda cliente) =>
        string.Equals(linha.ClienteNome, cliente.Nome, StringComparison.Ordinal) &&
        string.Equals(linha.ClienteCpf, cliente.Cpf, StringComparison.Ordinal) &&
        string.Equals(linha.ClienteTelefone, cliente.Telefone, StringComparison.Ordinal) &&
        string.Equals(linha.ClienteDescricao, cliente.Descricao, StringComparison.Ordinal);

    private static string ExigirObservacao(string? observacao) =>
        observacao ?? throw new DadosPersistidosInvalidosException();

    private static Dinheiro CriarDinheiro(long centavos)
    {
        if (Dinheiro.Criar(centavos) is ResultadoDominio<Dinheiro>.Sucesso dinheiro)
        {
            return dinheiro.Valor;
        }

        throw new DadosPersistidosInvalidosException();
    }

    private static bool EhBancoOcupado(SqliteException excecao) =>
        excecao.SqliteErrorCode is 5 or 6;

    private static bool EhFalhaDeSchema(SqliteException excecao) =>
        excecao.SqliteErrorCode is 1 or 11 or 26;

    private static bool EhFalhaDeAcesso(SqliteException excecao) =>
        excecao.SqliteErrorCode is 3 or 7 or 8 or 10 or 13 or 14;

    private static ResultadoArmazenamento<SnapshotVendas> Falha(string codigo, string mensagem) =>
        ResultadoArmazenamento<SnapshotVendas>.CriarFalha(new ErroArmazenamento(codigo, mensagem));

    private sealed class DadosPersistidosInvalidosException : Exception
    {
    }
}
