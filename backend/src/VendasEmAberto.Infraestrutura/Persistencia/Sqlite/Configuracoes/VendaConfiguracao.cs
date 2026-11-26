using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using VendasEmAberto.Dominio.Vendas;
using VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Entidades;

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Configuracoes;

internal sealed class VendaConfiguracao : IEntityTypeConfiguration<VendaLinha>
{
    private const int StatusAtivo = (int)StatusAdministrativoVenda.Ativo;
    private const int StatusInativo = (int)StatusAdministrativoVenda.Inativo;
    private const int StatusPrejuizo = (int)StatusAdministrativoVenda.Prejuizo;

    public void Configure(EntityTypeBuilder<VendaLinha> builder)
    {
        builder.ToTable("Vendas", tabela =>
        {
            tabela.HasCheckConstraint("CK_Vendas_Ordem", "\"Ordem\" >= 0");
            tabela.HasCheckConstraint(
                "CK_Vendas_StatusAdministrativo",
                $"\"StatusAdministrativo\" IN ({StatusAtivo}, {StatusInativo}, {StatusPrejuizo})");
            tabela.HasCheckConstraint(
                "CK_Vendas_ValorTotalBaseCentavos",
                "\"ValorTotalBaseCentavos\" BETWEEN 1 AND 9007199254740991");
        });

        builder.HasKey(venda => venda.Id).HasName("PK_Vendas");
        builder.HasIndex(venda => venda.Ordem)
            .IsUnique()
            .HasDatabaseName("UX_Vendas_Ordem");

        builder.Property(venda => venda.Id)
            .HasColumnType("TEXT")
            .UseCollation("BINARY")
            .IsRequired();
        builder.Property(venda => venda.Ordem).HasColumnType("INTEGER");
        builder.Property(venda => venda.StatusAdministrativo)
            .HasConversion<int>()
            .HasColumnType("INTEGER");
        builder.Property(venda => venda.ClienteNome).HasColumnType("TEXT").IsRequired();
        builder.Property(venda => venda.ClienteCpf).HasColumnType("TEXT").IsRequired();
        builder.Property(venda => venda.ClienteTelefone).HasColumnType("TEXT").IsRequired();
        builder.Property(venda => venda.ClienteDescricao).HasColumnType("TEXT");
        builder.Property(venda => venda.DataVenda).HasColumnType("TEXT");
        builder.Property(venda => venda.ValorTotalBaseCentavos).HasColumnType("INTEGER");

        builder.HasOne<IdentificadorLinha>()
            .WithMany()
            .HasForeignKey(venda => venda.Id)
            .OnDelete(DeleteBehavior.Restrict)
            .HasConstraintName("FK_Vendas_Identificadores_Id");
    }
}
