using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Configuracoes;

internal sealed class IdentificadorConfiguracao : IEntityTypeConfiguration<IdentificadorLinha>
{
    public void Configure(EntityTypeBuilder<IdentificadorLinha> builder)
    {
        builder.ToTable("Identificadores", tabela =>
            tabela.HasCheckConstraint("CK_Identificadores_Tipo", "\"Tipo\" IN (0, 1, 2)"));

        builder.HasKey(identificador => identificador.Id).HasName("PK_Identificadores");
        builder.HasAlternateKey(identificador => new { identificador.Id, identificador.Tipo })
            .HasName("AK_Identificadores_Id_Tipo");

        builder.Property(identificador => identificador.Id)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();

        builder.Property(identificador => identificador.Tipo)
            .HasConversion<int>()
            .HasColumnType("INTEGER")
            .IsRequired();
    }
}
