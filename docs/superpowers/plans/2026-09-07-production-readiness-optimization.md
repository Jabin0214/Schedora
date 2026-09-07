# Schedora Production Readiness Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing Schedora application for production use while preserving its current APIs, database model, business workflows, and unfinished workspace changes.

**Architecture:** Keep the ASP.NET Core and React architecture intact. Add small security-focused backend units, centralize browser session expiry behavior, and replace the crowded mobile navigation with a focused primary bar plus an overflow menu; every behavior change is protected by a focused test before implementation.

**Tech Stack:** .NET 9, ASP.NET Core, xUnit, React 19, TypeScript 5.9, React Router 7, Axios, Ant Design 6, Vitest, Vite 7.

---

## File Map

- `Backend/Security/JwtSettings.cs`: validates and exposes JWT configuration.
- `Backend/Security/SecurityHeadersMiddleware.cs`: applies stable response security headers.
- `Backend/Program.cs`: composes validated JWT settings, login rate limiting, and security headers.
- `Backend/Controllers/AuthController.cs`: opts login into the named rate-limit policy and consumes validated JWT settings.
- `Backend/appsettings.json`: changes the default JWT lifetime to 24 hours.
- `Backend.Tests/JwtSettingsTests.cs`: JWT configuration regression tests.
- `Backend.Tests/SecurityHeadersMiddlewareTests.cs`: middleware header regression tests.
- `Backend.Tests/AuthControllerSecurityTests.cs`: verifies login remains anonymous and rate-limited.
- `Frontend/src/auth/session.ts`: owns session keys, clearing, and expiry notification.
- `Frontend/src/auth/session.test.ts`: session behavior tests.
- `Frontend/src/api.ts`: attaches the bearer token and delegates 401 cleanup to the session unit.
- `Frontend/src/contexts/AuthContext.tsx`: synchronizes React auth state with session expiry.
- `Frontend/src/navigation.tsx`: canonical route definitions and desktop/mobile groupings.
- `Frontend/src/navigation.test.ts`: route reachability and mobile grouping tests.
- `Frontend/src/App.tsx`: renders shared navigation, mobile More menu, skip link, and main-content focus target.
- `Frontend/src/App.css`: mobile navigation, focus, touch target, and reduced-motion styles.
- `Frontend/src/index.css`: global focus and motion safeguards.
- `Frontend/package.json` and `Frontend/package-lock.json`: patched Axios and React Router versions.
- `README.md` and `docs/DEVELOPMENT.md`: production security defaults and release checks.
- `Backend/wwwroot/**`: generated final frontend build.

### Task 1: Patch production dependencies

**Files:**
- Modify: `Frontend/package.json`
- Modify: `Frontend/package-lock.json`

- [ ] **Step 1: Capture the failing dependency audit**

Run: `cd Frontend && npm audit --omit=dev --audit-level=moderate`

Expected: non-zero exit with Axios, React Router, `follow-redirects`, and `form-data` advisories.

- [ ] **Step 2: Install fixed compatible releases**

Run: `cd Frontend && npm install axios@1.20.0 react-router-dom@7.18.3`

Expected: `package.json` pins compatible caret ranges and the lockfile resolves patched transitive packages.

- [ ] **Step 3: Verify the dependency boundary**

Run: `cd Frontend && npm audit --omit=dev --audit-level=moderate && npm run test && npm run lint && npm run build`

Expected: audit reports zero production vulnerabilities; tests, lint, and build pass.

- [ ] **Step 4: Commit dependency safety changes**

```bash
git add Frontend/package.json Frontend/package-lock.json Backend/wwwroot
git commit -m "fix(security): update vulnerable frontend dependencies"
```

### Task 2: Validate JWT settings and shorten the default session

**Files:**
- Create: `Backend/Security/JwtSettings.cs`
- Create: `Backend.Tests/JwtSettingsTests.cs`
- Modify: `Backend/Program.cs`
- Modify: `Backend/Controllers/AuthController.cs`
- Modify: `Backend/appsettings.json`

- [ ] **Step 1: Write failing JWT configuration tests**

