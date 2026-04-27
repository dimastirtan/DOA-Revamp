# Task: Add if statement to hide Valid field in DOA add/edit drawer for types other than CVE, AWO, ass

## Steps:
- [x] 1. Create TODO.md with plan steps
- [x] 2. Edit src/routes/dash/+page.svelte to conditionally show Valid section based on selectedDoa.type
- [x] 3. Verify change with table logic match
- [x] 4. Update TODO.md with completion
- [x] 5. Test drawer behavior for add/edit
- [x] 6. Final completion

## Status: Completed ✅
- Added `{#if selectedDoa.type === 'CVE' || selectedDoa.type === 'AWO' || selectedDoa.type === 'ass'}` wrapper around Valid field in add/edit drawer.
- Matches table conditions exactly.
- Drawer now hides Valid for other types.

