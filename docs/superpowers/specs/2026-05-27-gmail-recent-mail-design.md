# Gmail Recent Mail Design

## Goal

Add a lightweight Gmail page to Schedora so an authenticated Schedora user can view recent Gmail messages from the last few days inside the existing app.

## Scope

The feature is read-only. It lists recent Gmail messages and does not open full message bodies, mark messages as read, archive, delete, send, or store email content in the database.

The first version supports selectable windows of 1, 3, and 7 days, with 3 days as the default.

## Architecture

The frontend calls a new authenticated backend endpoint:

`GET /api/gmail/recent?days=3`

The backend uses Google Gmail API with the `gmail.readonly` scope. It follows the existing Google API integration style used by Calendar and Sheets: credentials are loaded from configuration, API access happens only server-side, and the browser receives only sanitized message summary data.

## Backend Components

Create a Gmail service with a narrow interface:

- `IGmailService.GetRecentMessagesAsync(int days)`
- `GmailService`, responsible for loading credentials, building a Gmail API client, querying Gmail, and mapping messages to DTOs
- `GmailController`, responsible for request validation and returning JSON

The controller is protected by the existing JWT authentication. `days` is clamped to the supported values 1, 3, and 7, defaulting to 3 when omitted or invalid.

## DTO Shape

Each returned email item contains:

- `id`
- `subject`
- `from`
- `receivedAt`
- `snippet`
- `isUnread`

The backend should avoid returning full body content in this version.

## Gmail Query

Use Gmail search syntax to fetch recent inbox mail:

`in:inbox newer_than:{days}d`

Fetch a limited number of results to keep the page fast, initially 50 messages. For each message, request metadata and snippet rather than full raw payload where possible.

## Frontend Components

Add a new `MailPage` route and sidebar item. The page includes:

- a compact title/header consistent with the existing Schedora pages
- segmented day filter for 1, 3, and 7 days
- refresh button
- table or dense list showing sender, subject, received time, snippet, and unread status
- loading, empty, and error states

The page uses the existing `api` axios instance so JWT behavior remains consistent with other pages.

## Error Handling

If Gmail credentials or scopes are missing, the backend returns a clear 500 response message. The frontend displays that message without exposing secrets.

If Google API access fails because the Gmail API is disabled or the credential lacks Gmail permission, the backend logs the detailed exception and returns a user-facing setup message.

## Testing

Backend tests should cover request validation and query behavior where practical. If direct Gmail API calls are hard to unit test with the current structure, keep the Gmail mapping and request validation testable and verify compilation.

Frontend verification should include TypeScript build and a local browser check that the `Mail` navigation and page render correctly.

## Non-Goals

This version does not implement OAuth account linking from the browser, multiple Gmail accounts, background sync, database persistence, full email body reading, attachment previews, or write actions.
