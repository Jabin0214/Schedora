namespace InspectionApi.Services
{
    public class DailySyncBackgroundService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<DailySyncBackgroundService> _logger;

        public DailySyncBackgroundService(
            IServiceScopeFactory scopeFactory,
            IConfiguration config,
            ILogger<DailySyncBackgroundService> logger)
        {
            _scopeFactory = scopeFactory;
            _config = config;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("每日同步后台服务已启动");

            while (!stoppingToken.IsCancellationRequested)
            {
                var delay = CalculateDelayUntilNextSync();
                _logger.LogInformation("下次 Google 同步将在 {Delay:hh\\:mm\\:ss} 后执行", delay);

                await Task.Delay(delay, stoppingToken);

                if (stoppingToken.IsCancellationRequested) break;

                await RunSyncAsync();
            }
        }

        private TimeSpan CalculateDelayUntilNextSync()
        {
            var syncHour = _config.GetValue<int>("Google:DailySyncHour", 8);
            var now = DateTime.Now;
            var nextSync = DateTime.Today.AddHours(syncHour);

            if (now >= nextSync)
                nextSync = nextSync.AddDays(1);

            return nextSync - now;
        }

        private async Task RunSyncAsync()
        {
            _logger.LogInformation("开始每日 Google 全量同步...");
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var googleSync = scope.ServiceProvider.GetRequiredService<IGoogleSyncService>();

                await googleSync.SyncAllTasksToCalendarAsync();
                await googleSync.SyncAllTasksToSheetsAsync();

                _logger.LogInformation("每日 Google 全量同步完成");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "每日 Google 同步失败");
            }
        }
    }
}
