using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VendasEmAberto.Infraestrutura.Persistencia.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "EstadoArmazenamento",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false),
                    Revisao = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EstadoArmazenamento", x => x.Id);
                    table.CheckConstraint("CK_EstadoArmazenamento_Id", "\"Id\" = 1");
                    table.CheckConstraint("CK_EstadoArmazenamento_Revisao", "\"Revisao\" >= 0");
                });

            migrationBuilder.CreateTable(
                name: "Identificadores",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    Tipo = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Identificadores", x => x.Id);
                    table.UniqueConstraint("AK_Identificadores_Id_Tipo", x => new { x.Id, x.Tipo });
                    table.CheckConstraint("CK_Identificadores_Tipo", "\"Tipo\" IN (0, 1, 2)");
                });

            migrationBuilder.CreateTable(
                name: "Vendas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    Ordem = table.Column<int>(type: "INTEGER", nullable: false),
                    StatusAdministrativo = table.Column<int>(type: "INTEGER", nullable: false),
                    ClienteNome = table.Column<string>(type: "TEXT", nullable: false),
                    ClienteCpf = table.Column<string>(type: "TEXT", nullable: false),
                    ClienteTelefone = table.Column<string>(type: "TEXT", nullable: false),
                    ClienteDescricao = table.Column<string>(type: "TEXT", nullable: true),
                    DataVenda = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    ValorTotalBaseCentavos = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Vendas", x => x.Id);
                    table.CheckConstraint("CK_Vendas_Ordem", "\"Ordem\" >= 0");
                    table.CheckConstraint("CK_Vendas_StatusAdministrativo", "\"StatusAdministrativo\" IN (0, 1, 2)");
                    table.CheckConstraint("CK_Vendas_ValorTotalBaseCentavos", "\"ValorTotalBaseCentavos\" BETWEEN 1 AND 9007199254740991");
                    table.ForeignKey(
                        name: "FK_Vendas_Identificadores_Id",
                        column: x => x.Id,
                        principalTable: "Identificadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Parcelas",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    VendaId = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    Numero = table.Column<int>(type: "INTEGER", nullable: false),
                    ValorBaseCentavos = table.Column<long>(type: "INTEGER", nullable: false),
                    Vencimento = table.Column<DateOnly>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Parcelas", x => x.Id);
                    table.UniqueConstraint("AK_Parcelas_VendaId_Id", x => new { x.VendaId, x.Id });
                    table.CheckConstraint("CK_Parcelas_Numero", "\"Numero\" > 0");
                    table.CheckConstraint("CK_Parcelas_ValorBaseCentavos", "\"ValorBaseCentavos\" BETWEEN 1 AND 9007199254740991");
                    table.ForeignKey(
                        name: "FK_Parcelas_Identificadores_Id",
                        column: x => x.Id,
                        principalTable: "Identificadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Parcelas_Vendas_VendaId",
                        column: x => x.VendaId,
                        principalTable: "Vendas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Recebimentos",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    VendaId = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    Ordem = table.Column<int>(type: "INTEGER", nullable: false),
                    Data = table.Column<DateOnly>(type: "TEXT", nullable: false),
                    Forma = table.Column<int>(type: "INTEGER", nullable: false),
                    Origem = table.Column<int>(type: "INTEGER", nullable: false),
                    ValorCentavos = table.Column<long>(type: "INTEGER", nullable: false),
                    AcrescimoCentavos = table.Column<long>(type: "INTEGER", nullable: false),
                    Observacao = table.Column<string>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Recebimentos", x => x.Id);
                    table.UniqueConstraint("AK_Recebimentos_VendaId_Id", x => new { x.VendaId, x.Id });
                    table.CheckConstraint("CK_Recebimentos_AcrescimoCentavos", "\"AcrescimoCentavos\" BETWEEN 0 AND 9007199254740991");
                    table.CheckConstraint("CK_Recebimentos_Forma", "\"Forma\" IN (0, 1, 2, 3)");
                    table.CheckConstraint("CK_Recebimentos_Ordem", "\"Ordem\" >= 0");
                    table.CheckConstraint("CK_Recebimentos_Origem", "\"Origem\" IN (0, 1, 2)");
                    table.CheckConstraint("CK_Recebimentos_ValorCentavos", "\"ValorCentavos\" BETWEEN 1 AND 9007199254740991");
                    table.ForeignKey(
                        name: "FK_Recebimentos_Identificadores_Id",
                        column: x => x.Id,
                        principalTable: "Identificadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Recebimentos_Vendas_VendaId",
                        column: x => x.VendaId,
                        principalTable: "Vendas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Alocacoes",
                columns: table => new
                {
                    RecebimentoId = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    Ordem = table.Column<int>(type: "INTEGER", nullable: false),
                    VendaId = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    ParcelaId = table.Column<string>(type: "TEXT", nullable: false, collation: "BINARY"),
                    ValorCentavos = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alocacoes", x => new { x.RecebimentoId, x.Ordem });
                    table.CheckConstraint("CK_Alocacoes_Ordem", "\"Ordem\" >= 0");
                    table.CheckConstraint("CK_Alocacoes_ValorCentavos", "\"ValorCentavos\" BETWEEN 1 AND 9007199254740991");
                    table.ForeignKey(
                        name: "FK_Alocacoes_Parcelas_VendaId_ParcelaId",
                        columns: x => new { x.VendaId, x.ParcelaId },
                        principalTable: "Parcelas",
                        principalColumns: new[] { "VendaId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Alocacoes_Recebimentos_VendaId_RecebimentoId",
                        columns: x => new { x.VendaId, x.RecebimentoId },
                        principalTable: "Recebimentos",
                        principalColumns: new[] { "VendaId", "Id" },
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Alocacoes_VendaId_ParcelaId",
                table: "Alocacoes",
                columns: new[] { "VendaId", "ParcelaId" });

            migrationBuilder.CreateIndex(
                name: "IX_Alocacoes_VendaId_RecebimentoId",
                table: "Alocacoes",
                columns: new[] { "VendaId", "RecebimentoId" });

            migrationBuilder.CreateIndex(
                name: "UX_Parcelas_VendaId_Numero",
                table: "Parcelas",
                columns: new[] { "VendaId", "Numero" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Recebimentos_VendaId_Ordem",
                table: "Recebimentos",
                columns: new[] { "VendaId", "Ordem" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Vendas_Ordem",
                table: "Vendas",
                column: "Ordem",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Alocacoes");

            migrationBuilder.DropTable(
                name: "EstadoArmazenamento");

            migrationBuilder.DropTable(
                name: "Parcelas");

            migrationBuilder.DropTable(
                name: "Recebimentos");

            migrationBuilder.DropTable(
                name: "Vendas");

            migrationBuilder.DropTable(
                name: "Identificadores");
        }
    }
}
