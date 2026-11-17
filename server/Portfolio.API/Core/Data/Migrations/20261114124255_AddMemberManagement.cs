using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Portfolio.API.Core.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "Users",
                type: "boolean",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "LastLoginIp",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LastLoginMethod",
                table: "Users",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_LastLoginAt",
                table: "Users",
                column: "LastLoginAt");

            // Existing accounts keep working: every row got IsActive = true above. Password is the only
            // sign-in method that has ever existed, so backfill it for anyone who has signed in.
            migrationBuilder.Sql(
                "UPDATE \"Users\" SET \"LastLoginMethod\" = 'Password' WHERE \"LastLoginAt\" IS NOT NULL;");

            // The owner account becomes the SuperAdmin (it already holds the SuperAdmin Identity role).
            migrationBuilder.Sql(
                "UPDATE \"Users\" u SET \"Role\" = 'SuperAdmin' " +
                "FROM \"UserRoles\" ur JOIN \"Roles\" r ON r.\"Id\" = ur.\"RoleId\" " +
                "WHERE ur.\"UserId\" = u.\"Id\" AND r.\"Name\" = 'SuperAdmin';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_LastLoginAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastLoginIp",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "LastLoginMethod",
                table: "Users");
        }
    }
}
