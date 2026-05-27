# Gmail Recent Mail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only Mail page that shows Gmail inbox messages from the last 1, 3, or 7 days.

**Architecture:** Add a narrow authenticated backend endpoint backed by Gmail API `gmail.readonly`, returning sanitized email summaries only. Because the mailbox is a Google Workspace company-domain account, the backend uses the existing service-account credential with domain-wide delegation and impersonates the configured `Google:DelegatedUserEmail`. Add a React/Ant Design page that calls the endpoint through the existing axios instance and follows current Schedora navigation and visual patterns.

**Tech Stack:** ASP.NET Core 9, Google.Apis.Gmail.v1, xUnit, React 19, TypeScript, Ant Design 6, Vite.

---

## File Structure

- Create `Backend/Models/DTOs/GmailDtos.cs`: response DTOs for Gmail summary data.
- Create `Backend/Services/IGmailService.cs`: narrow service contract.
- Create `Backend/Services/GmailService.cs`: Gmail credential loading, query, message mapping.
- Create `Backend/Controllers/GmailController.cs`: JWT-protected API endpoint and `days` normalization.
- Modify `Backend/InspectionApi.csproj`: add `Google.Apis.Gmail.v1`.
- Modify `Backend/Program.cs`: register `IGmailService`.
- Create `Backend.Tests/GmailControllerTests.cs`: controller validation tests using a fake Gmail service.
- Modify `Frontend/src/config/api.ts`: add Gmail endpoint.
- Create `Frontend/src/pages/MailPage.tsx`: recent mail page.
- Modify `Frontend/src/App.tsx`: add Mail route and sidebar item.

## Task 1: Backend DTOs and Controller Validation

**Files:**
- Create: `Backend/Models/DTOs/GmailDtos.cs`
- Create: `Backend/Services/IGmailService.cs`
- Create: `Backend/Controllers/GmailController.cs`
- Test: `Backend.Tests/GmailControllerTests.cs`

- [ ] **Step 1: Write controller tests**

```csharp
using InspectionApi.Controllers;
using InspectionApi.Models.DTOs;
using InspectionApi.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace Backend.Tests;

public class GmailControllerTests
{
    [Theory]
    [InlineData(null, 3)]
    [InlineData(1, 1)]
    [InlineData(3, 3)]
    [InlineData(7, 7)]
    [InlineData(0, 3)]
    [InlineData(14, 3)]
    public async Task RecentNormalizesDays(int? days, int expectedDays)
    {
        var service = new FakeGmailService();
        var controller = new GmailController(service, NullLogger<GmailController>.Instance);

        var result = await controller.Recent(days);

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(expectedDays, service.LastDays);
    }

    private sealed class FakeGmailService : IGmailService
    {
        public int LastDays { get; private set; }

        public Task<IReadOnlyList<GmailMessageSummaryDto>> GetRecentMessagesAsync(int days, CancellationToken cancellationToken = default)
        {
            LastDays = days;
            IReadOnlyList<GmailMessageSummaryDto> messages =
            [
                new GmailMessageSummaryDto("m1", "Subject", "sender@example.com", DateTimeOffset.UtcNow, "Snippet", true)
            ];
            return Task.FromResult(messages);
        }
    }
}
```

- [ ] **Step 2: Run the failing test**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter GmailControllerTests`

Expected: fail because `GmailController`, `IGmailService`, and `GmailMessageSummaryDto` do not exist.

- [ ] **Step 3: Add DTOs**

```csharp
namespace InspectionApi.Models.DTOs;

public record GmailMessageSummaryDto(
    string Id,
    string Subject,
    string From,
    DateTimeOffset ReceivedAt,
    string Snippet,
    bool IsUnread);
```

- [ ] **Step 4: Add service interface**

```csharp
using InspectionApi.Models.DTOs;

namespace InspectionApi.Services;

public interface IGmailService
{
    Task<IReadOnlyList<GmailMessageSummaryDto>> GetRecentMessagesAsync(
        int days,
        CancellationToken cancellationToken = default);
}
```

- [ ] **Step 5: Add controller**

```csharp
using InspectionApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace InspectionApi.Controllers;

[ApiController]
[Route("api/gmail")]
[Authorize]
public class GmailController : ControllerBase
{
    private static readonly HashSet<int> SupportedDays = [1, 3, 7];
    private readonly IGmailService _gmailService;
    private readonly ILogger<GmailController> _logger;

    public GmailController(IGmailService gmailService, ILogger<GmailController> logger)
    {
        _gmailService = gmailService;
        _logger = logger;
    }

    [HttpGet("recent")]
    public async Task<IActionResult> Recent([FromQuery] int? days, CancellationToken cancellationToken = default)
    {
        var normalizedDays = days.HasValue && SupportedDays.Contains(days.Value) ? days.Value : 3;
        _logger.LogInformation("Fetching recent Gmail messages for {Days} days", normalizedDays);

        var messages = await _gmailService.GetRecentMessagesAsync(normalizedDays, cancellationToken);
        return Ok(messages);
    }
}
```

- [ ] **Step 6: Run controller tests**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter GmailControllerTests`

