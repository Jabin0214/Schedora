namespace InspectionApi.Data
{
    public static class TemplatesStartupSql
    {
        // Idempotent: safe to run on every app boot.
        // Creates the template tables and removes legacy detail tables.
        // The unique index guarantees that re-running INSERTs does nothing.
        public const string Sql = @"
            DROP TABLE IF EXISTS ""AudienceTemplates"";
            DROP TABLE IF EXISTS ""CleanlinessAreas"";
            DROP TABLE IF EXISTS ""DamageItems"";

            CREATE TABLE IF NOT EXISTS ""TemplateInspectionTypes"" (
                ""Id""           SERIAL                PRIMARY KEY,
                ""Name""         character varying(50) NOT NULL,
                ""DisplayOrder"" integer               NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ""GeneralTemplates"" (
                ""Id""                   SERIAL                  PRIMARY KEY,
                ""InspectionTypeId""     integer                 NOT NULL
                    REFERENCES ""TemplateInspectionTypes""(""Id"") ON DELETE CASCADE,
                ""Text""                 character varying(2000) NOT NULL DEFAULT ''
            );

            -- Seed inspection types (idempotent via ON CONFLICT on Name)
            -- Use a temp INSERT that only fires if the table is empty.
            INSERT INTO ""TemplateInspectionTypes"" (""Name"", ""DisplayOrder"")
            SELECT v.name, v.ord FROM (VALUES
                ('搬入', 0),
                ('搬出', 1),
                ('例行检查', 2)
            ) AS v(name, ord)
            WHERE NOT EXISTS (SELECT 1 FROM ""TemplateInspectionTypes"");

            -- Collapse legacy four-state GeneralTemplates to one row per inspection type.
            DROP INDEX IF EXISTS ""IX_GeneralTemplates_Combo"";
            UPDATE ""GeneralTemplates"" keeper
            SET ""Text"" = COALESCE(first_non_empty.""Text"", keeper.""Text"")
            FROM (
                SELECT DISTINCT ON (""InspectionTypeId"")
                    ""InspectionTypeId"",
                    ""Id""
                FROM ""GeneralTemplates""
                ORDER BY ""InspectionTypeId"", ""Id""
            ) first_rows
            LEFT JOIN LATERAL (
                SELECT src.""Text""
                FROM ""GeneralTemplates"" src
                WHERE src.""InspectionTypeId"" = first_rows.""InspectionTypeId""
                  AND NULLIF(trim(src.""Text""), '') IS NOT NULL
                ORDER BY src.""Id""
                LIMIT 1
            ) first_non_empty ON true
            WHERE keeper.""Id"" = first_rows.""Id"";

            DELETE FROM ""GeneralTemplates"" g
            USING ""GeneralTemplates"" older
            WHERE g.""InspectionTypeId"" = older.""InspectionTypeId""
              AND g.""Id"" > older.""Id"";
            ALTER TABLE ""GeneralTemplates"" DROP COLUMN IF EXISTS ""HasCleanlinessIssue"";
            ALTER TABLE ""GeneralTemplates"" DROP COLUMN IF EXISTS ""HasDamageIssue"";
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_GeneralTemplates_InspectionTypeId""
                ON ""GeneralTemplates""(""InspectionTypeId"");

            -- Seed one General row for every existing inspection type.
            DO $$
            DECLARE
                t record;
            BEGIN
                FOR t IN SELECT ""Id"" FROM ""TemplateInspectionTypes"" LOOP
                    INSERT INTO ""GeneralTemplates"" (""InspectionTypeId"", ""Text"")
                    SELECT t.""Id"", ''
                    WHERE NOT EXISTS (
                        SELECT 1 FROM ""GeneralTemplates""
                        WHERE ""InspectionTypeId"" = t.""Id""
                    );
                END LOOP;
            END $$;
        ";
    }
}
