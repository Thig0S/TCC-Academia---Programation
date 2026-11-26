using VendasEmAberto.Aplicacao.Comum.Identificadores;

namespace VendasEmAberto.Infraestrutura.Composicao;

internal sealed class GeradorIdentificadoresGuid : IGeradorIdentificadores
{
    public string Gerar() => Guid.NewGuid().ToString("N");
}
