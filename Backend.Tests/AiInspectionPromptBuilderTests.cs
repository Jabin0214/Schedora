using InspectionApi.Models.DTOs;
using InspectionApi.Services;

namespace Backend.Tests;

public class AiInspectionPromptBuilderTests
{
    [Fact]
    public void BuildsPromptWithTaskContextAndProfessionalTone()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "12 Queen Street, Auckland",
            InspectionType = "Routine",
            Notes = "厨房很脏，墙上有划痕",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("12 Queen Street, Auckland", prompt);
        Assert.Contains("Routine", prompt);
        Assert.Contains("厨房很脏，墙上有划痕", prompt);
        Assert.Contains("New Zealand property inspector", prompt);
        Assert.Contains("property manager", prompt);
        Assert.Contains("professional", prompt);
        Assert.Contains("Do not invent", prompt);
    }

    [Fact]
    public void BuildsPromptWithJsonOnlyOutputContractAndSeparatedEnglishChineseFields()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "8 Test Road",
            InspectionType = "Move Out",
            Notes = "bathroom mould, carpet stain",
            IsBillable = false
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("Return JSON only", prompt);
        Assert.Contains("English official record", prompt);
        Assert.Contains("Chinese proofreading reference", prompt);
        Assert.Contains("English is the usable final text", prompt);
        Assert.Contains("Do not mix Chinese into the English fields", prompt);
        Assert.Contains("General Notes", prompt);
        Assert.Contains("Specific Advice", prompt);
        Assert.Contains("\"englishGeneralText\"", prompt);
        Assert.Contains("\"englishTenantText\"", prompt);
        Assert.Contains("\"englishLandlordText\"", prompt);
        Assert.Contains("\"chineseReferenceText\"", prompt);
        Assert.Contains("\"summary\"", prompt);
    }

    [Fact]
    public void BuildsPromptWithTenantDeadlineAndOwnerNotificationRules()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "5 Example Lane",
            InspectionType = "Routine",
            Notes = "rangehood filter dirty, bathroom glass has soap scum, gutter leaking",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("2 weeks", prompt);
        Assert.Contains("photographic evidence", prompt);
        Assert.Contains("Tenant Tasks", prompt);
        Assert.Contains("Owner Notifications", prompt);
        Assert.Contains("do not request tenant action", prompt);
    }

    [Fact]
    public void SystemPromptRestrictsTheModelToInspectionWording()
    {
        var prompt = AiInspectionPromptBuilder.SystemPrompt;

        Assert.Contains("New Zealand Property Inspector", prompt);
        Assert.Contains("agent of the landlord", prompt);
        Assert.Contains("Do not provide legal advice", prompt);
        Assert.Contains("firm but fair", prompt);
    }
}
