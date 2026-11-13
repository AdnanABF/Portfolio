using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Portfolio.API.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRepoRequestsAndPrivateRepoFlag : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsRepoPrivate",
                table: "Projects",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "ProjectId",
                table: "ContactInquiries",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "ContactInquiries",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "contact"); // every message saved before this migration is a normal contact message

            // Keep today's behaviour for existing projects: the lock was shown when a GitHub URL
            // existed without a live URL, so mark exactly those as private repositories.
            migrationBuilder.Sql(
                "UPDATE \"Projects\" SET \"IsRepoPrivate\" = TRUE " +
                "WHERE COALESCE(\"GithubUrl\", '') <> '' AND COALESCE(\"LiveUrl\", '') = '';");

            migrationBuilder.CreateIndex(
                name: "IX_ContactInquiries_ProjectId",
                table: "ContactInquiries",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_ContactInquiries_Type",
                table: "ContactInquiries",
                column: "Type");

            migrationBuilder.AddForeignKey(
                name: "FK_ContactInquiries_Projects_ProjectId",
                table: "ContactInquiries",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ContactInquiries_Projects_ProjectId",
                table: "ContactInquiries");

            migrationBuilder.DropIndex(
                name: "IX_ContactInquiries_ProjectId",
                table: "ContactInquiries");

            migrationBuilder.DropIndex(
                name: "IX_ContactInquiries_Type",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "IsRepoPrivate",
                table: "Projects");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "ContactInquiries");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "ContactInquiries");
        }
    }
}
