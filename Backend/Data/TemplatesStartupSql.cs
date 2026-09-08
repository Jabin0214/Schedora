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

            -- Default no-issue templates for the quick copy buttons.
            -- Fill empty rows and upgrade known old defaults; preserve user-edited wording.
            UPDATE ""GeneralTemplates"" g
            SET ""Text"" = defaults.""Text""
            FROM ""TemplateInspectionTypes"" t
            JOIN (VALUES
                ('搬入', 'Overall Presentation:
The property was presented in a clean, tidy, and professional condition and was ready for tenant possession.

Tenant Care:
This was a commencement inspection. The property was vacant at the time of inspection, and no tenant-care concern was applicable.

Move-in Checks & Observations:
The following items were checked with no issue noted:
- Fixed heating source
- Kitchen rangehood and extraction system
- Bathroom extractor fan(s)
- Doors, windows, and security locks

No other specific maintenance concern was noted from the inspection.

The following risk and compliance items were checked with no issue noted:
- Smoke alarms
- Visible moisture, mould, or leaks
- Drainage or visible water ingress concerns
- General safety concerns

Assessment:
No immediate action is required. The property is suitable for handover to the incoming tenants.', 'Overall Presentation:
The property was presented in a clean and tidy condition and was ready for tenant possession.

Tenant Care:
This was a commencement inspection, and no tenant-care concern was noted from the inspection.

Maintenance:
No specific maintenance concern was noted from the inspection.

Risk Areas:
No visible leak, mould, moisture, or safety concern was noted from the inspection.

Assessment:
No immediate action is required. The property is suitable for handover.', 'Overall Presentation: The property is presented in a clean, tidy, and professional condition. It is clear and ready for the incoming tenants to take possession.

Tenant Care: As this is a commencement inspection, the property is currently vacant. The expectations for maintaining this standard have been outlined to the new tenants.

Maintenance: A full walkthrough confirms that all fixtures, fittings, and appliances are clean, functional, and in good working order. No pre-existing issues were identified.

Risk Areas: The property is dry and secure. All smoke alarms have been tested and are compliant with current legislation. No signs of moisture or leaks were detected.

Assessment: No action is required. The property is fit for habitation and the keys have been released.'),
                ('搬出', 'Overall Presentation:
The property was returned in a clean and tidy condition.

Tenant Care:
No tenant cleaning, rubbish, abandoned item, or avoidable damage issue was noted from the inspection.

Maintenance:
No specific maintenance concern requiring owner follow-up was noted from the inspection.

Risk Areas:
No leak, mould, or physical damage concern was noted from the inspection.

Assessment:
No immediate action is required based on the inspection notes.', '', ''),
                ('例行检查', 'Overall Presentation:
The property was presented in a generally clean and tidy condition.

Tenant Care:
The tenant appears to be maintaining the premises to an acceptable standard.

Maintenance:
No specific maintenance concern was noted from the inspection.

Risk Areas:
No leak, mould, or physical damage concern was noted from the inspection.

Assessment:
No immediate action is required.', '', '')
            ) AS defaults(""Name"", ""Text"", ""PreviousText"", ""LegacyText"") ON defaults.""Name"" = t.""Name""
            WHERE g.""InspectionTypeId"" = t.""Id""
              AND (
                  NULLIF(trim(g.""Text""), '') IS NULL
                  OR g.""Text"" = defaults.""PreviousText""
                  OR g.""Text"" = defaults.""LegacyText""
              );
        ";
    }
}