```csharp
using InspectionApi.Security;
using Microsoft.Extensions.Configuration;

namespace Backend.Tests;

public class JwtSettingsTests
{
    private static IConfiguration Configuration(params (string Key, string? Value)[] values) =>
        new ConfigurationBuilder().AddInMemoryCollection(
            values.ToDictionary(item => item.Key, item => item.Value)).Build();

    [Fact]
    public void Load_RejectsShortSigningSecret()
    {
        var configuration = Configuration(("Jwt:Secret", "too-short"));
        var error = Assert.Throws<InvalidOperationException>(() => JwtSettings.Load(configuration));
        Assert.Contains("at least 32 characters", error.Message);
    }

    [Theory]
    [InlineData("0")]
    [InlineData("721")]
    [InlineData("not-a-number")]
    public void Load_RejectsExpiryOutsideOperationalRange(string expiry)
    {
        var configuration = Configuration(
            ("Jwt:Secret", new string('s', 32)),
            ("Jwt:ExpiryHours", expiry));
        Assert.Throws<InvalidOperationException>(() => JwtSettings.Load(configuration));
    }

    [Fact]
    public void Load_UsesExpectedDefaults()
    {
        var configuration = Configuration(("Jwt:Secret", new string('s', 32)));
        var settings = JwtSettings.Load(configuration);
        Assert.Equal("Schedora", settings.Issuer);
        Assert.Equal("SchedoraApp", settings.Audience);
        Assert.Equal(24, settings.ExpiryHours);
    }
}
```

- [ ] **Step 2: Run the tests and confirm the missing type failure**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter FullyQualifiedName~JwtSettingsTests`

Expected: compilation fails because `InspectionApi.Security.JwtSettings` does not exist.

- [ ] **Step 3: Implement validated settings**

```csharp
namespace InspectionApi.Security;

public sealed record JwtSettings(string Secret, string Issuer, string Audience, double ExpiryHours)
{
    public static JwtSettings Load(IConfiguration configuration)
    {
        var secret = configuration["Jwt:Secret"] ?? string.Empty;
        if (secret.Length < 32)
            throw new InvalidOperationException("JWT Secret must be at least 32 characters.");

        var rawExpiry = configuration["Jwt:ExpiryHours"];
        var expiry = rawExpiry is null ? 24 :
            double.TryParse(rawExpiry, out var parsed) ? parsed : double.NaN;
        if (!double.IsFinite(expiry) || expiry <= 0 || expiry > 720)
            throw new InvalidOperationException("JWT ExpiryHours must be greater than 0 and no more than 720.");

        return new JwtSettings(
            secret,
            configuration["Jwt:Issuer"] ?? "Schedora",
            configuration["Jwt:Audience"] ?? "SchedoraApp",
            expiry);
    }
}
```

Load the settings once in `Program.cs`, register the value as a singleton, and use its properties in `TokenValidationParameters`. Inject `JwtSettings` into `AuthController`, replacing direct configuration reads in `GenerateJwtToken`. Set `Jwt:ExpiryHours` to `24` in `Backend/appsettings.json`.

- [ ] **Step 4: Verify focused and full backend tests**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter FullyQualifiedName~JwtSettingsTests && dotnet test Backend.Tests/Backend.Tests.csproj`

Expected: all focused and full backend tests pass.

- [ ] **Step 5: Commit JWT hardening**

```bash
git add Backend/Security/JwtSettings.cs Backend.Tests/JwtSettingsTests.cs Backend/Program.cs Backend/Controllers/AuthController.cs Backend/appsettings.json
git commit -m "fix(auth): validate JWT security settings"
```

### Task 3: Rate-limit login attempts

**Files:**
- Create: `Backend.Tests/AuthControllerSecurityTests.cs`
- Modify: `Backend/Program.cs`
- Modify: `Backend/Controllers/AuthController.cs`

- [ ] **Step 1: Write the failing controller policy test**

```csharp
using System.Reflection;
using InspectionApi.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;

namespace Backend.Tests;

public class AuthControllerSecurityTests
{
    [Fact]
    public void Login_IsAnonymousAndUsesLoginRateLimitPolicy()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.Login))!;
        Assert.NotNull(method.GetCustomAttribute<AllowAnonymousAttribute>());
        var rateLimit = method.GetCustomAttribute<EnableRateLimitingAttribute>();
        Assert.NotNull(rateLimit);
        Assert.Equal("login", rateLimit.PolicyName);
    }
}
```

