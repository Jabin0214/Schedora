using System.Text;
using System.Text.RegularExpressions;
using InspectionApi.Models;

namespace InspectionApi.Services
{
    public class TenantContactImportPreview
    {
        public int TotalRows { get; set; }
        public int MatchedRows { get; set; }
        public int SkippedRows { get; set; }
        public List<TenantContactImportMatch> MatchedContacts { get; set; } = new();
        public List<TenantContactImportUnmatched> UnmatchedRows { get; set; } = new();
    }

    public class TenantContactImportSummary
    {
        public int TotalRows { get; set; }
        public int MatchedRows { get; set; }
        public int SkippedRows { get; set; }
        public int MatchedProperties { get; set; }
        public int UnmatchedRows { get; set; }
        public int ExistingRowsToReplace { get; set; }
        public int UnchangedRows { get; set; }
        public int NewOrChangedRows { get; set; }
        public List<TenantContactImportUnmatched> Unmatched { get; set; } = new();
    }

    public class TenantContactImportMatch
    {
        public int PropertyId { get; set; }
        public string PropertyAddress { get; set; } = string.Empty;
        public string SourceAddress { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LeaseDateEnded { get; set; } = string.Empty;
    }

    public class TenantContactImportUnmatched
    {
        public string SourceAddress { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string LeaseDateEnded { get; set; } = string.Empty;
    }

