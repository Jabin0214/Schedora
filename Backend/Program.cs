using InspectionApi.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// 1. 注入 SQLite 数据库连接
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=inspection.db";
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(connectionString));

// 2. 允许跨域 (CORS) - 允许前端 localhost:5173 访问
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.WithOrigins("http://localhost:5173")
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// 3. 配置 Controllers 和 JSON 序列化选项（使用 camelCase）
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// 4. 自动创建/迁移数据库（开发环境）
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // 确保数据库和表存在
}

// 5. 全局异常处理中间件
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        var error = new
        {
            success = false,
            message = "服务器内部错误，请稍后重试",
            timestamp = DateTime.UtcNow
        };

        await context.Response.WriteAsJsonAsync(error);
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