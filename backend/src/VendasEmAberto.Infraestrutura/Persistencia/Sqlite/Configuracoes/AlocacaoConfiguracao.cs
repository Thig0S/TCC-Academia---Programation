using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Configuracoes;

internal sealed class AlocacaoConfiguracao : IEntityTypeConfiguration<AlocacaoLinha>
{
    public void Configure(EntityTypeBuilder<AlocacaoLinha> builder)
    {
        builder.ToTable("Alocacoes", tabela =>
        {
            tabela.HasCheckConstraint("CK_Alocacoes_Ordem", "\"Ordem\" >= 0");
            tabela.HasCheckConstraint(
                "CK_Alocacoes_ValorCentavos",
                "\"ValorCentavos\" BETWEEN 1 AND 9007199254740991");
        });

        builder.HasKey(alocacao => new { alocacao.RecebimentoId, alocacao.Ordem })
            .HasName("PK_Alocacoes");

        builder.Property(alocacao => alocacao.RecebimentoId)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();
        builder.Property(alocacao => alocacao.Ordem).HasColumnType("INTEGER");
        builder.Property(alocacao => alocacao.VendaId)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();
        builder.Property(alocacao => alocacao.ParcelaId)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();
        builder.Property(alocacao => alocacao.ValorCentavos).HasColumnType("INTEGER");

        builder.HasOne<RecebimentoLinha>()
            .WithMany()
            .HasPrincipalKey(recebimento => new { recebimento.VendaId, recebimento.Id })
            .HasForeignKey(alocacao => new { alocacao.VendaId, alocacao.RecebimentoId })
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Alocacoes_Recebimentos_VendaId_RecebimentoId");
        builder.HasOne<ParcelaLinha>()
            .WithMany()
            .HasPrincipalKey(parcela => new { parcela.VendaId, parcela.Id })
            .HasForeignKey(alocacao => new { alocacao.VendaId, alocacao.ParcelaId })
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Alocacoes_Parcelas_VendaId_ParcelaId");
    }
}
