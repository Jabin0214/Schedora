namespace InspectionApi.Models.DTOs
{
    public class TenantContactDto
    {
        public int Id { get; set; }
        public int PropertyId { get; set; }
        public string PropertyAddress { get; set; } = string.Empty;
        public string SourceAddress { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LeaseDateEnded { get; set; } = string.Empty;
        public string ImportedAt { get; set; } = string.Empty;
    }

    public class TenantContactImportResponseDto
    {
        public int TotalRows { get; set; }
        public int MatchedRows { get; set; }
        public int SkippedRows { get; set; }
        public int ImportedRows { get; set; }
        public int MatchedProperties { get; set; }
        public int UnmatchedRows { get; set; }
        public int ExistingRowsToReplace { get; set; }
        public int UnchangedRows { get; set; }
        public int NewOrChangedRows { get; set; }
        public List<TenantContactImportUnmatchedDto> Unmatched { get; set; } = new();
    }

    public class TenantContactImportUnmatchedDto
    {
        public string SourceAddress { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LeaseDateEnded { get; set; } = string.Empty;
    }
}
