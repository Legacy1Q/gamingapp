using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GamingApp.api.Migrations
{
    /// <inheritdoc />
    public partial class AddGameFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "DeveloperName",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsPublished",
                table: "Games",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "PlayUrl",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ThumbnailUrl",
                table: "Games",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "DeveloperName",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "IsPublished",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "PlayUrl",
                table: "Games");

            migrationBuilder.DropColumn(
                name: "ThumbnailUrl",
                table: "Games");
        }
    }
}
