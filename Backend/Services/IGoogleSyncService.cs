using InspectionApi.Models;

namespace InspectionApi.Services
{
    public interface IGoogleSyncService
    {
        /// <summary>
        /// 同步单个任务到 Google Calendar。action: "create" | "update" | "delete"
        /// </summary>
        Task SyncTaskToCalendarAsync(InspectionTask task, string action);

        /// <summary>
        /// 将所有任务全量写入 Google Sheets
        /// </summary>
        Task SyncAllTasksToSheetsAsync();

        /// <summary>
        /// 将所有任务全量同步到 Google Calendar
        /// </summary>
        Task SyncAllTasksToCalendarAsync();
    }
}
