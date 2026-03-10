using InspectionApi.Services;
using Microsoft.AspNetCore.Mvc;

namespace InspectionApi.Controllers
{
    [ApiController]
    [Route("api/googlesync")]
    public class GoogleSyncController : ControllerBase
    {
        private readonly IGoogleSyncService _googleSync;
        private readonly ILogger<GoogleSyncController> _logger;

        public GoogleSyncController(IGoogleSyncService googleSync, ILogger<GoogleSyncController> logger)
        {
            _googleSync = googleSync;
            _logger = logger;
        }

        /// <summary>手动触发全量 Calendar 同步</summary>
        [HttpPost("calendar")]
        public async Task<IActionResult> SyncCalendar()
        {
            _logger.LogInformation("手动触发 Calendar 同步");
            await _googleSync.SyncAllTasksToCalendarAsync();
            return Ok(new { message = "Google Calendar 同步完成" });
        }

        /// <summary>手动触发 Sheets 同步</summary>
        [HttpPost("sheets")]
        public async Task<IActionResult> SyncSheets()
        {
            _logger.LogInformation("手动触发 Sheets 同步");
            await _googleSync.SyncAllTasksToSheetsAsync();
            return Ok(new { message = "Google Sheets 同步完成" });
        }

        /// <summary>手动触发全部同步（Calendar + Sheets）</summary>
        [HttpPost("all")]
        public async Task<IActionResult> SyncAll()
        {
            _logger.LogInformation("手动触发全量同步");
            await _googleSync.SyncAllTasksToCalendarAsync();
            await _googleSync.SyncAllTasksToSheetsAsync();
            return Ok(new { message = "Google Calendar 和 Sheets 同步完成" });
        }
    }
}
