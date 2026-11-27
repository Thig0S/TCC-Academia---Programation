using System.Security.Cryptography;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace VendasEmAberto.IntegrationTests;

internal sealed class HostApiFixture : IAsyncDisposable
{
    private static readonly SemaphoreSlim ExclusaoAmbiente = new(1, 1);

    private readonly string _diretorioTemporario;
    private readonly string? _caminhoAnterior;
    private readonly string? _segredoAnterior;
    private readonly WebApplicationFactory<Program> _factory;

    private HostApiFixture(
        string diretorioTemporario,
        string caminhoBanco,
        string? caminhoAnterior,
        string? segredoAnterior,
        WebApplicationFactory<Program> factory,
        HttpClient cliente)
    {
        _diretorioTemporario = diretorioTemporario;
        CaminhoBanco = caminhoBanco;
        _caminhoAnterior = caminhoAnterior;
        _segredoAnterior = segredoAnterior;
        _factory = factory;
        Cliente = cliente;
    }

    public HttpClient Cliente { get; }

    public string CaminhoBanco { get; }

    public IServiceProvider Servicos => _factory.Services;

    public static async Task<HostApiFixture> CriarAsync(
        string? ambiente = null,
        Action<IWebHostBuilder>? configurar = null,
        string? caminhoBanco = null,
        string? segredoLocal = null,
        bool incluirCaminhoBanco = true,
        bool incluirSegredoLocal = true)
    {
        await ExclusaoAmbiente.WaitAsync();

        var diretorioTemporario = Path.Combine(
            Path.GetTempPath(),
            $"vendas-api-host-{Guid.NewGuid():N}");
        var caminhoAnterior = Environment.GetEnvironmentVariable("Backend__CaminhoBanco");
        var segredoAnterior = Environment.GetEnvironmentVariable("Backend__SegredoLocal");
        WebApplicationFactory<Program>? factory = null;
        HttpClient? cliente = null;

        try
        {
            Directory.CreateDirectory(diretorioTemporario);
            caminhoBanco ??= Path.Combine(diretorioTemporario, "vendas.sqlite");

            Environment.SetEnvironmentVariable(
                "Backend__CaminhoBanco",
                incluirCaminhoBanco ? caminhoBanco : null);
            Environment.SetEnvironmentVariable(
                "Backend__SegredoLocal",
                incluirSegredoLocal
                    ? segredoLocal ?? Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
                    : null);

            factory = new WebApplicationFactory<Program>()
                .WithWebHostBuilder(builder =>
                {
                    if (ambiente is not null)
                    {
                        builder.UseEnvironment(ambiente);
                    }

                    configurar?.Invoke(builder);
                });
            cliente = factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false,
                HandleCookies = false
            });

            return new HostApiFixture(
                diretorioTemporario,
                caminhoBanco,
                caminhoAnterior,
                segredoAnterior,
                factory,
                cliente);
        }
        catch
        {
            try
            {
                cliente?.Dispose();
                factory?.Dispose();
                if (Directory.Exists(diretorioTemporario))
                {
                    Directory.Delete(diretorioTemporario, recursive: true);
                }
            }
            finally
            {
                RestaurarAmbiente(caminhoAnterior, segredoAnterior);
            }

            throw;
        }
    }

    public ValueTask DisposeAsync()
    {
        try
        {
            try
            {
                Cliente.Dispose();
            }
            finally
            {
                _factory.Dispose();
                if (Directory.Exists(_diretorioTemporario))
                {
                    Directory.Delete(_diretorioTemporario, recursive: true);
                }
            }
        }
        finally
        {
            RestaurarAmbiente(_caminhoAnterior, _segredoAnterior);
        }

        return ValueTask.CompletedTask;
    }

    private static void RestaurarAmbiente(string? caminho, string? segredo)
    {
        try
        {
            Environment.SetEnvironmentVariable("Backend__CaminhoBanco", caminho);
            Environment.SetEnvironmentVariable("Backend__SegredoLocal", segredo);
        }
        finally
        {
            ExclusaoAmbiente.Release();
        }
    }
}
