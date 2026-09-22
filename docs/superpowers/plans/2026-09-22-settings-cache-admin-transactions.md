# Settings Cache and Admin Transaction Access Implementation Plan

> **For agentic workers:** Execute these tasks in order and verify each checkpoint before proceeding.

**Goal:** Stop stale settings responses from overwriting saved UI state and permit Admin/Pengurus to record both income and expense transactions.

**Architecture:** Dynamic API responses are explicitly non-cacheable at both the Express and browser-fetch layers. Transaction-entry authorization is widened consistently across the API route and React route/navigation/action guards, while existing validation and storage flows remain shared.

**Tech Stack:** Express, React, React Router, Node.js built-in test runner, Vite, PM2, Caddy.

---

### Task 1: Add failing regression checks

**Files:**
- Create: `tests/settings-and-transaction-access.test.mjs`
- Modify: `package.json`

- [x] Add tests that assert API responses are marked `no-store`, the web request helper opts out of browser caching, and Admin is included in the transaction-entry policy.
- [x] Run the focused test and confirm it fails against the current implementation because the headers/cache option and Admin policy are absent.

### Task 2: Fix cache invalidation behavior

**Files:**
- Modify: `apps/api/src/server.js`
- Modify: `apps/web/src/lib/api.js`

- [x] Add `Cache-Control: no-store` to `/api` responses.
- [x] Add `cache: 'no-store'` to API fetch requests, including CSV downloads.
- [x] Exclude `/api/*` from service-worker caching and bump the shell cache name to remove stale API entries.
- [x] Run the focused regression test and confirm it passes.

### Task 3: Permit Admin transaction entry

**Files:**
- Modify: `apps/api/src/routes.js`
- Modify: `apps/web/src/App.jsx`
- Modify: `apps/web/src/components/AppShell.jsx`
- Modify: `apps/web/src/pages/Dashboard.jsx`
- Modify: `apps/web/src/pages/Transactions.jsx`

- [x] Replace Treasurer-only entry guards with an Admin-or-Treasurer policy for create transactions and attachment updates.
- [x] Expose Kas Masuk and Kas Keluar routes, navigation links, dashboard actions, and transaction-page actions to both roles.
- [x] Run the focused regression test and full production build/API checks.

### Task 4: Deploy and verify

**Files:**
- Deploy: `/var/www/ikhlas`
- Runtime: PM2 process `ikhlas-api`
- Runtime: `/etc/caddy/Caddyfile`

- [x] Build the frontend with `VITE_API_URL=/api`.
- [x] Copy the new frontend bundle to `/var/www/ikhlas`.
- [x] Restart/reload the PM2 API process and persist the process list.
- [x] Verify HTTPS, API health, cache headers, and the production Admin transaction authorization path.

### Task 5: Commit and push

- [x] Review the diff and test output.
- [x] Commit the code, tests, and design/plan docs with a focused message.
- [x] Push `main` and verify local `HEAD` matches `origin/main`.
