using System.Security.Cryptography;

namespace VendasEmAberto.Api.Seguranca;

internal sealed class CredencialBearerLocal(byte[] segredo) : IDisposable
{
    private readonly byte[] _segredo = segredo is { Length: 32 }
        ? segredo
        : throw new ArgumentException("A credencial local deve conter 32 bytes.", nameof(segredo));

    public bool Corresponde(ReadOnlySpan<byte> candidata) =>
        candidata.Length == _segredo.Length
        && CryptographicOperations.FixedTimeEquals(_segredo, candidata);

    public void Dispose() => CryptographicOperations.ZeroMemory(_segredo);
}
