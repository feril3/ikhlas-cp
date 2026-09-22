# Settings Cache and Admin Transaction Access Design

**Date:** 2026-09-22

## Goal

Ensure saved system settings remain visible immediately in the admin UI and allow both Admin/Pengurus and Bendahara to create income and expense transactions.

## Findings

The settings PUT endpoint persists and returns the new values correctly. The admin page then calls `load()`, whose GET requests can be intercepted by the service worker: the current worker caches every same-origin GET, including `/api/settings`, so a stale response can overwrite the freshly saved React state. A hard refresh bypasses that stale response, matching the reported symptom.

Transaction creation is restricted to `TREASURER` in the API route, router guard, navigation, dashboard actions, and transaction-page actions. The existing transaction form already supports both transaction types and does not need a role-specific redesign.

## Design

1. Mark API responses as non-cacheable in Express, request API data with `cache: 'no-store'` in the web client, and exclude `/api/*` from service-worker caching. Bump the shell cache name so existing cached API entries are removed on activation. The PUT response remains the immediate source of truth for the settings form, while subsequent GETs cannot restore stale values.
2. Replace Treasurer-only transaction-entry checks with an explicit Admin-or-Treasurer policy across the API and all UI entry points. Read-only transaction access remains available to both roles as before; settings remains Admin-only.
3. Keep Google Drive upload behavior and expense evidence requirements unchanged. Admin transactions follow the same validation, audit, notification, and attachment flow as Treasurer transactions.

## Verification

- Add a regression test for the no-store API request/response contract.
- Add a regression test proving an Admin is not rejected by the transaction-create authorization guard.
- Run the full production build and API syntax check.
- Verify the deployed settings endpoint returns `Cache-Control: no-store`, the production frontend loads, and the API remains healthy.