- [ ] **Step 2: Run the test and verify the missing attribute failure**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter FullyQualifiedName~AuthControllerSecurityTests`

Expected: the test fails because login has no `EnableRateLimitingAttribute`.

- [ ] **Step 3: Register and apply the limiter**

Add a partitioned fixed-window policy in `Program.cs` keyed by remote IP, with 5 permits per minute, no queue, automatic replenishment, status `429`, and a `Retry-After: 60` response header. Add `app.UseRateLimiter()` before authentication and decorate `Login` with `[EnableRateLimiting("login")]`.

```csharp
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (context, _) =>
    {
        context.HttpContext.Response.Headers.RetryAfter = "60";
        return ValueTask.CompletedTask;
    };
    options.AddPolicy("login", context => RateLimitPartition.GetFixedWindowLimiter(
        context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 5,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            AutoReplenishment = true,
        }));
});
```

- [ ] **Step 4: Verify backend tests**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj`

Expected: all backend tests pass.

- [ ] **Step 5: Commit login throttling**

```bash
git add Backend/Program.cs Backend/Controllers/AuthController.cs Backend.Tests/AuthControllerSecurityTests.cs
git commit -m "fix(auth): rate limit login attempts"
```

### Task 4: Apply production security headers

**Files:**
- Create: `Backend/Security/SecurityHeadersMiddleware.cs`
- Create: `Backend.Tests/SecurityHeadersMiddlewareTests.cs`
- Modify: `Backend/Program.cs`

- [ ] **Step 1: Write the failing middleware test**

```csharp
using InspectionApi.Security;
using Microsoft.AspNetCore.Http;

namespace Backend.Tests;

public class SecurityHeadersMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_AddsBrowserSecurityHeaders()
    {
        var context = new DefaultHttpContext();
        var middleware = new SecurityHeadersMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(context);
        Assert.Equal("nosniff", context.Response.Headers.XContentTypeOptions);
        Assert.Equal("DENY", context.Response.Headers.XFrameOptions);
        Assert.Equal("strict-origin-when-cross-origin", context.Response.Headers.ReferrerPolicy);
        Assert.Equal("camera=(), microphone=(), geolocation=()", context.Response.Headers.PermissionsPolicy);
    }
}
```

- [ ] **Step 2: Run the test and verify the missing type failure**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter FullyQualifiedName~SecurityHeadersMiddlewareTests`

Expected: compilation fails because `SecurityHeadersMiddleware` does not exist.

- [ ] **Step 3: Implement and register the middleware**

```csharp
namespace InspectionApi.Security;

public sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.Headers.XContentTypeOptions = "nosniff";
        context.Response.Headers.XFrameOptions = "DENY";
        context.Response.Headers.ReferrerPolicy = "strict-origin-when-cross-origin";
        context.Response.Headers.PermissionsPolicy = "camera=(), microphone=(), geolocation=()";
        await next(context);
    }
}
```

Register `app.UseMiddleware<SecurityHeadersMiddleware>()` before static files and endpoint mapping.

- [ ] **Step 4: Verify focused and full backend tests**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj --filter FullyQualifiedName~SecurityHeadersMiddlewareTests && dotnet test Backend.Tests/Backend.Tests.csproj`

Expected: all tests pass.

- [ ] **Step 5: Commit response hardening**

```bash
git add Backend/Security/SecurityHeadersMiddleware.cs Backend.Tests/SecurityHeadersMiddlewareTests.cs Backend/Program.cs
git commit -m "fix(security): add browser response headers"
```

### Task 5: Make browser session expiry deterministic

**Files:**
- Create: `Frontend/src/auth/session.ts`
- Create: `Frontend/src/auth/session.test.ts`
- Modify: `Frontend/src/api.ts`
- Modify: `Frontend/src/contexts/AuthContext.tsx`

- [ ] **Step 1: Write failing session tests**

