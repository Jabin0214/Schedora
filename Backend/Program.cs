using System.Text;
using System.Text.Json;
using InspectionApi.Data;
using InspectionApi.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddSimpleConsole(o => o.TimestampFormat = "yyyy-MM-dd HH:mm:ss ");

// 加载本地敏感配置（不提交到 git，优先级高于 appsettings.json）
builder.Configuration.AddJsonFile("appsettings.local.json", optional: true, reloadOnChange: false);

// 1. 注入 PostgreSQL 数据库连接 (Supabase)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("数据库连接字符串未配置");
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

// 2. 注册服务层
builder.Services.AddScoped<IInspectionTaskService, InspectionTaskService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IGoogleSyncService, GoogleSyncService>();
builder.Services.AddHttpClient<IAiInspectionService, AiInspectionService>();
builder.Services.AddScoped<IAiTaskDraftService, AiTaskDraftService>();
builder.Services.AddHttpClient<IAiTaskDraftExtractor, AiTaskDraftExtractor>();
builder.Services.AddHostedService<DailySyncBackgroundService>();

// 3. 允许跨域 (CORS) - 允许前端访问
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

// 3.5 JWT 认证
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrEmpty(jwtSecret))
    throw new InvalidOperationException("JWT Secret 未配置。请在 appsettings.local.json 中设置 Jwt:Secret");

builder.Services.Configure<HostOptions>(options =>
{
    options.BackgroundServiceExceptionBehavior = BackgroundServiceExceptionBehavior.Ignore;
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "Schedora",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "SchedoraApp",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
        };
    });

// 4. 配置 Controllers 和 JSON 序列化选项（使用 camelCase，枚举以整数传输）
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "JWT token from /api/auth/login"
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

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

            // Create template feature tables and seed defaults if not present
            await db.Database.ExecuteSqlRawAsync(TemplatesStartupSql.Sql);
            logger.LogInformation("✅ Template tables ready");

            await db.Database.ExecuteSqlRawAsync(DatabaseStartupSql.TenantContactsTableSql);
            logger.LogInformation("✅ TenantContacts table ready");

            await db.Database.ExecuteSqlRawAsync(DatabaseStartupSql.PropertiesTableSql);
            logger.LogInformation("✅ Property condition column ready");

            // Add ParkingFee column if it doesn't exist yet
            await db.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE ""InspectionRecords""
                ADD COLUMN IF NOT EXISTS ""ParkingFee"" numeric(10,2) NULL;
            ");
            logger.LogInformation("✅ ParkingFee column ready");

            // Sync auto-increment sequences so INSERT never hits a PK conflict.
            // Uses a DO block so each table is independent and NULL-safe
            // (pg_get_serial_sequence returns NULL for IDENTITY columns on some PG versions;
            // the IF guard prevents setval(NULL,...) from crashing).
            await db.Database.ExecuteSqlRawAsync(DatabaseStartupSql.IdentitySequenceSyncSql);
            logger.LogInformation("✅ Sequences synced");
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
app.UseDefaultFiles();       // 托管前端静态文件（/ → index.html）
app.UseStaticFiles();
app.UseAuthentication();     // JWT 认证
app.UseAuthorization();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));
app.MapControllers();
app.MapFallbackToFile("index.html"); // SPA 路由回退

app.Run();
