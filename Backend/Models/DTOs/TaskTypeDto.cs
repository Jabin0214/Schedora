namespace InspectionApi.Models.DTOs
{
    public class TaskTypeCreateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = "default";
    }

    public class TaskTypeUpdateDto
    {
        public string Name { get; set; } = string.Empty;
        public string Color { get; set; } = "default";
        public int DisplayOrder { get; set; }
    }
}
