using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Configuracoes;

internal sealed class EstadoArmazenamentoConfiguracao : IEntityTypeConfiguration<EstadoArmazenamentoLinha>
{
    public void Configure(EntityTypeBuilder<EstadoArmazenamentoLinha> builder)
    {
        builder.ToTable("EstadoArmazenamento", tabela =>
        {
            tabela.HasCheckConstraint("CK_EstadoArmazenamento_Id", "\"Id\" = 1");
            tabela.HasCheckConstraint("CK_EstadoArmazenamento_Revisao", "\"Revisao\" >= 0");
        });

        builder.HasKey(estado => estado.Id).HasName("PK_EstadoArmazenamento");

        builder.Property(estado => estado.Id)
            .HasColumnType("INTEGER")
            .ValueGeneratedNever();

        builder.Property(estado => estado.Revisao)
            .HasColumnType("INTEGER")
            .IsRequired();
    }
}
