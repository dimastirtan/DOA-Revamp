# Code Review TODO (DOA Revamp)

## Summary
Repository is a SvelteKit + Drizzle + MySQL app (DOA document management) with: 
- Auth/session (Lucia)
- Upload endpoint (PHP `up.php`)
- Routes for document create/update/search/log and user register/admin actions.

This TODO.md contains review notes and recommended improvements based on the code inspected so far.

---

## 1) Security & Privacy (Priority: High)

### 1.1 Hard-coded secrets / credentials (High)
- `src/lib/server/db/index.ts`: MySQL pool uses `root` with empty password.
  - Move credentials to environment variables (e.g. `$env/dynamic/private` or adapter env).
  - Add config for `production` vs `development`.

### 1.2 Insecure auth cookie configuration (High)
- `src/lib/server/auth.ts`: `sessionCookie.attributes.secure = false`.
  - Set `secure: true` in production (behind HTTPS).
  - Consider `sameSite` and `httpOnly` settings explicitly.

### 1.3 Password hashing is weak/legacy (High)
- `src/routes/-users/w/+server.ts` and `src/routes/login` usage:
  - Uses `md5(...)` for password hashing.
  - Replace with a modern KDF (bcrypt/argon2) via a maintained library.
  - Plan DB migration strategy.

### 1.4 SQL injection risk via `sql.raw` string interpolation (High)
- `src/routes/-doa/log/+server.ts`:
  - Uses `sql.raw` with interpolated user input (`search`, `from`, `to`, `page`, `limit`).
  - Even though `search` escapes single quotes, this pattern is still dangerous and brittle.
  - Refactor to parameterized queries or Drizzle query builder.

### 1.5 Upload endpoint accepts arbitrary file types and weak validation (High)
- `up.php`:
  - Validates extensions but not content/MIME.
  - Consider validating file signature (magic bytes) or using server-side conversion/scan.
  - Also normalize and validate `type/number/revision` more strictly.

### 1.6 Leaking internal errors to client (Medium/High)
- Several endpoints return `err.message` and sometimes `stack`.
  - Standardize error responses; avoid returning stack in production.

---

## 2) Correctness & Robustness (Priority: High)

### 2.1 Upload retry logging + abort controller (Medium)
- `src/routes/-doa/w/+server.ts`:
  - `uploadRes.text()` + `JSON.parse` is OK, but:
    - If server returns non-JSON, throwing generic error.
    - Improve typed parsing and return helpful validation errors.

### 2.2 Content-type handling for multipart (Medium)
- `src/routes/-doa/w/+server.ts`:
  - Checks `contentType?.includes('multipart/form-data')` but then `request.formData()`.
  - Ensure browser-side always sends correct multipart boundary.
  - Consider using `request.headers.get('content-type')` substring match robustly.

### 2.3 Date formatting / null defaults (Medium)
- `src/routes/-doa/w/+server.ts`:
  - `date2` default set to `'1970-01-01'` string; ensure DB column allows that.
  - Prefer consistent handling and explicit nullability.

### 2.4 Logic bug suspicion: userlevel checks (Medium)
- `src/routes/-doa/r/+server.ts`:
  - Allowed lists contain strings with trailing spaces like `'WA '`.
  - Might be intentional mapping, but seems error-prone.

---

## 3) Code Quality & Maintainability (Priority: Medium)

### 3.1 Confirm store has leftover debug logs (Medium)
- `src/lib/confirm-store.ts`:
  - `console.log` in `close()` and in dismiss/handlers.
  - Remove logs or gate behind env.

### 3.2 Confirm dialog layout: braces/indent issue (Low/Medium)
- `src/lib/components/ui/confirm-dialog.svelte`:
  - `handleCancel` appears mis-indented/has extra whitespace braces:
    - `function handleCancel() { ... resolve(false); }
      		}`
  - Verify formatting/TS compile.

### 3.3 Replace repeated hard-coded mappings (Medium)
- `up.php` has large `$mappings`.
  - Consider moving mappings to config file or database.
  - Add a fallback error when `type` is unknown (currently uploads go to UNKNOWN dir).

### 3.4 Large server route doing many responsibilities (Medium)
- `src/routes/-doa/w/+server.ts`:
  - Combines: validation, duplicate checks, upload retry, data normalization, insert/update, remark updates.
  - Suggest extracting helpers:
    - `validateEntry(entry)
    - `ensureUnique(entry)
    - `uploadFile(file, entry)
    - `buildStandardRow(entry, locals)

---

## 4) Performance (Priority: Medium)

### 4.1 Cached total invalidation is global and may be wrong (Medium)
- `src/routes/-doa/log/+server.ts`:
  - `let cachedTotal: number | null = null;` is process-global.
  - Concurrent requests may serve stale `total` after inserts.
  - Use request-scoped counting or a proper cache key with TTL.

### 4.2 Heartbeat/session check logs (Low)
- `src/routes/+layout.svelte`:
  - Interval check every 5 minutes plus focus/visibility triggers.
  - There is `console.log('Session expired...')` and `console.error`.
  - Consider reducing noise and throttling.

---

## 5) Recommended Immediate Fix List
1. Remove all debug `console.log` in confirm store + confirm dialog + layout.
2. Refactor `src/routes/-doa/log/+server.ts` to remove `sql.raw` interpolation; parameterize.
3. Replace `md5` password hashing with bcrypt/argon2 and migrate.
4. Move DB credentials to env variables.
5. Fix `secure` cookie settings for production.
6. Strengthen `up.php` file validation (MIME + signature + strict type whitelist).

---

## Evidence / Files Reviewed
- `src/lib/server/db/index.ts`
- `src/lib/server/auth.ts`
- `src/routes/+layout.svelte`
- `src/routes/-doa/w/+server.ts`
- `src/routes/-doa/r/+server.ts`
- `src/routes/-doa/log/+server.ts`
- `src/routes/-users/w/+server.ts`
- `src/lib/server/db/schema.ts`
- `src/lib/confirm-store.ts`
- `src/lib/components/ui/confirm-dialog.svelte`
- `src/routes/login/+page.svelte`
- `src/routes/login/+page.server.ts`
- `up.php`

---

## Next Step (Not yet done)
- Read remaining route files:
  - `src/routes/dash/log/+server.ts`, `src/routes/-doa/r/+server.ts` (already read), `src/routes/-doa/w/+server.ts` (already read)
  - `src/routes/+layout.server.ts`, `src/routes/dash/+page.svelte`
  - `src/routes/-doa/log/+server.ts` (already read)
  - plus UI components used for upload/view.
- Search the rest of `src/` for any additional insecure patterns.

