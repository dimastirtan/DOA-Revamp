# TODO: Fix DOA Upload Issues (Bun Ubuntu vs Windows/Dev)

## Steps:
### 1. Create .env with PUBLIC_UPLOAD_URL ✅
### 2. Edit src/routes/-doa/w/+server.ts: Add env URL, retry logic (3x), logging ✅
### 3. Edit src/routes/dash/+page.svelte: Remove setTimeout, add retry button/logic, validation [PENDING]
### 4. Test: bun run build && bun run preview; deploy Ubuntu, check logs [PENDING]
### 5. Update TODO with results [PENDING]