Expected: pass.

## Task 2: Gmail API Service

**Files:**
- Modify: `Backend/InspectionApi.csproj`
- Create: `Backend/Services/GmailService.cs`
- Modify: `Backend/Program.cs`

- [ ] **Step 1: Add Gmail API package**

Add this package reference next to the existing Google API packages:

```xml
<PackageReference Include="Google.Apis.Gmail.v1" Version="1.69.0.3667" />
```

- [ ] **Step 2: Implement GmailService**

```csharp
using Google.Apis.Auth.OAuth2;
using Google.Apis.Gmail.v1;
using Google.Apis.Gmail.v1.Data;
using Google.Apis.Services;
using InspectionApi.Models.DTOs;
using GoogleGmailService = Google.Apis.Gmail.v1.GmailService;

namespace InspectionApi.Services;

public class GmailService : IGmailService
{
    private static readonly string[] GmailScopes = [GoogleGmailService.Scope.GmailReadonly];
    private readonly IConfiguration _config;
    private readonly ILogger<GmailService> _logger;

    public GmailService(IConfiguration config, ILogger<GmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<IReadOnlyList<GmailMessageSummaryDto>> GetRecentMessagesAsync(int days, CancellationToken cancellationToken = default)
    {
        try
        {
            var service = BuildService();
            var request = service.Users.Messages.List("me");
            request.Q = $"in:inbox newer_than:{days}d";
            request.MaxResults = 50;

            var list = await request.ExecuteAsync(cancellationToken);
            if (list.Messages == null || list.Messages.Count == 0)
                return [];

            var results = new List<GmailMessageSummaryDto>();
            foreach (var item in list.Messages)
            {
                var get = service.Users.Messages.Get("me", item.Id);
                get.Format = UsersResource.MessagesResource.GetRequest.FormatEnum.Metadata;
                get.MetadataHeaders = ["Subject", "From", "Date"];

                var message = await get.ExecuteAsync(cancellationToken);
                results.Add(MapMessage(message));
            }

            return results
                .OrderByDescending(m => m.ReceivedAt)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch Gmail messages");
            throw new InvalidOperationException("Gmail 读取失败。请确认 Gmail API 已启用，并且 Google 凭据包含 gmail.readonly 权限。", ex);
        }
    }

    private GoogleCredential LoadCredential()
    {
        var delegatedUserEmail = _config["Google:DelegatedUserEmail"];
        if (string.IsNullOrWhiteSpace(delegatedUserEmail))
            throw new InvalidOperationException("Google:DelegatedUserEmail is not configured");

        var credJson = _config["Google:CredentialsJson"];
        var credential = !string.IsNullOrWhiteSpace(credJson)
            ? GoogleCredential.FromJson(credJson)
            : GoogleCredential.FromFile(_config["Google:CredentialsPath"] ?? "google-credentials.json");

        return credential.CreateScoped(GmailScopes).CreateWithUser(delegatedUserEmail);
    }

    private GoogleGmailService BuildService()
    {
        return new GoogleGmailService(new BaseClientService.Initializer
        {
            HttpClientInitializer = LoadCredential(),
            ApplicationName = "Schedora"
        });
    }

    private static GmailMessageSummaryDto MapMessage(Message message)
    {
        var headers = message.Payload?.Headers ?? [];
        var subject = Header(headers, "Subject");
        var from = Header(headers, "From");
        var dateText = Header(headers, "Date");
        var receivedAt = DateTimeOffset.TryParse(dateText, out var parsed)
            ? parsed
            : DateTimeOffset.FromUnixTimeMilliseconds(message.InternalDate ?? 0);
        var isUnread = message.LabelIds?.Contains("UNREAD") == true;

        return new GmailMessageSummaryDto(
            message.Id ?? "",
            string.IsNullOrWhiteSpace(subject) ? "(No subject)" : subject,
            string.IsNullOrWhiteSpace(from) ? "(Unknown sender)" : from,
            receivedAt,
            message.Snippet ?? "",
            isUnread);
    }

    private static string Header(IList<MessagePartHeader> headers, string name)
    {
        return headers.FirstOrDefault(h => string.Equals(h.Name, name, StringComparison.OrdinalIgnoreCase))?.Value ?? "";
    }
}
```

- [ ] **Step 3: Register service**

Add this line in `Backend/Program.cs` near the existing scoped services:

```csharp
builder.Services.AddScoped<IGmailService, GmailService>();
```

- [ ] **Step 4: Build backend**

Run: `dotnet build Schedora.sln`

Expected: build succeeds.

## Task 3: Frontend Mail Page

