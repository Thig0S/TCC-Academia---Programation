using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Configuracoes;

internal sealed class ParcelaConfiguracao : IEntityTypeConfiguration<ParcelaLinha>
{
    public void Configure(EntityTypeBuilder<ParcelaLinha> builder)
    {
        builder.ToTable("Parcelas", tabela =>
        {
            tabela.HasCheckConstraint("CK_Parcelas_Numero", "\"Numero\" > 0");
            tabela.HasCheckConstraint(
                "CK_Parcelas_ValorBaseCentavos",
                "\"ValorBaseCentavos\" BETWEEN 1 AND 9007199254740991");
        });

        builder.HasKey(parcela => parcela.Id).HasName("PK_Parcelas");
        builder.HasAlternateKey(parcela => new { parcela.VendaId, parcela.Id })
            .HasName("AK_Parcelas_VendaId_Id");
        builder.HasIndex(parcela => new { parcela.VendaId, parcela.Numero })
            .IsUnique()
            .HasDatabaseName("UX_Parcelas_VendaId_Numero");

        builder.Property(parcela => parcela.Id)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();
        builder.Property(parcela => parcela.VendaId)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();
        builder.Property(parcela => parcela.Numero).HasColumnType("INTEGER");
        builder.Property(parcela => parcela.ValorBaseCentavos).HasColumnType("INTEGER");
        builder.Property(parcela => parcela.Vencimento).HasColumnType("TEXT");

        builder.HasOne<IdentificadorLinha>()
            .WithMany()
            .HasForeignKey(parcela => parcela.Id)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Parcelas_Identificadores_Id");
        builder.HasOne<VendaLinha>()
            .WithMany()
            .HasForeignKey(parcela => parcela.VendaId)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Parcelas_Vendas_VendaId");
    }
}
