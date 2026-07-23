using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace InspectionApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TenantContactsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TenantContactsController> _logger;

        public TenantContactsController(AppDbContext context, ILogger<TenantContactsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<TenantContactDto>>> GetTenantContacts([FromQuery] string? search)
        {
            var query = _context.TenantContacts
                .Include(c => c.Property)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var q = search.Trim().ToLower();
                query = query.Where(c =>
                    c.SourceAddress.ToLower().Contains(q) ||
                    c.Phone.ToLower().Contains(q) ||
                    c.Email.ToLower().Contains(q) ||
                    (c.Property != null && c.Property.Address.ToLower().Contains(q)));
            }

            var contacts = await query
                .OrderBy(c => c.Property!.Address)
                .ThenBy(c => c.Id)
                .Select(c => new TenantContactDto
                {
                    Id = c.Id,
                    PropertyId = c.PropertyId,
                    PropertyAddress = c.Property == null ? string.Empty : c.Property.Address,
                    SourceAddress = c.SourceAddress,
                    Phone = c.Phone,
                    Email = c.Email,
                    LeaseDateEnded = c.LeaseDateEnded,
                    ImportedAt = c.ImportedAt.ToString("O")
                })
                .ToListAsync();

            return Ok(contacts);
        }

        [HttpGet("property/{propertyId:int}")]
        public async Task<ActionResult<IEnumerable<TenantContactDto>>> GetTenantContactsForProperty(int propertyId)
        {
            var exists = await _context.Properties.AnyAsync(p => p.Id == propertyId);
            if (!exists)
                return NotFound(new { message = $"未找到ID为{propertyId}的物业" });

            var contacts = await _context.TenantContacts
                .Where(c => c.PropertyId == propertyId)
                .Include(c => c.Property)
                .OrderBy(c => c.Id)
                .Select(c => new TenantContactDto
                {
                    Id = c.Id,
                    PropertyId = c.PropertyId,
                    PropertyAddress = c.Property == null ? string.Empty : c.Property.Address,
                    SourceAddress = c.SourceAddress,
                    Phone = c.Phone,
                    Email = c.Email,
                    LeaseDateEnded = c.LeaseDateEnded,
                    ImportedAt = c.ImportedAt.ToString("O")
                })
                .ToListAsync();

            return Ok(contacts);
        }

        [HttpPost("import")]
        [RequestSizeLimit(5_000_000)]
        public async Task<ActionResult<TenantContactImportResponseDto>> ImportTenantContacts([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "请选择要导入的CSV文件" });

            if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "只支持CSV文件" });

            var properties = await _context.Properties.AsNoTracking().ToListAsync();
            await using var stream = file.OpenReadStream();
            TenantContactImportPreview preview;
            try
            {
                preview = await TenantContactImportService.PreviewImportAsync(stream, properties);
            }
            catch (InvalidDataException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            var propertyIds = preview.MatchedContacts.Select(c => c.PropertyId).Distinct().ToList();
            var existingContacts = await _context.TenantContacts
                .Where(c => propertyIds.Contains(c.PropertyId))
                .ToListAsync();
            var summary = TenantContactImportService.BuildSummary(preview, existingContacts);
            if (propertyIds.Count > 0)
            {
                _context.TenantContacts.RemoveRange(existingContacts);
            }

            var importedAt = DateTimeOffset.UtcNow;
            var contacts = preview.MatchedContacts.Select(c => new TenantContact
            {
                PropertyId = c.PropertyId,
                SourceAddress = c.SourceAddress,
                Phone = c.Phone,
                Email = c.Email,
                LeaseDateEnded = c.LeaseDateEnded,
                ImportedAt = importedAt
            }).ToList();

            _context.TenantContacts.AddRange(contacts);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Imported {Count} tenant contacts across {Properties} properties", contacts.Count, propertyIds.Count);

            return Ok(new TenantContactImportResponseDto
            {
                TotalRows = summary.TotalRows,
                MatchedRows = summary.MatchedRows,
                SkippedRows = summary.SkippedRows,
                ImportedRows = contacts.Count,
                MatchedProperties = summary.MatchedProperties,
                UnmatchedRows = summary.UnmatchedRows,
                ExistingRowsToReplace = summary.ExistingRowsToReplace,
                UnchangedRows = summary.UnchangedRows,
                NewOrChangedRows = summary.NewOrChangedRows,
                Unmatched = summary.Unmatched
                    .Select(r => new TenantContactImportUnmatchedDto
                    {
                        SourceAddress = r.SourceAddress,
                        Phone = r.Phone,
                        Email = r.Email,
                        LeaseDateEnded = r.LeaseDateEnded
                    })
                    .ToList()
            });
        }

        [HttpPost("preview")]
        [RequestSizeLimit(5_000_000)]
        public async Task<ActionResult<TenantContactImportResponseDto>> PreviewTenantContacts([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "请选择要校对的CSV文件" });

            if (!file.FileName.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "只支持CSV文件" });

            var properties = await _context.Properties.AsNoTracking().ToListAsync();
            await using var stream = file.OpenReadStream();
            TenantContactImportPreview preview;
            try
            {
                preview = await TenantContactImportService.PreviewImportAsync(stream, properties);
            }
            catch (InvalidDataException ex)
            {
                return BadRequest(new { message = ex.Message });
            }

            var propertyIds = preview.MatchedContacts.Select(c => c.PropertyId).Distinct().ToList();
            var existingContacts = await _context.TenantContacts
                .Where(c => propertyIds.Contains(c.PropertyId))
                .AsNoTracking()
                .ToListAsync();
            var summary = TenantContactImportService.BuildSummary(preview, existingContacts);

            return Ok(new TenantContactImportResponseDto
            {
                TotalRows = summary.TotalRows,
                MatchedRows = summary.MatchedRows,
                SkippedRows = summary.SkippedRows,
                ImportedRows = 0,
                MatchedProperties = summary.MatchedProperties,
                UnmatchedRows = summary.UnmatchedRows,
                ExistingRowsToReplace = summary.ExistingRowsToReplace,
                UnchangedRows = summary.UnchangedRows,
                NewOrChangedRows = summary.NewOrChangedRows,
                Unmatched = summary.Unmatched
                    .Select(r => new TenantContactImportUnmatchedDto
                    {
                        SourceAddress = r.SourceAddress,
                        Phone = r.Phone,
                        Email = r.Email,
                        LeaseDateEnded = r.LeaseDateEnded
                    })
                    .ToList()
            });
        }
    }
}
