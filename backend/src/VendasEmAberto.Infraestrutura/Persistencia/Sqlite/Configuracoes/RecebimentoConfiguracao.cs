using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VendasEmAberto.Dominio.Recebimentos;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Configuracoes;

internal sealed class RecebimentoConfiguracao : IEntityTypeConfiguration<RecebimentoLinha>
{
    private const int FormaDinheiro = (int)FormaPagamento.Dinheiro;
    private const int FormaPix = (int)FormaPagamento.Pix;
    private const int FormaCartaoDebito = (int)FormaPagamento.CartaoDebito;
    private const int FormaCartaoCredito = (int)FormaPagamento.CartaoCredito;
    private const int OrigemEntrada = (int)OrigemRecebimento.Entrada;
    private const int OrigemIndividual = (int)OrigemRecebimento.Individual;
    private const int OrigemHistoricoLote = (int)OrigemRecebimento.HistoricoLote;

    public void Configure(EntityTypeBuilder<RecebimentoLinha> builder)
    {
        builder.ToTable("Recebimentos", tabela =>
        {
            tabela.HasCheckConstraint("CK_Recebimentos_Ordem", "\"Ordem\" >= 0");
            tabela.HasCheckConstraint(
                "CK_Recebimentos_Forma",
                $"\"Forma\" IN ({FormaDinheiro}, {FormaPix}, {FormaCartaoDebito}, {FormaCartaoCredito})");
            tabela.HasCheckConstraint(
                "CK_Recebimentos_Origem",
                $"\"Origem\" IN ({OrigemEntrada}, {OrigemIndividual}, {OrigemHistoricoLote})");
            tabela.HasCheckConstraint(
                "CK_Recebimentos_ValorCentavos",
                "\"ValorCentavos\" BETWEEN 1 AND 9007199254740991");
            tabela.HasCheckConstraint(
                "CK_Recebimentos_AcrescimoCentavos",
                "\"AcrescimoCentavos\" BETWEEN 0 AND 9007199254740991");
        });

        builder.HasKey(recebimento => recebimento.Id).HasName("PK_Recebimentos");
        builder.HasAlternateKey(recebimento => new { recebimento.VendaId, recebimento.Id })
            .HasName("AK_Recebimentos_VendaId_Id");
        builder.HasIndex(recebimento => new { recebimento.VendaId, recebimento.Ordem })
            .IsUnique()
            .HasDatabaseName("UX_Recebimentos_VendaId_Ordem");

        builder.Property(recebimento => recebimento.Id)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();
        builder.Property(recebimento => recebimento.VendaId)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();
        builder.Property(recebimento => recebimento.Ordem).HasColumnType("INTEGER");
        builder.Property(recebimento => recebimento.Data).HasColumnType("TEXT");
        builder.Property(recebimento => recebimento.Forma)
            .HasConversion<int>()
            .HasColumnType("INTEGER");
        builder.Property(recebimento => recebimento.Origem)
            .HasConversion<int>()
            .HasColumnType("INTEGER");
        builder.Property(recebimento => recebimento.ValorCentavos).HasColumnType("INTEGER");
        builder.Property(recebimento => recebimento.AcrescimoCentavos).HasColumnType("INTEGER");
        builder.Property(recebimento => recebimento.Observacao).HasColumnType("TEXT");

        builder.HasOne<IdentificadorLinha>()
            .WithMany()
            .HasForeignKey(recebimento => recebimento.Id)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Recebimentos_Identificadores_Id");
        builder.HasOne<VendaLinha>()
            .WithMany()
            .HasForeignKey(recebimento => recebimento.VendaId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Recebimentos_Vendas_VendaId");
    }
}
