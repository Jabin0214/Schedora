using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace InspectionApi.Migrations
{
    /// <inheritdoc />
    public partial class RemoveStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_InspectionTasks_Status",
                table: "InspectionTasks");

            migrationBuilder.DropColumn(
                name: "CompletedAt",
                table: "InspectionTasks");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "InspectionTasks");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "CompletedAt",
                table: "InspectionTasks",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "InspectionTasks",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_InspectionTasks_Status",
                table: "InspectionTasks",
                column: "Status");
        }
    }
}