```typescript
import { describe, expect, it, vi } from 'vitest';
import { clearSession, expireSession, TOKEN_KEY, USERNAME_KEY } from './session';

describe('session', () => {
  it('clears both persisted values', () => {
    const removeItem = vi.fn();
    clearSession({ removeItem } as unknown as Storage);
    expect(removeItem.mock.calls).toEqual([[TOKEN_KEY], [USERNAME_KEY]]);
  });

  it('notifies the application when a session expires', () => {
    const dispatchEvent = vi.fn();
    expireSession({ removeItem: vi.fn() } as unknown as Storage, { dispatchEvent } as unknown as Window);
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing module failure**

Run: `cd Frontend && npm run test -- src/auth/session.test.ts`

Expected: the test fails because `./session` does not exist.

- [ ] **Step 3: Implement the session unit and wire it once**

```typescript
export const TOKEN_KEY = 'schedora_token';
export const USERNAME_KEY = 'schedora_username';
export const SESSION_EXPIRED_EVENT = 'schedora:session-expired';

export const clearSession = (storage: Pick<Storage, 'removeItem'> = localStorage) => {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USERNAME_KEY);
};

export const expireSession = (
  storage: Pick<Storage, 'removeItem'> = localStorage,
  eventTarget: Pick<Window, 'dispatchEvent'> = window,
) => {
  clearSession(storage);
  eventTarget.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};
```

Use the exported keys in the API request interceptor and `AuthContext`. On `401`, call `expireSession()` instead of writing storage and navigation logic inside `api.ts`. In `AuthContext`, subscribe once to `SESSION_EXPIRED_EVENT`, clear in-memory user state, and navigate to `/login` with `replace: true`; remove the listener on cleanup. Create an `AbortController` for the initial `/api/auth/verify` request, pass its signal to Axios, and abort it in the effect cleanup so an unmounted provider cannot leave a stale request running.

- [ ] **Step 4: Verify the session tests and frontend suite**

Run: `cd Frontend && npm run test -- src/auth/session.test.ts && npm run test && npm run lint`

Expected: focused tests, full tests, and lint pass.

- [ ] **Step 5: Commit session handling**

```bash
git add Frontend/src/auth/session.ts Frontend/src/auth/session.test.ts Frontend/src/api.ts Frontend/src/contexts/AuthContext.tsx
git commit -m "fix(auth): synchronize expired browser sessions"
```

### Task 6: Replace crowded mobile navigation

**Files:**
- Create: `Frontend/src/navigation.tsx`
- Create: `Frontend/src/navigation.test.ts`
- Modify: `Frontend/src/App.tsx`
- Modify: `Frontend/src/App.css`

- [ ] **Step 1: Write failing navigation model tests**

```typescript
import { describe, expect, it } from 'vitest';
import { allNavigationItems, mobilePrimaryItems, mobileMoreItems, selectedNavigationKey } from './navigation';

