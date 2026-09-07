# Schedora Production Readiness Optimization Design

## Objective

Improve Schedora's production readiness without adding new business modules or changing existing database and API contracts. The work prioritizes security, reliability, mobile usability, accessibility, performance, and maintainability while preserving the current uncommitted workflow, AI-inspection, reporting, and UI work.

## Current Baseline

- Backend: ASP.NET Core on .NET 9 with PostgreSQL, JWT authentication, Google integrations, AI-assisted inspection text, and 64 passing tests.
- Frontend: React 19, TypeScript, Vite, React Router, Axios, and Ant Design with four passing unit tests.
- The solution builds without warnings; frontend lint and production build pass.
- The working tree contains substantial unfinished product work. Optimization changes must be additive and narrowly scoped so that this work is not reset, overwritten, or mixed into unrelated refactors.
- The production dependency audit currently reports high-severity findings in Axios and React Router, plus transitive findings in `follow-redirects` and `form-data`.
- The current mobile header exposes nine primary destinations in a horizontal menu, which is crowded and difficult to use on narrow screens.
- Authentication stores a long-lived bearer token in browser storage, login has no attempt throttling, and unauthorized API responses are not handled centrally.
- The main Ant Design vendor chunk is large. Existing route-level lazy loading is useful and should be retained.

## Chosen Approach

Use a balanced production-hardening pass rather than either a minimal patch or a deep rewrite.

The pass will fix concrete security and reliability risks, improve the highest-impact mobile and accessibility problems, add regression tests for changed behavior, and make only targeted structural improvements. It will not redesign the product, replace Ant Design, change persistence models, or expand the business feature set.

## Security and Reliability

### Dependency safety

Upgrade Axios, React Router, and their lockfile resolutions to non-vulnerable compatible releases. Confirm the audit has no known production vulnerabilities after the upgrade and rerun the complete frontend test, lint, and build pipeline.

### Authentication hardening

- Add server-side login rate limiting with a small fixed-window policy suitable for a single-admin operational application.
- Return `429 Too Many Requests` with a retry hint when the limit is exceeded.
- Validate JWT configuration at startup, including a minimum signing-secret length and a bounded positive expiry.
- Shorten the default session lifetime from seven days to a safer operational default while preserving explicit configuration overrides.
- Keep the existing bearer-token API contract for compatibility. Replacing it with server-managed secure cookies is deliberately out of scope because it would change deployment and CSRF requirements.
- Centralize frontend `401` handling so expired or invalid sessions are cleared once and the user is returned to login without each page implementing its own behavior.

### HTTP and error handling

- Add standard production security headers that are compatible with the current SPA and external integrations.
- Keep internal exception details in server logs and return stable, non-sensitive client messages.
- Add cancellation support where requests are tied to component lifetime or server request lifetime and cancellation prevents stale updates or wasted work.
- Preserve the current authenticated-controller boundary and the public login and health endpoints.

## Product Experience and Accessibility

### Responsive navigation

- Keep the existing desktop sidebar.
- Replace the nine-item mobile horizontal menu with four core destinations and a clearly labelled More menu for secondary destinations.
- Preserve deep links, route selection, browser back behavior, and access to every current page.
- Ensure primary touch targets are at least 44 pixels and the layout does not require horizontal page scrolling.

### Interaction quality

- Add a keyboard skip link to the main content and a stable focus target for route content.
- Provide visible `:focus-visible` states and reduced-motion behavior.
- Use accessible labels for icon-only controls and announce asynchronous status messages without stealing focus.
- Standardize loading, empty, disabled, and error states where the current shared patterns can be applied safely.
- Keep the existing English-first product terminology. Chinese text remains only where it is part of the AI inspection workflow or existing operational guidance.

### Visual constraints

- Retain the current neutral, compact Schedora visual language, typography, and Ant Design foundation.
- Avoid a cosmetic redesign and avoid introducing new icon libraries or decorative animation.
- Use existing design tokens instead of adding scattered raw colors to changed components.

## Performance and Maintainability

- Preserve route-level lazy loading and verify that dependency upgrades do not regress chunking.
- Tune Vite chunking only where it produces stable, cacheable boundaries without fragile package-specific splitting.
- Do not replace Ant Design during this pass. Its vendor chunk size is accepted as a trade-off unless a low-risk import or configuration correction materially reduces it.
- Extract small, testable helpers from large pages only when required by a behavior change. Broad page rewrites are out of scope.
- Consolidate authentication/session behavior in the API and auth layers rather than duplicating it across pages.
- Keep generated `Backend/wwwroot` assets synchronized with the verified frontend production build.

## Testing Strategy

Changed behavior follows red-green-refactor:

- Backend tests cover rate-limit registration/configuration, JWT option validation, and security headers at the smallest practical boundary.
- Frontend tests cover mobile navigation classification and centralized session-expiry behavior using focused pure helpers where possible.
- Existing workflow, AI, reporting, task, database-startup, and formatting tests remain unchanged unless compatibility requires an explicit update.
- Manual browser checks cover login, protected-route redirect, navigation, and representative pages at desktop and mobile widths.

## Acceptance Criteria

The work is complete when all of the following are true:

1. Existing uncommitted product changes remain intact.
2. `dotnet test Backend.Tests/Backend.Tests.csproj` passes.
3. `dotnet build Schedora.sln --no-restore -warnaserror` passes without warnings.
4. `npm run test`, `npm run lint`, and `npm run build` pass in `Frontend`.
5. `npm audit --omit=dev --audit-level=moderate` reports no known production vulnerabilities.
6. Login attempts are throttled, JWT configuration is validated, and production responses include the selected security headers.
7. Expired frontend sessions reliably return the user to login.
8. Every existing destination remains reachable on desktop and mobile, with no mobile navigation overflow.
9. Keyboard focus, skip navigation, touch targets, and reduced-motion behavior meet the design requirements.
10. The built frontend in `Backend/wwwroot` matches the final source build.

## Explicit Non-Goals

- New property-management features or workflow types.
- Database schema changes or API contract redesign.
- Migration from JWT bearer storage to cookie authentication.
- Replacement of React, Vite, Ant Design, or the .NET service architecture.
- Large-scale refactoring of pages unrelated to the identified production-readiness risks.
