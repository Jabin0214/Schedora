using InspectionApi.Models;

namespace InspectionApi.Services
{
    public static class TenantContactSummaryFormatter
    {
        public static string? FormatFirst(IEnumerable<TenantContact> contacts)
        {
            var first = contacts
                .OrderBy(c => c.Id)
                .FirstOrDefault(c => !string.IsNullOrWhiteSpace(c.Phone) || !string.IsNullOrWhiteSpace(c.Email));

            if (first == null) return null;

            var parts = new[] { first.Phone, first.Email }
                .Where(value => !string.IsNullOrWhiteSpace(value))
                .Select(value => value.Trim());

            return string.Join(" · ", parts);
        }
    }
}