describe('navigation model', () => {
  it('keeps every destination reachable exactly once on mobile', () => {
    const all = allNavigationItems.map(item => item.key).sort();
    const mobile = [...mobilePrimaryItems, ...mobileMoreItems].map(item => item.key).sort();
    expect(mobile).toEqual(all);
    expect(new Set(mobile).size).toBe(all.length);
  });

  it('limits the primary mobile bar to four items', () => {
    expect(mobilePrimaryItems).toHaveLength(4);
  });

  it('selects properties for property detail routes', () => {
    expect(selectedNavigationKey('/properties/42')).toBe('properties');
  });
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `cd Frontend && npm run test -- src/navigation.test.ts`

Expected: the test fails because `./navigation` does not exist.

- [ ] **Step 3: Implement a canonical navigation model**

Create typed route definitions with stable string keys for Properties, Tasks, Workflows, Inspect, Templates, Contacts, Calendar, History, and Config. Export all nine items, the first four operational items as `mobilePrimaryItems`, the remaining five as `mobileMoreItems`, and a `selectedNavigationKey(pathname)` helper that recognizes detail paths.

In `App.tsx`, map the same model to desktop Ant Design menu items. Render mobile primary links as four equal-width buttons and add a labelled `More` dropdown containing the five secondary links. Use React Router navigation for menu selections and expose `aria-current="page"` on the active mobile link.

- [ ] **Step 4: Add exact responsive constraints**

In `App.css`, make `.mobile-nav` a fixed four-column grid plus a 44-pixel More trigger, keep each target at least 44 pixels tall, hide it at desktop width, and reserve content spacing so the bar never overlaps the page. Remove any horizontal menu overflow rules that are no longer used.

- [ ] **Step 5: Verify navigation behavior**

Run: `cd Frontend && npm run test -- src/navigation.test.ts && npm run test && npm run lint && npm run build`

Expected: tests, lint, and build pass; the mobile model includes all destinations exactly once.

- [ ] **Step 6: Commit responsive navigation**

```bash
git add Frontend/src/navigation.tsx Frontend/src/navigation.test.ts Frontend/src/App.tsx Frontend/src/App.css Backend/wwwroot
git commit -m "feat(navigation): simplify mobile destinations"
```

### Task 7: Add keyboard and motion accessibility safeguards

**Files:**
- Create: `Frontend/src/accessibility.test.ts`
- Modify: `Frontend/src/App.tsx`
- Modify: `Frontend/src/App.css`
- Modify: `Frontend/src/index.css`

- [ ] **Step 1: Write failing source contract tests**

```typescript
import { describe, expect, it } from 'vitest';
import appSource from './App.tsx?raw';
import appStyles from './App.css?raw';
import globalStyles from './index.css?raw';

describe('application accessibility contracts', () => {
  it('provides skip navigation and a focusable main target', () => {
    expect(appSource).toContain('href="#main-content"');
    expect(appSource).toContain('id="main-content"');
    expect(appSource).toContain('tabIndex={-1}');
  });

  it('defines focus visibility and reduced motion behavior', () => {
    expect(globalStyles).toContain(':focus-visible');
    expect(`${globalStyles}\n${appStyles}`).toContain('prefers-reduced-motion: reduce');
  });
});
```

- [ ] **Step 2: Run the tests and verify the missing contracts**

Run: `cd Frontend && npm run test -- src/accessibility.test.ts`

Expected: assertions fail because the skip link and global focus/motion styles are absent.

- [ ] **Step 3: Implement the accessibility contracts**

Add `<a className="skip-link" href="#main-content">Skip to main content</a>` before the shell and put `id="main-content" tabIndex={-1}` on the main content container. Style the link off-screen until focused. Add a 2-pixel accent `:focus-visible` outline with offset, ensure changed navigation targets are at least 44 pixels, and disable non-essential transitions/animations under `prefers-reduced-motion: reduce`.

- [ ] **Step 4: Verify accessibility contracts and full frontend quality**

Run: `cd Frontend && npm run test -- src/accessibility.test.ts && npm run test && npm run lint && npm run build`

Expected: all tests, lint, and build pass.

- [ ] **Step 5: Commit accessibility safeguards**

```bash
git add Frontend/src/accessibility.test.ts Frontend/src/App.tsx Frontend/src/App.css Frontend/src/index.css Backend/wwwroot
git commit -m "feat(accessibility): improve keyboard and motion support"
```

### Task 8: Document and verify the production-ready result

**Files:**
- Modify: `README.md`
- Modify: `docs/DEVELOPMENT.md`
- Modify: `Backend/wwwroot/**`

- [ ] **Step 1: Update operational documentation**

Document the 32-character JWT secret minimum, the 24-hour default and 720-hour validation ceiling, login throttling behavior, and `npm audit --omit=dev --audit-level=moderate` as a required release check.

- [ ] **Step 2: Run the complete backend verification**

Run: `dotnet test Backend.Tests/Backend.Tests.csproj && dotnet build Schedora.sln --no-restore -warnaserror`

Expected: all tests pass and the build reports zero warnings and zero errors.

- [ ] **Step 3: Run the complete frontend verification**

Run: `cd Frontend && npm audit --omit=dev --audit-level=moderate && npm run test && npm run lint && npm run build`

Expected: zero known production vulnerabilities; all tests, lint, and production build pass.

- [ ] **Step 4: Check repository integrity**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; pre-existing product changes are still present and final generated assets correspond to the latest build.

- [ ] **Step 5: Perform browser acceptance checks**

Start the app with the existing local configuration and verify at desktop and 390-pixel mobile widths: login, rejected invalid login, protected-route redirect, Properties, Tasks, Workflows, Inspect, More menu access to all secondary pages, keyboard skip link, visible focus, no horizontal page overflow, and clean console/network state.

- [ ] **Step 6: Commit documentation and final build output**

```bash
git add README.md docs/DEVELOPMENT.md Backend/wwwroot
git commit -m "docs: record production security checks"
```
