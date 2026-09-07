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
    public void BuildsPromptWithConfiguredReportInstructions()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "12 Queen Street, Auckland",
            InspectionType = "Routine",
            Notes = "rangehood filter dirty",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(
            request,
            "Always mention that tenant cleaning evidence should be sent by email.");

        Assert.Contains("Configured report prompt:", prompt);
        Assert.Contains("tenant cleaning evidence should be sent by email", prompt);
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
    public void BuildsGeneralOnlyPromptWithSmallerOutputContract()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "8 Test Road",
            InspectionType = "Routine",
            Notes = "rangehood filter dirty",
            IsBillable = false,
            OutputMode = "generalOnly"
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("Return JSON only", prompt);
        Assert.Contains("\"englishGeneralText\"", prompt);
        Assert.Contains("\"summary\"", prompt);
        Assert.DoesNotContain("\"englishTenantText\"", prompt);
        Assert.DoesNotContain("\"englishLandlordText\"", prompt);
        Assert.DoesNotContain("\"chineseReferenceText\"", prompt);
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
    public void RequiresEnglishGeneralTextToUseFiveExplicitPillarLabels()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "7 Sample Street",
            InspectionType = "Routine",
            Notes = "kitchen dirty, garage leak mark",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("englishGeneralText must include these exact labels", prompt);
        Assert.Contains("Overall Presentation:", prompt);
        Assert.Contains("Tenant Care:", prompt);
        Assert.Contains("Maintenance:", prompt);
        Assert.Contains("Risk Areas:", prompt);
        Assert.Contains("Assessment:", prompt);
    }

    [Fact]
    public void MoveInPromptIncludesInitialConditionAndHealthyHomesChecks()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "9 Entry Road",
            InspectionType = "搬入",
            Notes = "clean, ready for tenant",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("commencement inspection", prompt);
        Assert.Contains("smoke alarms", prompt);
        Assert.Contains("Fixed heating", prompt);
        Assert.Contains("rangehood", prompt);
        Assert.Contains("bathroom extractor", prompt);
        Assert.Contains("doors, windows, and security locks", prompt);
        Assert.Contains("Drainage or visible water ingress concerns", prompt);
    }

    [Fact]
    public void MoveInPromptRequiresFixedEvidenceChecklistAndOwnerFollowUpForMinorRepairs()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "9 Entry Road",
            InspectionType = "Move In",
            Notes = "All good but rangehood light not working. Contractor contacted.",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("Move-in englishGeneralText must always include a fixed evidence checklist", prompt);
        Assert.Contains("Move-in Checks & Observations:", prompt);
        Assert.Contains("Fixed heating source", prompt);
        Assert.Contains("Kitchen rangehood and extraction system", prompt);
        Assert.Contains("Bathroom extractor fan(s)", prompt);
        Assert.Contains("Doors, windows, and security locks", prompt);
        Assert.Contains("Smoke alarms", prompt);
        Assert.Contains("Visible moisture, mould, or leaks", prompt);
        Assert.Contains("minor repair items identified at commencement must remain owner maintenance follow-up", prompt);
        Assert.Contains("rangehood light", prompt);
        Assert.DoesNotContain("full compliance verification", prompt);
    }

    [Fact]
    public void MoveInPromptDoesNotContradictCombinedChecksHeading()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "9 Entry Road",
            InspectionType = "Move In",
            Notes = "All good",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("Move-in Checks & Observations:", prompt);
        Assert.DoesNotContain("- Maintenance: maintenance concerns.", prompt);
        Assert.DoesNotContain("- Risk Areas: leaks, mould, or physical damage.", prompt);
    }

    [Fact]
    public void MoveOutPromptIncludesFinalConditionAndWearAndTearBoundaries()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "10 Exit Road",
            InspectionType = "Move Out",
            Notes = "carpet stained, rubbish left",
            IsBillable = false
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("final condition", prompt);
        Assert.Contains("reasonable wear and tear", prompt);
        Assert.Contains("tenant-responsibility cleaning", prompt);
        Assert.Contains("abandoned items", prompt);
    }

    [Fact]
    public void RoutinePromptKeepsTenantDeadlineAndOwnerMaintenanceRules()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "11 Routine Road",
            InspectionType = "例行检查",
            Notes = "rangehood dirty, leak under sink",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("routine inspection", prompt);
        Assert.Contains("2 weeks", prompt);
        Assert.Contains("photographic evidence", prompt);
        Assert.Contains("Owner Notifications", prompt);
    }

    [Fact]
    public void RoutinePromptRequiresPoliteTenantCleaningRequests()
    {
        var request = new AiInspectionPolishRequestDto
        {
            Address = "11 Routine Road",
            InspectionType = "Routine",
            Notes = "rangehood dirty, bathroom glass has soap scum",
            IsBillable = true
        };

        var prompt = AiInspectionPromptBuilder.BuildUserPrompt(request);

        Assert.Contains("polite, respectful", prompt);
        Assert.Contains("Please clean the affected area within 2 weeks and provide photographic evidence once completed", prompt);
        Assert.Contains("avoid blame", prompt);
        Assert.Contains("Do not use accusatory wording", prompt);
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
