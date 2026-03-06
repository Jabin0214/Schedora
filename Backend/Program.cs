using InspectionApi.Data;
using InspectionApi.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// 1. 注入 PostgreSQL 数据库连接 (Supabase)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("数据库连接字符串未配置");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions => 
    {
        // Supabase Pooler (Transaction Mode) 不支持 prepared statements
        npgsqlOptions.MaxBatchSize(1);
    }));

// 2. 注册服务层
builder.Services.AddScoped<IInspectionTaskService, InspectionTaskService>();
builder.Services.AddScoped<ISundryTaskService, SundryTaskService>();
builder.Services.AddScoped<IReportService, ReportService>();

// 3. 允许跨域 (CORS) - 允许前端访问
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// 4. 配置 Controllers 和 JSON 序列化选项（使用 camelCase 和字符串枚举）
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        // 配置枚举以字符串形式序列化/反序列化（不使用命名策略，保持原始 PascalCase）
        // 因为前端发送的是 "MoveIn", "MoveOut" 等 PascalCase 格式
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
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
        // 验证数据库是否可以连接
        var canConnect = await db.Database.CanConnectAsync();
        if (canConnect)
        {
            logger.LogInformation("✅ 成功连接到 Supabase PostgreSQL 数据库！");
        }
        else
        {
            logger.LogWarning("⚠️ 无法连接到数据库");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ 数据库连接失败");
        logger.LogWarning("应用将继续运行，但数据库功能可能不可用");
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