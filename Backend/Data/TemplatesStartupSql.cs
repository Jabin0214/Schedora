namespace InspectionApi.Data
{
    public static class TemplatesStartupSql
    {
        // Idempotent: safe to run on every app boot.
        // Creates 5 tables and seeds default rows. The composite unique
        // indexes guarantee that re-running INSERTs does nothing.
        public const string Sql = @"
            CREATE TABLE IF NOT EXISTS ""TemplateInspectionTypes"" (
                ""Id""           SERIAL                PRIMARY KEY,
                ""Name""         character varying(50) NOT NULL,
                ""DisplayOrder"" integer               NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ""CleanlinessAreas"" (
                ""Id""           SERIAL                  PRIMARY KEY,
                ""Name""         character varying(50)   NOT NULL,
                ""DirtyText""    character varying(1000) NOT NULL DEFAULT '',
                ""DisplayOrder"" integer                 NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ""DamageItems"" (
                ""Id""           SERIAL                  PRIMARY KEY,
                ""Name""         character varying(50)   NOT NULL,
                ""Text""         character varying(1000) NOT NULL DEFAULT '',
                ""DisplayOrder"" integer                 NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS ""GeneralTemplates"" (
                ""Id""                   SERIAL                  PRIMARY KEY,
                ""InspectionTypeId""     integer                 NOT NULL
                    REFERENCES ""TemplateInspectionTypes""(""Id"") ON DELETE CASCADE,
                ""HasCleanlinessIssue""  boolean                 NOT NULL,
                ""HasDamageIssue""       boolean                 NOT NULL,
                ""Text""                 character varying(2000) NOT NULL DEFAULT ''
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_GeneralTemplates_Combo""
                ON ""GeneralTemplates""(""InspectionTypeId"", ""HasCleanlinessIssue"", ""HasDamageIssue"");

            CREATE TABLE IF NOT EXISTS ""AudienceTemplates"" (
                ""Id""               SERIAL                  PRIMARY KEY,
                ""InspectionTypeId"" integer                 NOT NULL
                    REFERENCES ""TemplateInspectionTypes""(""Id"") ON DELETE CASCADE,
                ""Audience""         integer                 NOT NULL,
                ""NoIssueText""      character varying(2000) NOT NULL DEFAULT '',
                ""IssuePrefix""      character varying(1000) NOT NULL DEFAULT '',
                ""IssueSuffix""      character varying(1000) NOT NULL DEFAULT ''
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_AudienceTemplates_Combo""
                ON ""AudienceTemplates""(""InspectionTypeId"", ""Audience"");

            -- Seed inspection types (idempotent via ON CONFLICT on Name)
            -- Use a temp INSERT that only fires if the table is empty.
            INSERT INTO ""TemplateInspectionTypes"" (""Name"", ""DisplayOrder"")
            SELECT v.name, v.ord FROM (VALUES
                ('搬入', 0),
                ('搬出', 1),
                ('例行检查', 2)
            ) AS v(name, ord)
            WHERE NOT EXISTS (SELECT 1 FROM ""TemplateInspectionTypes"");

            -- Seed cleanliness areas (only when table is empty)
            INSERT INTO ""CleanlinessAreas"" (""Name"", ""DirtyText"", ""DisplayOrder"")
            SELECT v.name, '', v.ord FROM (VALUES
                ('卫生间', 0),
                ('厨房',   1),
                ('卧室',   2),
                ('客厅',   3),
                ('阳台',   4)
            ) AS v(name, ord)
            WHERE NOT EXISTS (SELECT 1 FROM ""CleanlinessAreas"");

            -- Seed General + Audience rows for every existing inspection type
            -- that doesn't already have them. Idempotent.
            DO $$
            DECLARE
                t record;
                cl boolean;
                dm boolean;
                aud integer;
            BEGIN
                FOR t IN SELECT ""Id"" FROM ""TemplateInspectionTypes"" LOOP
                    FOR cl IN SELECT unnest(ARRAY[false, true]) LOOP
                        FOR dm IN SELECT unnest(ARRAY[false, true]) LOOP
                            INSERT INTO ""GeneralTemplates""
                                (""InspectionTypeId"", ""HasCleanlinessIssue"", ""HasDamageIssue"", ""Text"")
                            SELECT t.""Id"", cl, dm, ''
                            WHERE NOT EXISTS (
                                SELECT 1 FROM ""GeneralTemplates""
                                WHERE ""InspectionTypeId"" = t.""Id""
                                  AND ""HasCleanlinessIssue"" = cl
                                  AND ""HasDamageIssue"" = dm
                            );
                        END LOOP;
                    END LOOP;
                    FOR aud IN SELECT unnest(ARRAY[0, 1]) LOOP
                        INSERT INTO ""AudienceTemplates""
                            (""InspectionTypeId"", ""Audience"", ""NoIssueText"", ""IssuePrefix"", ""IssueSuffix"")
                        SELECT t.""Id"", aud, '', '', ''
                        WHERE NOT EXISTS (
                            SELECT 1 FROM ""AudienceTemplates""
                            WHERE ""InspectionTypeId"" = t.""Id""
                              AND ""Audience"" = aud
                        );
                    END LOOP;
                END LOOP;
            END $$;
        ";
    }
}
