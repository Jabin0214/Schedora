using System.ComponentModel.DataAnnotations;
using InspectionApi.Models.DTOs;

namespace Backend.Tests;

public class TaskTypeValidationTests
{
    [Fact]
    public void TaskTypeCreateRequiresValidNameAndColor()
    {
        var dto = new TaskTypeCreateDto
        {
            Name = string.Empty,
            Color = new string('x', 31)
        };

        var results = Validate(dto);

        Assert.Contains(results, result => result.MemberNames.Contains(nameof(TaskTypeCreateDto.Name)));
        Assert.Contains(results, result => result.MemberNames.Contains(nameof(TaskTypeCreateDto.Color)));
    }

    [Fact]
    public void TaskTypeUpdateRejectsNegativeDisplayOrder()
    {
        var dto = new TaskTypeUpdateDto
        {
            Name = "Routine",
            Color = "green",
            DisplayOrder = -1
        };

        Assert.Contains(Validate(dto), result =>
            result.MemberNames.Contains(nameof(TaskTypeUpdateDto.DisplayOrder)));
    }

    [Fact]
    public void TaskTypeCreateRejectsWhitespaceName()
    {
        var dto = new TaskTypeCreateDto
        {
            Name = "   ",
            Color = "green"
        };

        Assert.Contains(Validate(dto), result =>
            result.MemberNames.Contains(nameof(TaskTypeCreateDto.Name)));
    }

    private static List<ValidationResult> Validate(object value)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(value, new ValidationContext(value), results, validateAllProperties: true);
        return results;
    }
}