**Files:**
- Modify: `Frontend/src/config/api.ts`
- Create: `Frontend/src/pages/MailPage.tsx`
- Modify: `Frontend/src/App.tsx`

- [ ] **Step 1: Add API endpoint**

```ts
gmailRecent: `${API_BASE_URL}/gmail/recent`,
```

- [ ] **Step 2: Create MailPage**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Segmented, Spin, Table, Tag, Typography, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api, { isAxiosError } from '../api';
import { API_ENDPOINTS } from '../config/api';
import { IndTitle } from '../components/shared';

type MailWindow = 1 | 3 | 7;

type GmailMessageSummary = {
  id: string;
  subject: string;
  from: string;
  receivedAt: string;
  snippet: string;
  isUnread: boolean;
};

const MailPage: React.FC = () => {
  const [days, setDays] = useState<MailWindow>(3);
  const [messages, setMessages] = useState<GmailMessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMail = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<GmailMessageSummary[]>(API_ENDPOINTS.gmailRecent, {
        params: { days },
      });
      setMessages(response.data);
    } catch (err) {
      const fallback = 'Failed to load Gmail messages';
      const detail = isAxiosError(err) ? err.response?.data?.message : null;
      const text = detail ?? fallback;
      setError(text);
      message.error(text);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMail();
  }, [days]);

  const columns = useMemo(() => [
    {
      title: 'From',
      dataIndex: 'from',
      width: 260,
      render: (value: string, record: GmailMessageSummary) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {record.isUnread && <Tag color="blue">New</Tag>}
          <Typography.Text ellipsis style={{ maxWidth: 200, fontWeight: record.isUnread ? 600 : 400 }}>
            {value}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      render: (value: string, record: GmailMessageSummary) => (
        <div style={{ minWidth: 0 }}>
          <Typography.Text ellipsis style={{ display: 'block', fontWeight: record.isUnread ? 600 : 400 }}>
            {value}
          </Typography.Text>
          <Typography.Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12 }}>
            {record.snippet}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: 'Received',
      dataIndex: 'receivedAt',
      width: 170,
      render: (value: string) => dayjs(value).format('DD MMM YYYY HH:mm'),
    },
  ], []);

  return (
    <div>
      <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #E9E9E7', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <IndTitle>Mail</IndTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Segmented
            size="small"
            value={days}
            options={[
              { label: '1 day', value: 1 },
              { label: '3 days', value: 3 },
              { label: '7 days', value: 7 },
            ]}
            onChange={(value) => setDays(value as MailWindow)}
          />
          <Button size="small" icon={<ReloadOutlined />} onClick={fetchMail} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      <Spin spinning={loading}>
        <Table
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={messages}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="No recent mail" /> }}
        />
      </Spin>
    </div>
  );
};

export default MailPage;
```

- [ ] **Step 3: Add route and navigation**

In `Frontend/src/App.tsx`, import `MailOutlined` and `MailPage`, add selected key logic for `/mail`, add a sidebar item, and add a route:

```tsx
import { MailOutlined } from '@ant-design/icons';
import MailPage from './pages/MailPage';
```

```tsx
if (location.pathname === '/mail') return '8';
```

```tsx
{ key: '8', icon: <MailOutlined />, label: <Link to="/mail">Mail</Link> },
```

```tsx
<Route path="/mail" element={<MailPage />} />
```

- [ ] **Step 4: Build frontend**

Run: `cd Frontend && npm run build`

Expected: TypeScript and Vite build succeed.

## Task 4: Configuration Notes and Verification

**Files:**
- Modify: `README.md` if configuration guidance is not already present.

- [ ] **Step 1: Document required Gmail setup**

Add a concise Gmail setup section:

```markdown
### Gmail recent mail

The Mail page uses the Gmail API from the backend with read-only access.

Required Google setup:

- Enable Gmail API in the same Google Cloud project used by Schedora.
- Enable domain-wide delegation on the service account.
- In Google Admin Console, authorize the service account client ID for this scope: `https://www.googleapis.com/auth/gmail.readonly`.
- Set `Google:DelegatedUserEmail` to the company mailbox Schedora should read.
- Include Gmail read-only scope: `https://www.googleapis.com/auth/gmail.readonly`.
- Keep local secrets in `Backend/appsettings.local.json` or environment variables, not in committed files.
```

- [ ] **Step 2: Run full verification**

Run:

```bash
dotnet test Schedora.sln
cd Frontend && npm run build
```

Expected: backend tests pass and frontend build succeeds.

- [ ] **Step 3: Browser smoke check**

Start the app through the existing local script or normal dev servers, log in, open `/mail`, switch 1/3/7 day filters, and verify the page remains usable if the backend returns a setup error.

## Self-Review

- Spec coverage: backend endpoint, Gmail read-only scope, 1/3/7 day filters, Mail route, loading/empty/error states, and no database persistence are covered.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: DTO property names use PascalCase in C# and serialize to camelCase for TypeScript consumers, matching existing JSON settings.
