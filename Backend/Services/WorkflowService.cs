using InspectionApi.Data;
using InspectionApi.Models;
using InspectionApi.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace InspectionApi.Services
{
    public class WorkflowService : IWorkflowService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<WorkflowService> _logger;

        private static readonly IReadOnlyList<MoveInChecklistDefinition> MoveInChecklist =
        [
            new("send-declaration-email", "发送声明邮件", WorkflowStage.DeclarationEmail),
            new("receive-declaration-reply", "收到声明回复", WorkflowStage.WaitingDeclarationReply),
            new("send-draft-pack", "发送合同草稿、押金条草稿、House health report", WorkflowStage.DraftPack),
            new("receive-signed-agreement", "收到签回合同", WorkflowStage.SignedAndTenancySetup),
            new("create-tenancy-profile", "建立 tenancy 系统档案", WorkflowStage.SignedAndTenancySetup),
            new("record-move-in-appointment", "记录入住预约时间", WorkflowStage.MoveInAndWrapUp),
            new("complete-move-in", "办理入住完成", WorkflowStage.MoveInAndWrapUp),
            new("send-final-agreement-email", "发送完整版合同邮件", WorkflowStage.MoveInAndWrapUp),
            new("send-move-in-photos-email", "发送入住照片邮件", WorkflowStage.MoveInAndWrapUp),
            new("send-building-rules-email", "发送大楼规矩邮件", WorkflowStage.MoveInAndWrapUp),
            new("send-house-rules-email", "发送我们的规矩邮件", WorkflowStage.MoveInAndWrapUp),
            new("send-smoke-alarm-email", "发送烟雾报警器邮件", WorkflowStage.MoveInAndWrapUp),
            new("upload-final-agreement", "最终合同放入系统", WorkflowStage.MoveInAndWrapUp),
        ];

        public WorkflowService(AppDbContext context, ILogger<WorkflowService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<IEnumerable<WorkflowDto>> GetMoveInsAsync(CancellationToken cancellationToken = default)
        {
            var workflows = await _context.Workflows
                .Include(w => w.Items)
                .Where(w => w.Type == WorkflowType.MoveIn && !w.IsArchived)
                .OrderBy(w => w.Stage)
                .ThenBy(w => w.MoveInAppointmentAt)
                .ThenByDescending(w => w.UpdatedAt)
                .ToListAsync(cancellationToken);

            return workflows.Select(ToDto);
        }

        public async Task<WorkflowDto> CreateMoveInAsync(WorkflowCreateDto dto, CancellationToken cancellationToken = default)
        {
            var address = NormalizeAddressDisplay(dto.Address);
            var addressKey = NormalizeAddressKey(address);
            var exists = await _context.Workflows.AnyAsync(w =>
                w.Type == WorkflowType.MoveIn &&
                w.AddressKey == addressKey &&
                !w.IsArchived,
                cancellationToken);

            if (exists)
                throw new ArgumentException($"Address \"{address}\" already has an active move in workflow");

            var now = DateTimeOffset.UtcNow;
            var workflow = new Workflow
            {
                Type = WorkflowType.MoveIn,
                Address = address,
                AddressKey = addressKey,
                Stage = WorkflowStage.DeclarationEmail,
                MoveInAppointmentAt = ParseOptionalDate(dto.MoveInAppointmentAt),
                Notes = dto.Notes,
                CreatedAt = now,
                UpdatedAt = now,
                Items = MoveInChecklist.Select((item, index) => new WorkflowChecklistItem
                {
                    Key = item.Key,
                    Label = item.Label,
                    Stage = item.Stage,
                    DisplayOrder = index
                }).ToList()
            };

            _context.Workflows.Add(workflow);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Move in workflow created: {Address} (Id={Id})", workflow.Address, workflow.Id);
            return ToDto(workflow);
        }

        public async Task<WorkflowDto?> UpdateMoveInAsync(int id, WorkflowUpdateDto dto, CancellationToken cancellationToken = default)
        {
            var workflow = await FindMoveInAsync(id, cancellationToken);
            if (workflow == null) return null;

            var address = NormalizeAddressDisplay(dto.Address);
            var addressKey = NormalizeAddressKey(address);
            var duplicate = await _context.Workflows.AnyAsync(w =>
                w.Id != id &&
                w.Type == WorkflowType.MoveIn &&
                w.AddressKey == addressKey &&
                !w.IsArchived,
                cancellationToken);

            if (duplicate)
                throw new ArgumentException($"Address \"{address}\" already has an active move in workflow");

            workflow.Address = address;
            workflow.AddressKey = addressKey;
            workflow.MoveInAppointmentAt = ParseOptionalDate(dto.MoveInAppointmentAt);
            workflow.Notes = dto.Notes;
            workflow.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return ToDto(workflow);
        }

        public async Task<WorkflowDto> UpdateChecklistItemAsync(int id, string itemKey, WorkflowChecklistItemUpdateDto dto, CancellationToken cancellationToken = default)
        {
            var workflow = await FindMoveInAsync(id, cancellationToken)
                ?? throw new ArgumentException($"Move in workflow {id} was not found");

            var item = workflow.Items.FirstOrDefault(i => i.Key == itemKey)
                ?? throw new ArgumentException($"Checklist item \"{itemKey}\" was not found");

            item.IsCompleted = dto.IsCompleted;
            item.CompletedAt = dto.IsCompleted ? DateTimeOffset.UtcNow : null;
            workflow.Stage = CalculateStage(workflow.Items);
            workflow.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            return ToDto(workflow);
        }

        public async Task<bool> ArchiveAsync(int id, CancellationToken cancellationToken = default)
        {
            var workflow = await FindMoveInAsync(id, cancellationToken);
            if (workflow == null) return false;

            workflow.IsArchived = true;
            workflow.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        private async Task<Workflow?> FindMoveInAsync(int id, CancellationToken cancellationToken) =>
            await _context.Workflows
                .Include(w => w.Items)
                .FirstOrDefaultAsync(w => w.Id == id && w.Type == WorkflowType.MoveIn && !w.IsArchived, cancellationToken);

        private static WorkflowStage CalculateStage(IEnumerable<WorkflowChecklistItem> items)
        {
            var byKey = items.ToDictionary(i => i.Key, i => i.IsCompleted);

            if (!byKey.GetValueOrDefault("send-declaration-email"))
                return WorkflowStage.DeclarationEmail;

            if (!byKey.GetValueOrDefault("receive-declaration-reply"))
                return WorkflowStage.WaitingDeclarationReply;

            if (!byKey.GetValueOrDefault("send-draft-pack"))
                return WorkflowStage.DraftPack;

            if (!byKey.GetValueOrDefault("receive-signed-agreement") ||
                !byKey.GetValueOrDefault("create-tenancy-profile"))
                return WorkflowStage.SignedAndTenancySetup;

            return items.All(i => i.IsCompleted)
                ? WorkflowStage.Completed
                : WorkflowStage.MoveInAndWrapUp;
        }

        private static WorkflowDto ToDto(Workflow workflow) => new()
        {
            Id = workflow.Id,
            Type = (int)workflow.Type,
            Address = workflow.Address,
            Stage = (int)workflow.Stage,
            MoveInAppointmentAt = workflow.MoveInAppointmentAt?.ToString("O"),
            Notes = workflow.Notes,
            IsArchived = workflow.IsArchived,
            CreatedAt = workflow.CreatedAt.ToString("O"),
            UpdatedAt = workflow.UpdatedAt.ToString("O"),
            Items = workflow.Items
                .OrderBy(i => i.DisplayOrder)
                .Select(i => new WorkflowChecklistItemDto
                {
                    Id = i.Id,
                    Key = i.Key,
                    Label = i.Label,
                    Stage = (int)i.Stage,
                    DisplayOrder = i.DisplayOrder,
                    IsCompleted = i.IsCompleted,
                    CompletedAt = i.CompletedAt?.ToString("O")
                })
                .ToList()
        };

        private static string NormalizeAddressDisplay(string address) =>
            string.Join(' ', address.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries));

        private static string NormalizeAddressKey(string address) =>
            NormalizeAddressDisplay(address).ToUpperInvariant();

        private static DateTimeOffset? ParseOptionalDate(string? iso) =>
            string.IsNullOrWhiteSpace(iso)
                ? null
                : DateTimeOffset.Parse(iso, null, System.Globalization.DateTimeStyles.RoundtripKind);

        private sealed record MoveInChecklistDefinition(string Key, string Label, WorkflowStage Stage);
    }
}