    public static class TenantContactImportService
    {
        public static async Task<TenantContactImportPreview> PreviewImportAsync(
            Stream csvStream,
            IEnumerable<Property> properties)
        {
            using var reader = new StreamReader(csvStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
            var rows = ParseCsv(await reader.ReadToEndAsync());
            var headerIndex = rows.FindIndex(r => r.Count > 0 && string.Equals(r[0], "Property Address Full", StringComparison.OrdinalIgnoreCase));
            if (headerIndex < 0)
                throw new InvalidDataException("CSV header row 'Property Address Full' was not found.");

            var propertyLookup = properties
                .GroupBy(p => NormalizeAddress(p.Address))
                .Where(g => !string.IsNullOrWhiteSpace(g.Key) && g.Count() == 1)
                .ToDictionary(g => g.Key, g => g.Single());
            var header = rows[headerIndex];
            var addressIndex = FindColumn(header, "Property Address Full", "Address");
            var phoneIndex = FindColumn(header, "Tenant Group Phone 1", "Phone");
            var emailIndex = FindColumn(header, "Tenant Group Email", "Tenant Email 1", "Email");
            var leaseEndIndex = FindColumn(header, "Tenant Group Lease Date Ended", "Lease Date Ended");

            var preview = new TenantContactImportPreview();
            var matchedContactKeys = new HashSet<string>();
            foreach (var row in rows.Skip(headerIndex + 1))
            {
                if (row.Count == 0 || row.All(string.IsNullOrWhiteSpace))
                    continue;

                var sourceAddress = GetCell(row, addressIndex);
                var phone = GetCell(row, phoneIndex);
                var email = GetCell(row, emailIndex);
                var leaseDateEnded = GetCell(row, leaseEndIndex);
                if (string.IsNullOrWhiteSpace(sourceAddress))
                    continue;

                preview.TotalRows++;
                if (string.IsNullOrWhiteSpace(phone) && string.IsNullOrWhiteSpace(email))
                {
                    preview.SkippedRows++;
                    continue;
                }

                if (propertyLookup.TryGetValue(NormalizeAddress(sourceAddress), out var property))
                {
                    var key = ContactKey(property.Id, sourceAddress, phone, email, leaseDateEnded);
                    if (!matchedContactKeys.Add(key))
                        continue;

                    preview.MatchedContacts.Add(new TenantContactImportMatch
                    {
                        PropertyId = property.Id,
                        PropertyAddress = property.Address,
                        SourceAddress = sourceAddress,
                        Phone = phone,
                        Email = email,
                        LeaseDateEnded = leaseDateEnded
                    });
                    continue;
                }

                preview.UnmatchedRows.Add(new TenantContactImportUnmatched
                {
                    SourceAddress = sourceAddress,
                    Phone = phone,
                    Email = email,
                    LeaseDateEnded = leaseDateEnded
                });
            }

            preview.MatchedRows = preview.MatchedContacts.Count;
            return preview;
        }

        public static string NormalizeAddress(string value)
        {
            var normalized = value.Trim().ToLowerInvariant();
            normalized = Regex.Replace(normalized, @"\(\*\)", " ");
            normalized = Regex.Replace(normalized, @"\bave\b", "avenue");
            normalized = Regex.Replace(normalized, @"\brd\b", "road");
            normalized = Regex.Replace(normalized, @"\bst\b", "street");
            normalized = Regex.Replace(normalized, @"[^a-z0-9]+", " ");
            return Regex.Replace(normalized, @"\s+", " ").Trim();
        }

        public static TenantContactImportSummary BuildSummary(
            TenantContactImportPreview preview,
            IEnumerable<TenantContact> existingContacts)
        {
            var matchedPropertyIds = preview.MatchedContacts.Select(c => c.PropertyId).Distinct().ToHashSet();
            var existingForMatchedProperties = existingContacts
                .Where(c => matchedPropertyIds.Contains(c.PropertyId))
                .ToList();
            var existingKeys = existingForMatchedProperties
                .Select(c => ContactKey(c.PropertyId, c.SourceAddress, c.Phone, c.Email, c.LeaseDateEnded))
                .ToHashSet();
            var unchangedRows = preview.MatchedContacts
                .Count(c => existingKeys.Contains(ContactKey(c.PropertyId, c.SourceAddress, c.Phone, c.Email, c.LeaseDateEnded)));

            return new TenantContactImportSummary
            {
                TotalRows = preview.TotalRows,
                MatchedRows = preview.MatchedRows,
                SkippedRows = preview.SkippedRows,
                MatchedProperties = matchedPropertyIds.Count,
                UnmatchedRows = preview.UnmatchedRows.Count,
                ExistingRowsToReplace = existingForMatchedProperties.Count,
                UnchangedRows = unchangedRows,
                NewOrChangedRows = preview.MatchedContacts.Count - unchangedRows,
                Unmatched = preview.UnmatchedRows.Take(200).ToList()
            };
        }

        private static string ContactKey(int propertyId, string sourceAddress, string phone, string email, string leaseDateEnded)
        {
            return string.Join("|",
                propertyId,
                NormalizeAddress(sourceAddress),
                phone.Trim().ToLowerInvariant(),
                email.Trim().ToLowerInvariant(),
                leaseDateEnded.Trim().ToLowerInvariant());
        }

        private static string GetCell(IReadOnlyList<string> row, int index)
        {
            if (index < 0)
                return string.Empty;
            return index < row.Count ? row[index].Trim() : string.Empty;
        }

        private static int FindColumn(IReadOnlyList<string> header, params string[] names)
        {
            for (var i = 0; i < header.Count; i++)
            {
                var current = header[i].Trim();
                if (names.Any(name => string.Equals(current, name, StringComparison.OrdinalIgnoreCase)))
                    return i;
            }
            return -1;
        }

        private static List<List<string>> ParseCsv(string csv)
        {
            var rows = new List<List<string>>();
            var row = new List<string>();
            var cell = new StringBuilder();
            var inQuotes = false;

            for (var i = 0; i < csv.Length; i++)
            {
                var ch = csv[i];
                if (inQuotes)
                {
                    if (ch == '"' && i + 1 < csv.Length && csv[i + 1] == '"')
                    {
                        cell.Append('"');
                        i++;
                    }
                    else if (ch == '"')
                    {
                        inQuotes = false;
                    }
                    else
                    {
                        cell.Append(ch);
                    }
                    continue;
                }

                if (ch == '"')
                {
                    inQuotes = true;
                }
                else if (ch == ',')
                {
                    row.Add(cell.ToString());
                    cell.Clear();
                }
                else if (ch == '\n')
                {
                    row.Add(cell.ToString().TrimEnd('\r'));
                    rows.Add(row);
                    row = new List<string>();
                    cell.Clear();
                }
                else
                {
                    cell.Append(ch);
                }
            }

            if (cell.Length > 0 || row.Count > 0)
            {
                row.Add(cell.ToString().TrimEnd('\r'));
                rows.Add(row);
            }

            return rows;
        }
    }
}
