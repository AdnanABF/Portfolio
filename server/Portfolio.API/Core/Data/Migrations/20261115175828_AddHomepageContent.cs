using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Portfolio.API.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHomepageContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVisible",
                table: "Skills",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsVisible",
                table: "Experiences",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.CreateTable(
                name: "SiteContents",
                columns: table => new
                {
                    Key = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Json = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedBy = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteContents", x => x.Key);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SiteContents");

            migrationBuilder.DropColumn(
                name: "IsVisible",
                table: "Skills");

            migrationBuilder.DropColumn(
                name: "IsVisible",
                table: "Experiences");
        }
    }
}
