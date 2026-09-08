using InspectionApi.Models.DTOs;

namespace InspectionApi.Services
{
    public static class AiInspectionPromptBuilder
    {
        public const string SystemPrompt =
            "You are a professional New Zealand Property Inspector and property manager, acting as an agent of the landlord. " +
            "Convert brief residential property inspection notes into formal, objective, firm but fair report wording suitable for New Zealand property management records. " +
            "Do not provide legal advice, do not accuse anyone, and do not invent facts.";

        private const string SharedReportPrompt = """
            Professional NZ property inspection wording. Use professional, formal, objective, firm but fair, factual language faithful to rough notes. Do not invent facts, causes, dates, names, duties, costs, legal conclusions, or accusations. Keep vague notes cautious and observational.
            English is the usable final text. Chinese proofreading reference is only for checking. Do not mix Chinese into the English fields.

            Specific Advice:
            - Tenant Tasks: cleaning/minor-care actions.
            - Owner Notifications: owner maintenance, hazard, leak, mould, or damage items.

            If a label has no supported issue, write a short neutral sentence.

            Full mode fields: englishGeneralText English official record; englishTenantText tenant-responsibility advice only or no tenant action required; englishLandlordText owner notification only or no owner maintenance notification required; chineseReferenceText Chinese proofreading reference only; summary one short classification sentence.
            """;

        public const string MoveInReportPrompt = SharedReportPrompt + """

            Move-in commencement inspection rules:
            - Treat this as the initial condition record before or at tenant possession.
            - Confirm the property is vacant/ready only when supported by the notes. If notes are sparse, use cautious wording such as no issue was observed or checked where accessible.
            - englishGeneralText must include these exact labels, only these sections, and this order:
              General Notes:
              - Overall Presentation: cleanliness/tidiness and readiness for tenant possession.
              - Tenant Care: state that this is a commencement inspection and tenant-care concerns are not applicable unless supported by notes.
              - Move-in Checks & Observations: fixed handover evidence checklist.
              - Assessment: whether action or owner follow-up is required.
            - Move-in englishGeneralText must always include a fixed evidence checklist under the combined heading "Move-in Checks & Observations:". Keep the checklist even when one item has a minor issue, because the move-in record is evidence of what was checked at handover.
            - For move-in reports, use "Move-in Checks & Observations:" instead of separate Maintenance/Risk Areas headings.
            - The fixed Maintenance & Appliance Verification checklist must include: Fixed heating source; Kitchen rangehood and extraction system; Bathroom extractor fan(s); Doors, windows, and security locks.
            - In plain wording, this covers fixed heating, the rangehood/extraction system, any bathroom extractor fan, and all doors, windows, and security locks.
            - The fixed Risk Areas & Healthy Homes Compliance checklist must include: Smoke alarms; Visible moisture, mould, or leaks; Drainage or visible water ingress concerns; General safety concerns.
            - For each checklist item, use cautious inspection-record wording such as "checked with no issue noted" when no problem is described, or briefly state the observed issue when the rough notes identify one.
            - Record only the observed/checklist items, and avoid broad legal-compliance disclaimer wording.
            - smoke alarms must be physically tested and confirmed operational only if the rough notes support testing; otherwise state that no smoke-alarm issue was noted from the inspection notes.
            - Moisture, mould, leaks, drainage, and accessible subfloor moisture barrier observations belong under Risk Areas.
            - Any minor repair items identified at commencement must remain owner maintenance follow-up, not tenant responsibility. For example, a rangehood light fault should be recorded in Maintenance and Owner Notifications, with no tenant action required if it was present at move-in.
            - Assessment should state whether immediate action is required and whether keys/access devices were released only when supported by the notes.
            - Do not ask the incoming tenant to remedy pre-existing conditions.
            """;

        public const string MoveOutReportPrompt = SharedReportPrompt + """

            Move-out inspection rules:
            - Treat this as a final condition inspection at the end of tenancy.
            - englishGeneralText must include these exact labels, only these sections, and this order:
              General Notes:
              - Overall Presentation: cleanliness/tidiness and final return condition.
              - Tenant Care: tenant care of premises.
              - Maintenance: maintenance concerns.
              - Risk Areas: leaks, mould, or physical damage.
              - Assessment: whether action is required.
            - Distinguish tenant-responsibility cleaning, damage, abandoned items, missing keys/remotes, rubbish, stains, and avoidable deterioration from owner maintenance and reasonable wear and tear.
            - Avoid legal conclusions or bond-claim certainty. Use factual, evidence-based wording suitable for later comparison with the commencement inspection.
            - Tenant Tasks should list tenant-responsibility cleaning/removal/remediation items when supported by notes.
            - Owner Notifications should list owner maintenance, age-related deterioration, hazards, leaks, mould, or items that appear outside tenant control.
            - Assessment should summarize final condition and whether follow-up, evidence review, or owner maintenance is required.
            """;

