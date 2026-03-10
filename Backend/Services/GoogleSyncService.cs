using Google.Apis.Auth.OAuth2;
using Google.Apis.Calendar.v3;
using Google.Apis.Calendar.v3.Data;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Google.Apis.Sheets.v4.Data;
using InspectionApi.Data;
using InspectionApi.Models;
using Microsoft.EntityFrameworkCore;

namespace InspectionApi.Services
{
    public class GoogleSyncService : IGoogleSyncService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;
        private readonly ILogger<GoogleSyncService> _logger;

        private static readonly string[] CalendarScopes = [CalendarService.Scope.Calendar];
        private static readonly string[] SheetsScopes = [SheetsService.Scope.Spreadsheets];

        private static readonly Dictionary<InspectionType, string> TypeLabels = new()
        {
            { InspectionType.MoveIn,  "入住检查" },
            { InspectionType.MoveOut, "退房检查" },
            { InspectionType.Routine, "例行检查" },
            { InspectionType.Other,   "其他" },
        };

        public GoogleSyncService(AppDbContext context, IConfiguration config, ILogger<GoogleSyncService> logger)
        {
            _context = context;
            _config = config;
            _logger = logger;
        }

        // ── 认证 ──────────────────────────────────────────────────────────────

        private CalendarService BuildCalendarService()
        {
            var credPath = _config["Google:CredentialsPath"] ?? "google-credentials.json";
            var credential = GoogleCredential
                .FromFile(credPath)
                .CreateScoped(CalendarScopes);

            return new CalendarService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Schedora"
            });
        }

        private SheetsService BuildSheetsService()
        {
            var credPath = _config["Google:CredentialsPath"] ?? "google-credentials.json";
            var credential = GoogleCredential
                .FromFile(credPath)
                .CreateScoped(SheetsScopes);

            return new SheetsService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "Schedora"
            });
        }

        // ── Calendar ─────────────────────────────────────────────────────────

        /// <summary>将任务 ID 转换为确定性的 Calendar Event ID（Google 要求小写字母+数字，5-1024字符）</summary>
        private static string ToEventId(int taskId) => $"schedora{taskId:D8}";

        private static readonly TimeZoneInfo NzTimeZone =
            TimeZoneInfo.FindSystemTimeZoneById("Pacific/Auckland");

        private static Event BuildEvent(InspectionTask task)
        {
            var label = TypeLabels.TryGetValue(task.Type, out var l) ? l : "检查";
            var address = task.Property?.Address ?? $"物业#{task.PropertyId}";
            // 数据库存 UTC，转换为 NZ 本地时间后再推送给 Calendar
            var startUtc = DateTime.SpecifyKind(task.ScheduledAt ?? DateTime.UtcNow, DateTimeKind.Utc);
            var startNz = TimeZoneInfo.ConvertTimeFromUtc(startUtc, NzTimeZone);
            var nzOffset = NzTimeZone.GetUtcOffset(startNz);

            return new Event
            {
                Id = ToEventId(task.Id),
                Summary = $"[{label}] {address}",
                Description = $"类型：{label}\n是否收费：{(task.IsBillable ? "是" : "否")}\n备注：{task.Notes ?? "-"}",
                Start = new EventDateTime { DateTimeDateTimeOffset = new DateTimeOffset(startNz, nzOffset), TimeZone = "Pacific/Auckland" },
                End   = new EventDateTime { DateTimeDateTimeOffset = new DateTimeOffset(startNz.AddMinutes(30), nzOffset), TimeZone = "Pacific/Auckland" },
            };
        }

        public async Task SyncTaskToCalendarAsync(InspectionTask task, string action)
        {
            var calendarId = _config["Google:CalendarId"]!;
            try
            {
                var service = BuildCalendarService();
                var eventId = ToEventId(task.Id);

                switch (action)
                {
                    case "create":
                        // 若任务无时间则跳过（日历事件必须有时间）
                        if (task.ScheduledAt == null) return;
                        var newEvent = BuildEvent(task);
                        await service.Events.Insert(newEvent, calendarId).ExecuteAsync();
                        _logger.LogInformation("Calendar 创建事件成功, 任务 ID: {Id}", task.Id);
                        break;

                    case "update":
                        if (task.ScheduledAt == null)
                        {
                            // 时间被清空 → 删除日历事件
                            await TryDeleteEventAsync(service, calendarId, eventId);
                        }
                        else
                        {
                            var updatedEvent = BuildEvent(task);
                            // 尝试更新，如事件不存在则改为插入
                            try
                            {
                                await service.Events.Update(updatedEvent, calendarId, eventId).ExecuteAsync();
                            }
                            catch
                            {
                                await service.Events.Insert(updatedEvent, calendarId).ExecuteAsync();
                            }
                            _logger.LogInformation("Calendar 更新事件成功, 任务 ID: {Id}", task.Id);
                        }
                        break;

                    case "delete":
                        await TryDeleteEventAsync(service, calendarId, eventId);
                        break;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Calendar 同步失败, 任务 ID: {Id}, 操作: {Action}", task.Id, action);
            }
        }

        public async Task SyncAllTasksToCalendarAsync()
        {
            var calendarId = _config["Google:CalendarId"]!;
            var tasks = await _context.InspectionTasks
                .Include(t => t.Property)
                .Where(t => t.ScheduledAt != null)
                .ToListAsync();

            var service = BuildCalendarService();
            int created = 0, updated = 0;

            foreach (var task in tasks)
            {
                try
                {
                    var ev = BuildEvent(task);
                    var eventId = ToEventId(task.Id);
                    try
                    {
                        await service.Events.Update(ev, calendarId, eventId).ExecuteAsync();
                        updated++;
                    }
                    catch
                    {
                        await service.Events.Insert(ev, calendarId).ExecuteAsync();
                        created++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "全量 Calendar 同步失败, 任务 ID: {Id}", task.Id);
                }
            }

            _logger.LogInformation("Calendar 全量同步完成: 新增 {Created}, 更新 {Updated}", created, updated);
        }

        private static async Task TryDeleteEventAsync(CalendarService service, string calendarId, string eventId)
        {
            try
            {
                await service.Events.Delete(calendarId, eventId).ExecuteAsync();
            }
            catch
            {
                // 事件不存在时忽略
            }
        }

        // ── Sheets ───────────────────────────────────────────────────────────

        public async Task SyncAllTasksToSheetsAsync()
        {
            var sheetId = _config["Google:SheetId"]!;
            var tasks = await _context.InspectionTasks
                .Include(t => t.Property)
                .OrderBy(t => t.ScheduledAt)
                .ToListAsync();

            var service = BuildSheetsService();
            var now = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");

            var rows = new List<IList<object>>
            {
                new List<object> {"物业地址", "计划时间", "检查类型", "是否收费", "备注"}
            };

            foreach (var task in tasks)
            {
                string timeDisplay = "-";
                if (task.ScheduledAt.HasValue)
                {
                    var nzTime = TimeZoneInfo.ConvertTimeFromUtc(
                        DateTime.SpecifyKind(task.ScheduledAt.Value, DateTimeKind.Utc),
                        NzTimeZone);
                    timeDisplay = nzTime.ToString("yyyy-MM-dd HH:mm");
                }

                rows.Add(new List<object>
                {
                    task.Property?.Address ?? $"物业#{task.PropertyId}",
                    timeDisplay,
                    TypeLabels.TryGetValue(task.Type, out var l) ? l : "其他",
                    task.IsBillable ? "是" : "否",
                    task.Notes ?? ""
                });
            }

            // 清空再写入
            var clearRequest = service.Spreadsheets.Values.Clear(
                new ClearValuesRequest(), sheetId, "工作表1");
            await clearRequest.ExecuteAsync();

            var updateRequest = service.Spreadsheets.Values.Update(
                new ValueRange { Values = rows },
                sheetId, "工作表1!A1");
            updateRequest.ValueInputOption =
                SpreadsheetsResource.ValuesResource.UpdateRequest.ValueInputOptionEnum.USERENTERED;
            await updateRequest.ExecuteAsync();

            _logger.LogInformation("Sheets 同步完成，共写入 {Count} 条任务", tasks.Count);
        }
    }
}
