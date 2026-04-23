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
                END $$;
            ";
    }
}