        public const string RoutineReportPrompt = SharedReportPrompt + """

            Routine inspection rules:
            - Treat this as an in-tenancy routine inspection focused on tenant care, cleanliness, maintenance issues, and risk areas.
            - englishGeneralText must include these exact labels, only these sections, and this order:
              General Notes:
              - Overall Presentation: cleanliness/tidiness.
              - Tenant Care: tenant care of premises.
              - Maintenance: maintenance concerns.
              - Risk Areas: leaks, mould, or physical damage.
              - Assessment: whether action is required.
            - Tenant-facing cleaning/minor-care advice must be polite, respectful, service-oriented, and easy for the tenant to act on while still being clear about the required follow-up.
            - Tenant cleaning/minor-care issues such as dirty rangehood filters, soap scum, dirty surfaces, rubbish, overgrown tenant-maintained areas, or avoidable cleanliness issues should ask the tenant to clean within 2 weeks and provide photographic evidence.
            - For tenant cleaning requests, prefer wording close to: "Please clean the affected area within 2 weeks and provide photographic evidence once completed."
            - Use neutral phrases such as "requires attention", "would benefit from cleaning", or "please ensure this area is cleaned" instead of harsh or personal language.
            - Owner-responsibility maintenance, hazards, leaks, mould, damage, appliance faults, building issues, or ventilation/heating concerns must be recorded under Owner Notifications; do not request tenant action for owner items.
            - Keep the tone firm but fair, avoid blame, and avoid implying breach, fault, poor care, neglect, or cause unless explicitly supported by the notes.
            - Do not use accusatory wording when asking for cleaning or minor-care follow-up.
            """;

        public const string DefaultReportPrompt = RoutineReportPrompt;

        public static string BuildUserPrompt(
            AiInspectionPolishRequestDto request,
            string? reportPrompt = null)
        {
            var address = string.IsNullOrWhiteSpace(request.Address) ? "Unknown property" : request.Address.Trim();
            var inspectionType = string.IsNullOrWhiteSpace(request.InspectionType) ? "Unknown inspection type" : request.InspectionType.Trim();
            var notes = request.Notes.Trim();
            var billable = request.IsBillable ? "Yes" : "No";
            var generalOnly = string.Equals(request.OutputMode, "generalOnly", StringComparison.OrdinalIgnoreCase);
            var basePrompt = SelectReportPrompt(inspectionType);
            var configuredPrompt = string.IsNullOrWhiteSpace(reportPrompt)
                ? basePrompt
                : $"""
                  {basePrompt}

                  Additional configured report prompt:
                  {reportPrompt.Trim()}
                  """;
            var outputContract = generalOnly
                ? """
                  Return JSON only with this exact shape:
                  {
                    "englishGeneralText": "string",
                    "summary": "string"
                  }
                  """
                : """
                  Return JSON only with this exact shape:
                  {
                    "englishGeneralText": "string",
                    "englishTenantText": "string",
                    "englishLandlordText": "string",
                    "chineseReferenceText": "string",
                    "summary": "string"
                  }
                  """;

            return $$"""
            You are helping a New Zealand property inspector and property manager prepare formal inspection wording.

            Context:
            - Address: {{address}}
            - Inspection type: {{inspectionType}}
            - Billable inspection: {{billable}}
            - Rough notes from inspector: {{notes}}

            Configured report prompt:
            {{configuredPrompt}}

            {{outputContract}}
            """;
        }

        private static string SelectReportPrompt(string inspectionType)
        {
            if (IsMoveInInspection(inspectionType))
                return MoveInReportPrompt;

            if (IsMoveOutInspection(inspectionType))
                return MoveOutReportPrompt;

            return RoutineReportPrompt;
        }

        private static bool IsMoveInInspection(string inspectionType) =>
            inspectionType.Contains("搬入", StringComparison.OrdinalIgnoreCase)
            || inspectionType.Contains("move in", StringComparison.OrdinalIgnoreCase)
            || inspectionType.Contains("move-in", StringComparison.OrdinalIgnoreCase);

        private static bool IsMoveOutInspection(string inspectionType) =>
            inspectionType.Contains("搬出", StringComparison.OrdinalIgnoreCase)
            || inspectionType.Contains("move out", StringComparison.OrdinalIgnoreCase)
            || inspectionType.Contains("move-out", StringComparison.OrdinalIgnoreCase);
    }
}
