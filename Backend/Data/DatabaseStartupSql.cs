namespace InspectionApi.Data
{
    public static class DatabaseStartupSql
    {
        public const string IdentitySequenceSyncSql = @"
                DO $$
                DECLARE
                    seq  text;
                    nval bigint;
                BEGIN
                    -- Properties
                    seq := pg_get_serial_sequence('""Properties""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""Properties"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- InspectionRecords
                    seq := pg_get_serial_sequence('""InspectionRecords""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""InspectionRecords"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- InspectionTasks
                    seq := pg_get_serial_sequence('""InspectionTasks""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""InspectionTasks"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- TemplateInspectionTypes
                    seq := pg_get_serial_sequence('""TemplateInspectionTypes""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""TemplateInspectionTypes"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- CleanlinessAreas
                    seq := pg_get_serial_sequence('""CleanlinessAreas""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""CleanlinessAreas"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- DamageItems
                    seq := pg_get_serial_sequence('""DamageItems""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""DamageItems"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- GeneralTemplates
                    seq := pg_get_serial_sequence('""GeneralTemplates""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""GeneralTemplates"";
                        PERFORM setval(seq, nval, false);
                    END IF;

                    -- AudienceTemplates
                    seq := pg_get_serial_sequence('""AudienceTemplates""', 'Id');
                    IF seq IS NOT NULL THEN
                        SELECT COALESCE(MAX(""Id""), 0) + 1 INTO nval FROM ""AudienceTemplates"";
                        PERFORM setval(seq, nval, false);
                    END IF;
                END $$;
            ";
    }
}
