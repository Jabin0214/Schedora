namespace InspectionApi.Models.DTOs
{
    public class PropertyDto
    {
        public int Id { get; set; }
        public string Address { get; set; } = string.Empty;
        public string BillingPolicy { get; set; } = string.Empty;
        public string? LastInspectionDate { get; set; }
        public string? LastInspectionType { get; set; }
        public bool LastInspectionWasCharged { get; set; }
    }

    public class PropertyCreateDto
    {
        public string Address { get; set; } = string.Empty;
        public string BillingPolicy { get; set; } = string.Empty;
    }

    public class PropertyUpdateDto
    {
        public string Address { get; set; } = string.Empty;
        public string BillingPolicy { get; set; } = string.Empty;
    }
}