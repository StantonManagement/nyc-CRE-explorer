# Execute PRP Implementation

You are implementing a feature for the NYC CRE Explorer project by following a PRP (Product Requirements Prompt).

## Input
PRP file to execute: $ARGUMENTS

## Execution Process

### Step 1: Load and Parse PRP
1. Read the PRP file from the provided path
2. Identify all implementation phases and steps
3. Note the success criteria and validation commands

### Step 2: Pre-Flight Checks
Before making any changes, verify:
- [ ] `node server.js` runs without errors
- [ ] `http://localhost:3000` is accessible
- [ ] `data/combined_data.json` exists and has data
- [ ] All files mentioned in PRP exist

If any check fails, STOP and report the issue.

### Step 3: Execute Each Phase Sequentially

For **each step** in the PRP:

1. **Announce** what you're about to do:
   ```
   📍 Executing Step X.Y: [Description]
   File: [filename]
   Location: [where in file]
   ```

2. **Make the change** exactly as specified in the PRP

3. **Validate immediately** using the provided validation command:
   ```
   ✅ Validation: [command]
   Expected: [expected output]
   ```

4. **Report result:**
   - ✅ Success: Move to next step
   - ❌ Failure: STOP, report error, suggest fix

### Step 4: Phase Completion Gates

After completing each phase:

**Phase 1 (Backend) Complete:**
```bash
# Run these validations
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/[new-endpoint]
```

**Phase 2 (Frontend) Complete:**
```
# Browser validation
1. Open http://localhost:3000
2. Verify new UI elements appear
3. Test interactivity
4. Check browser console for errors
```

**Phase 3 (Data) Complete (if applicable):**
```bash
node fetch_nyc_data.js
# Verify data/combined_data.json updated
```

### Step 5: Final Validation

Run the complete testing checklist from the PRP:
```bash
node server.js
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/properties
curl http://localhost:3000/api/sales?limit=5
# Plus any new endpoints
```

Browser testing:
- [ ] New feature works as specified
- [ ] Existing features still work (search, filter, map, portfolio)
- [ ] No console errors
- [ ] No visual regressions

### Step 6: Report Completion

Output a summary:
```
═══════════════════════════════════════════
  PRP EXECUTION COMPLETE
═══════════════════════════════════════════
Feature: [Feature Name]
Status: ✅ SUCCESS / ❌ FAILED

Steps Completed: X/Y
Files Modified:
  - server.js (lines X-Y)
  - public/index.html (lines X-Y)

Validations Passed:
  ✅ API endpoint works
  ✅ UI renders correctly
  ✅ No console errors
  ✅ Existing features unaffected

Notes:
  [Any observations or warnings]
═══════════════════════════════════════════
```

## Error Handling

If a step fails:

1. **STOP immediately** - don't proceed to next step
2. **Report the error:**
   ```
   ❌ Step X.Y FAILED
   Error: [description]
   Expected: [what should have happened]
   Actual: [what happened]
   ```
3. **Suggest fix** if possible
4. **Offer rollback** using the PRP's rollback plan

## Execution Rules

- **Never skip steps** - execute in exact order
- **Never skip validation** - always verify before proceeding
- **Keep changes minimal** - only what's in the PRP
- **Preserve formatting** - match existing code style
- **No scope creep** - don't add features not in PRP

## Project Constraints (Reminder)

- Single-file frontend (`public/index.html`)
- No new npm dependencies
- Vanilla JS only (no frameworks)
- API routes start with `/api/`
- Response format: `{ count, [items] }` or `{ error }`

## Recovery Commands

If something goes wrong:
```bash
# Check server status
node server.js

# Verify data integrity
cat data/combined_data.json | head -50

# Re-fetch data if corrupted
node fetch_nyc_data.js

# Git recovery (if using git)
git diff                    # See changes
git checkout -- [file]      # Revert file
git stash                   # Stash all changes
```
