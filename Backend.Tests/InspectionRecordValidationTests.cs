using System.ComponentModel.DataAnnotations;
using InspectionApi.Models.DTOs;

namespace Backend.Tests;

public class InspectionRecordValidationTests
{
    [Fact]
    public void TaskCompletionRejectsNegativeParkingFee()
    {
        var dto = new TaskCompletionDto
        {
            ExecutionDate = "2026-06-10T10:00:00+12:00",
            ParkingFee = -1
        };

        Assert.Contains(Validate(dto), result =>
            result.MemberNames.Contains(nameof(TaskCompletionDto.ParkingFee)));
    }

    [Fact]
    public void RecordUpdateRejectsNegativeParkingFee()
    {
        var dto = new InspectionRecordUpdateDto
        {
            ExecutionDate = "2026-06-10T10:00:00+12:00",
            Type = 2,
            IsCharged = true,
            ParkingFee = -1
        };

        Assert.Contains(Validate(dto), result =>
            result.MemberNames.Contains(nameof(InspectionRecordUpdateDto.ParkingFee)));
    }

    private static List<ValidationResult> Validate(object value)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(value, new ValidationContext(value), results, validateAllProperties: true);
        return results;
    }
}
