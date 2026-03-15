using InspectionApi.Data;
using InspectionApi.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// 1. 注入 PostgreSQL 数据库连接 (Supabase)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("数据库连接字符串未配置");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. 注册服务层
builder.Services.AddScoped<IInspectionTaskService, InspectionTaskService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IGoogleSyncService, GoogleSyncService>();
builder.Services.AddHostedService<DailySyncBackgroundService>();

// 3. 允许跨域 (CORS) - 允许前端访问
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// 4. 配置 Controllers 和 JSON 序列化选项（使用 camelCase，枚举以整数传输）
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 4. 验证数据库连接
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        var canConnect = await db.Database.CanConnectAsync();
        if (canConnect)
        {
            logger.LogInformation("✅ Connected to Supabase PostgreSQL");

            // Create TaskTypes table and seed defaults if not present
            await db.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS ""TaskTypes"" (
                    ""Id""           integer               NOT NULL,
                    ""Name""         character varying(50) NOT NULL,
                    ""Color""        character varying(30) NOT NULL DEFAULT 'default',
                    ""DisplayOrder"" integer               NOT NULL DEFAULT 0,
                    CONSTRAINT ""PK_TaskTypes"" PRIMARY KEY (""Id"")
                );
                INSERT INTO ""TaskTypes"" (""Id"", ""Name"", ""Color"", ""DisplayOrder"") VALUES
                    (0, 'Move In',  'cyan',    0),
                    (1, 'Move Out', 'gold',    1),
                    (2, 'Routine',  'green',   2),
                    (3, 'Other',    'default', 3)
                ON CONFLICT (""Id"") DO NOTHING;
            ");
            logger.LogInformation("✅ TaskTypes table ready");
        }
        else
        {
            logger.LogWarning("⚠️ Cannot connect to database");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Database connection failed");
        logger.LogWarning("Application will continue but database features may be unavailable");
    }
}

// 5. 全局异常处理中间件
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var exFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        if (exFeature?.Error != null)
            logger.LogError(exFeature.Error, "未处理的异常: {Path}", context.Request.Path);

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { message = "服务器内部错误，请稍后重试" });
    });
});

// 开启 Swagger (方便测试接口)
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowReactApp"); // 启用跨域
app.UseAuthorization();
app.MapControllers();

app.Run();