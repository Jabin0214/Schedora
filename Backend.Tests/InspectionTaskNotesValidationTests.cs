using System.ComponentModel.DataAnnotations;
using System.Reflection;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;

namespace Backend.Tests;

public class InspectionTaskNotesValidationTests
{
    [Fact]
    public void CreateAndUpdateDtosAllowLongInspectionNotes()
    {
        var longNotes = new string('a', 1200);

        var createDto = new InspectionTaskCreateDto
        {
            PropertyId = 1,
            Type = 2,
            Notes = longNotes
        };
        var updateDto = new InspectionTaskUpdateDto
        {
            PropertyId = 1,
            Type = 2,
            Notes = longNotes,
            IsBillable = false
        };

        Assert.Empty(Validate(createDto));
        Assert.Empty(Validate(updateDto));
    }

    [Fact]
    public void InspectionTaskNotesDoesNotDeclareAStringLengthLimit()
    {
        var property = typeof(InspectionTask).GetProperty(nameof(InspectionTask.Notes));

        Assert.NotNull(property);
        Assert.DoesNotContain(
            property.GetCustomAttributes<StringLengthAttribute>(),
            attribute => attribute.MaximumLength == 500);
    }

    private static List<ValidationResult> Validate(object value)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(value, new ValidationContext(value), results, validateAllProperties: true);
        return results;
    }
}
