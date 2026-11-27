using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.DependencyInjection;
using VendasEmAberto.Aplicacao.Persistencia;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Dominio.Valores;
using VendasEmAberto.Dominio.Vendas;

namespace VendasEmAberto.IntegrationTests.Endpoints;

[TestClass]
public sealed class EditarClienteVendaEndpointTests
{
    private static readonly DateOnly Referencia = new(2027, 3, 15);
    private string _diretorioTemporario = string.Empty;
    private string _caminhoBanco = string.Empty;

    [TestInitialize]
    public void Inicializar()
    {
        _diretorioTemporario = Path.Combine(Path.GetTempPath(), $"vendas-api-edicao-cliente-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_diretorioTemporario);
        _caminhoBanco = Path.Combine(_diretorioTemporario, "vendas.sqlite");
    }

    [TestCleanup]
    public void Limpar()
    {
        SqliteConnection.ClearAllPools();
        if (Directory.Exists(_diretorioTemporario))
        {
            Directory.Delete(_diretorioTemporario, recursive: true);
        }
    }

    [TestMethod]
    public async Task PutCliente_EditaTodosStatusPreservaHistoricoIgnoraCamposFinanceirosEConfirmaNoOp()
    {
        var segredo = CriarSegredo();
        var iniciais = new[]
        {
            CriarVenda("ativa-aberta", StatusAdministrativoVenda.Ativo, "52998224725", paga: false),
            CriarVenda("ativa-quitada", StatusAdministrativoVenda.Ativo, "52998224725", paga: true),
            CriarVenda("inativa", StatusAdministrativoVenda.Inativo, "52998224725", paga: false),
            CriarVenda("prejuizo", StatusAdministrativoVenda.Prejuizo, "52998224725", paga: false),
            CriarVenda("cpf-destino", StatusAdministrativoVenda.Ativo, "11144477735", paga: false)
        };

        await PersistirAsync(iniciais, segredo);

        var contador = new ContadorSalvamentos();
        await using (var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services => DecorarArmazenamento(services, contador))))
        {
            var armazenamento = fixture.Servicos.GetRequiredService<ArmazenamentoComContador>();
            contador.Zerar();
            var edicoes = new[]
            {
                (Id: "ativa-aberta", Status: "Ativo", Nome: "Cliente alterado ativa-aberta", Cpf: "11144477735"),
                (Id: "ativa-quitada", Status: "Ativo", Nome: "Cliente alterado ativa-quitada", Cpf: "52998224725"),
                (Id: "inativa", Status: "Inativo", Nome: "Cliente alterado inativa", Cpf: "52998224725"),
                (Id: "prejuizo", Status: "Prejuizo", Nome: "Cliente alterado prejuizo", Cpf: "52998224725")
            };
            var revisao = 1L;

            foreach (var (id, status, nome, cpf) in edicoes)
            {
                using var resposta = await EnviarAsync(
                    fixture.Cliente,
                    segredo,
                    CriarCorpoEdicao(
                        id,
                        nome,
                        cpf,
                        "(11) 90000-1111",
                        " descrição Unicode — 🧾 ",
                        revisao,
                        incluirExtras: id == "ativa-aberta"));

                Assert.AreEqual(HttpStatusCode.OK, resposta.StatusCode, id);
                Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), id);
                Assert.AreEqual("application/json", resposta.Content.Headers.ContentType?.MediaType, id);
                using var documento = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
                revisao++;
                AssertDetalhe(documento.RootElement, id, status, nome, cpf, revisao, paga: id == "ativa-quitada");
            }

            Assert.AreEqual(5L, revisao);
            Assert.AreEqual(4, armazenamento.Salvamentos);

            contador.Zerar();
            using var noOp = await EnviarAsync(
                fixture.Cliente,
                segredo,
                CriarCorpoEdicao(
                    "ativa-aberta",
                    " Cliente alterado ativa-aberta ",
                    "111.444.777-35",
                    "(11) 90000-1111",
                    " descrição Unicode — 🧾 ",
                    revisao));
            Assert.AreEqual(HttpStatusCode.OK, noOp.StatusCode);
            Assert.AreEqual("no-store", noOp.Headers.CacheControl?.ToString());
            using var jsonNoOp = JsonDocument.Parse(await noOp.Content.ReadAsStringAsync());
            AssertDetalhe(
                jsonNoOp.RootElement,
                "ativa-aberta",
                "Ativo",
                "Cliente alterado ativa-aberta",
                "11144477735",
                revisao,
                paga: false);
            Assert.AreEqual(0, armazenamento.Salvamentos);

            contador.Zerar();
            using var conflitoNoOp = await EnviarAsync(
                fixture.Cliente,
                segredo,
                CriarCorpoEdicao(
                    "ativa-aberta",
                    " Cliente alterado ativa-aberta ",
                    "111.444.777-35",
                    "(11) 90000-1111",
                    " descrição Unicode — 🧾 ",
                    revisao - 1));
            Assert.AreEqual(HttpStatusCode.Conflict, conflitoNoOp.StatusCode);
            Assert.AreEqual("no-store", conflitoNoOp.Headers.CacheControl?.ToString());
            using var problemaConflito = JsonDocument.Parse(await conflitoNoOp.Content.ReadAsStringAsync());
            Assert.AreEqual("conflito-revisao", problemaConflito.RootElement.GetProperty("codigo").GetString());
            Assert.AreEqual("revisaoEsperada", problemaConflito.RootElement.GetProperty("campo").GetString());
            Assert.AreEqual(0, armazenamento.Salvamentos);
        }

        await using var reaberto = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await reaberto.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;

        Assert.AreEqual(5L, snapshot.Revisao);
        Assert.AreEqual(5, snapshot.Conjunto.Vendas.Count);
        CollectionAssert.AreEqual(iniciais.Select(venda => venda.Id).ToArray(),
            snapshot.Conjunto.Vendas.Select(venda => venda.Id).ToArray());

        var esperados = new Dictionary<string, (string Nome, string Cpf, StatusAdministrativoVenda Status)>(StringComparer.Ordinal)
        {
            ["ativa-aberta"] = ("Cliente alterado ativa-aberta", "11144477735", StatusAdministrativoVenda.Ativo),
            ["ativa-quitada"] = ("Cliente alterado ativa-quitada", "52998224725", StatusAdministrativoVenda.Ativo),
            ["inativa"] = ("Cliente alterado inativa", "52998224725", StatusAdministrativoVenda.Inativo),
            ["prejuizo"] = ("Cliente alterado prejuizo", "52998224725", StatusAdministrativoVenda.Prejuizo),
            ["cpf-destino"] = ("Cliente cpf-destino", "11144477735", StatusAdministrativoVenda.Ativo)
        };

        foreach (var venda in snapshot.Conjunto.Vendas)
        {
            var original = iniciais.Single(item => item.Id == venda.Id);
            var esperado = esperados[venda.Id];
            Assert.AreEqual(esperado.Nome, venda.Cliente.Nome, venda.Id);
            Assert.AreEqual(esperado.Cpf, venda.Cliente.Cpf, venda.Id);
            Assert.AreEqual(esperado.Status, venda.StatusAdministrativo, venda.Id);
            Assert.AreEqual(original.DataVenda, venda.DataVenda, venda.Id);
            Assert.AreEqual(original.ValorTotalBase, venda.ValorTotalBase, venda.Id);
            CollectionAssert.AreEqual(original.Parcelas.Select(parcela => parcela.Id).ToArray(),
                venda.Parcelas.Select(parcela => parcela.Id).ToArray(), venda.Id);
            CollectionAssert.AreEqual(original.Parcelas.Select(parcela => parcela.ValorBase.Centavos).ToArray(),
                venda.Parcelas.Select(parcela => parcela.ValorBase.Centavos).ToArray(), venda.Id);
            CollectionAssert.AreEqual(original.Recebimentos.Select(recebimento => recebimento.Id).ToArray(),
                venda.Recebimentos.Select(recebimento => recebimento.Id).ToArray(), venda.Id);
        }

        Assert.AreEqual("11144477735", snapshot.Conjunto.Vendas.Single(venda => venda.Id == "cpf-destino").Cliente.Cpf);
        Assert.AreEqual("Cliente cpf-destino", snapshot.Conjunto.Vendas.Single(venda => venda.Id == "cpf-destino").Cliente.Nome);
        Assert.AreEqual("ativa-quitada-recebimento",
            snapshot.Conjunto.Vendas.Single(venda => venda.Id == "ativa-quitada").Recebimentos.Single().Id);
    }

    [TestMethod]
    public async Task PutCliente_EntradasInvalidasRetornamCampoSeguroSemSalvar()
    {
        var segredo = CriarSegredo();
        await PersistirAsync([CriarVenda("alvo", StatusAdministrativoVenda.Ativo, "52998224725", paga: false)], segredo);

        var contador = new ContadorSalvamentos();
        await using var fixture = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo,
            configurar: builder => builder.ConfigureTestServices(services => DecorarArmazenamento(services, contador)));
        var armazenamento = fixture.Servicos.GetRequiredService<ArmazenamentoComContador>();
        contador.Zerar();

        var corpoDuplicado = """
            {
              "vendaId":"alvo",
              "vendaId":"outro-id",
              "nome":"Novo cliente",
              "cpf":"52998224725",
              "telefone":"11900001111",
              "descricao":null,
              "referencia":"2027-03-15",
              "revisaoEsperada":"1"
            }
            """;

        var casos = new[]
        {
            (Body: CriarCorpoEdicao("alvo", "Novo cliente", "00000000000", "11900001111", null, 1), Codigo: "cpf-invalido", Campo: "cpf"),
            (Body: corpoDuplicado, Codigo: "requisicao-invalida", Campo: "vendaId"),
            (Body: CriarCorpoEdicao("alvo", "Novo cliente", "52998224725", "11900001111", null, 1, incluirTelefone: false), Codigo: "requisicao-invalida", Campo: "telefone"),
            (Body: CriarCorpoEdicao("alvo", "Novo cliente", "52998224725", "11900001111", null, 1, revisaoEsperada: "01"), Codigo: "requisicao-invalida", Campo: "revisaoEsperada")
        };

        foreach (var caso in casos)
        {
            using var resposta = await EnviarAsync(fixture.Cliente, segredo, caso.Body);
            Assert.AreEqual(HttpStatusCode.BadRequest, resposta.StatusCode, caso.Campo);
            Assert.AreEqual("no-store", resposta.Headers.CacheControl?.ToString(), caso.Campo);
            using var problema = JsonDocument.Parse(await resposta.Content.ReadAsStringAsync());
            Assert.AreEqual(caso.Codigo, problema.RootElement.GetProperty("codigo").GetString(), caso.Campo);
            Assert.AreEqual(caso.Campo, problema.RootElement.GetProperty("campo").GetString(), caso.Campo);
        }

        Assert.AreEqual(0, armazenamento.Salvamentos);
        var snapshot = Assert.IsInstanceOfType<ResultadoArmazenamento<SnapshotVendas>.Sucesso>(
            await fixture.Servicos.GetRequiredService<IArmazenamentoVendas>()
                .CarregarAsync(_caminhoBanco, Referencia)).Valor;
        Assert.AreEqual(1L, snapshot.Revisao);
        Assert.AreEqual("Cliente alvo", snapshot.Conjunto.Vendas.Single().Cliente.Nome);
        Assert.AreEqual("52998224725", snapshot.Conjunto.Vendas.Single().Cliente.Cpf);
        Assert.AreEqual(0, armazenamento.Salvamentos);
    }

    private async Task PersistirAsync(IEnumerable<Venda> vendas, string segredo)
    {
        await using var inicial = await HostApiFixture.CriarAsync(
            caminhoBanco: _caminhoBanco,
            segredoLocal: segredo);
        var resultado = await inicial.Servicos.GetRequiredService<IArmazenamentoVendas>()
            .SalvarAsync(_caminhoBanco, vendas, revisaoEsperada: 0, Referencia);
        Assert.AreEqual(1L, Assert.IsInstanceOfType<ResultadoArmazenamento<long>.Sucesso>(resultado).Valor);
    }

    private static void AssertDetalhe(
        JsonElement detalhe,
        string id,
        string status,
        string nome,
        string cpf,
        long revisao,
        bool paga)
    {
        var resumo = detalhe.GetProperty("resumo");
        Assert.AreEqual(id, resumo.GetProperty("id").GetString());
        Assert.AreEqual(status, resumo.GetProperty("statusAdministrativo").GetString());
        Assert.AreEqual(revisao.ToString(System.Globalization.CultureInfo.InvariantCulture),
            resumo.GetProperty("revisao").GetString());
        Assert.AreEqual(Referencia.ToString("yyyy-MM-dd"), resumo.GetProperty("referencia").GetString());
        var cliente = resumo.GetProperty("cliente");
        Assert.AreEqual(nome, cliente.GetProperty("nome").GetString());
        Assert.AreEqual(cpf, cliente.GetProperty("cpf").GetString());
        Assert.AreEqual("11900001111", cliente.GetProperty("telefone").GetString());
        Assert.AreEqual("descrição Unicode — 🧾", cliente.GetProperty("descricao").GetString());
        Assert.AreEqual(10_000L, resumo.GetProperty("valorTotalBaseCentavos").GetInt64());
        Assert.AreEqual(paga ? 10_000L : 0L, resumo.GetProperty("totalRecebidoCentavos").GetInt64());
        Assert.AreEqual(1, detalhe.GetProperty("parcelas").GetArrayLength());
        Assert.AreEqual($"{id}-parcela", detalhe.GetProperty("parcelas")[0].GetProperty("id").GetString());
        Assert.AreEqual(10_000L, detalhe.GetProperty("parcelas")[0].GetProperty("valorBaseCentavos").GetInt64());
        Assert.AreEqual(paga ? 10_000L : 0L,
            detalhe.GetProperty("parcelas")[0].GetProperty("valorRecebidoCentavos").GetInt64());
        Assert.AreEqual(paga ? 1 : 0, detalhe.GetProperty("recebimentos").GetArrayLength());
        if (paga)
        {
            Assert.AreEqual($"{id}-recebimento", detalhe.GetProperty("recebimentos")[0].GetProperty("id").GetString());
            Assert.AreEqual("2027-02-01", detalhe.GetProperty("recebimentos")[0].GetProperty("data").GetString());
            Assert.AreEqual("Individual", detalhe.GetProperty("recebimentos")[0].GetProperty("origem").GetString());
        }
    }

    private static string CriarCorpoEdicao(
        string vendaId,
        string nome,
        string cpf,
        string telefone,
        string? descricao,
        long revisao,
        bool incluirExtras = false,
        string? revisaoEsperada = null,
        bool incluirTelefone = true)
    {
        var corpo = new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["vendaId"] = vendaId,
            ["nome"] = nome,
            ["cpf"] = cpf,
            ["descricao"] = descricao,
            ["referencia"] = Referencia.ToString("yyyy-MM-dd"),
            ["revisaoEsperada"] = revisaoEsperada ?? revisao.ToString(System.Globalization.CultureInfo.InvariantCulture)
        };

        if (incluirTelefone)
        {
            corpo["telefone"] = telefone;
        }

        if (incluirExtras)
        {
            corpo["valorTotalBaseCentavos"] = 1;
            corpo["valorTotalEfetivoCentavos"] = 999_999;
            corpo["statusAdministrativo"] = "Prejuizo";
            corpo["dataVenda"] = "9999-12-31";
            corpo["parcelas"] = Array.Empty<object>();
            corpo["recebimentos"] = Array.Empty<object>();
        }

        return JsonSerializer.Serialize(corpo);
    }

    private static async Task<HttpResponseMessage> EnviarAsync(HttpClient cliente, string segredo, string body)
    {
        using var requisicao = new HttpRequestMessage(HttpMethod.Put, "/api/v1/vendas/cliente")
        {
            Content = new StringContent(body, Encoding.UTF8, "application/json")
        };
        requisicao.Headers.Authorization = new AuthenticationHeaderValue("Bearer", segredo);
        return await cliente.SendAsync(requisicao);
    }

    private static string CriarSegredo() =>
        Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

    private static Venda CriarVenda(string id, StatusAdministrativoVenda status, string cpf, bool paga)
    {
        var cliente = Sucesso(DadosClienteVenda.Criar($"Cliente {id}", cpf, "11987654321", null));
        var venda = Sucesso(Venda.Cadastrar(
            id,
            cliente,
            new DateOnly(2027, 1, 15),
            Sucesso(Dinheiro.Criar(10_000)),
            1,
            [$"{id}-parcela"],
            Referencia));
        if (paga)
        {
            venda = Sucesso(venda.RegistrarPagamento(
                $"{id}-recebimento",
                $"{id}-parcela",
                Sucesso(Dinheiro.Criar(10_000)),
                new DateOnly(2027, 2, 1),
                FormaPagamento.Pix,
                Referencia));
        }

        return status == StatusAdministrativoVenda.Ativo
            ? venda
            : Sucesso(venda.AlterarStatusAdministrativo(status));
    }

    private static T Sucesso<T>(ResultadoDominio<T> resultado) =>
        resultado is ResultadoDominio<T>.Sucesso sucesso
            ? sucesso.Valor
            : throw new AssertFailedException("Esperava sucesso de domínio.");

    private static void DecorarArmazenamento(IServiceCollection servicos, ContadorSalvamentos contador)
    {
        var registroOriginal = servicos.Last(registro => registro.ServiceType == typeof(IArmazenamentoVendas));
        var fabricaOriginal = registroOriginal.ImplementationFactory
            ?? throw new InvalidOperationException("O registro SQLite esperado não é uma fábrica.");
        servicos.Remove(registroOriginal);
        servicos.AddSingleton(contador);
        servicos.AddSingleton<ArmazenamentoComContador>(provider => new ArmazenamentoComContador(
            (IArmazenamentoVendas)fabricaOriginal(provider),
            contador));
        servicos.AddSingleton<IArmazenamentoVendas>(provider =>
            provider.GetRequiredService<ArmazenamentoComContador>());
    }

    private sealed class ContadorSalvamentos
    {
        private int _salvamentos;

        public int Salvamentos => Volatile.Read(ref _salvamentos);

        public void Zerar() => Interlocked.Exchange(ref _salvamentos, 0);

        public void Registrar() => Interlocked.Increment(ref _salvamentos);
    }

    private sealed class ArmazenamentoComContador(
        IArmazenamentoVendas interno,
        ContadorSalvamentos contador) : IArmazenamentoVendas
    {
        public int Salvamentos => contador.Salvamentos;

        public Task<ResultadoOperacaoArmazenamento> InicializarAsync(
            string caminhoAbsoluto,
            CancellationToken cancellationToken = default) =>
            interno.InicializarAsync(caminhoAbsoluto, cancellationToken);

        public Task<ResultadoArmazenamento<SnapshotVendas>> CarregarAsync(
            string caminhoAbsoluto,
            DateOnly referencia,
            CancellationToken cancellationToken = default) =>
            interno.CarregarAsync(caminhoAbsoluto, referencia, cancellationToken);

        public Task<ResultadoArmazenamento<long>> SalvarAsync(
            string caminhoAbsoluto,
            IEnumerable<Venda> candidatoCompleto,
            long revisaoEsperada,
            DateOnly referencia,
            CancellationToken cancellationToken = default)
        {
            contador.Registrar();
            return interno.SalvarAsync(
                caminhoAbsoluto,
                candidatoCompleto,
                revisaoEsperada,
                referencia,
                cancellationToken);
        }
    }
}
