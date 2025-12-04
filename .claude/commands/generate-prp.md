# Generate PRP from Feature Request

You are generating a comprehensive PRP (Product Requirements Prompt) for the NYC CRE Explorer project.

## Input
Feature request file: $ARGUMENTS

## Instructions

1. **Read the feature request** from the provided file (usually INITIAL.md or a custom feature file)

2. **Research the codebase** to understand:
   - Current file structure and patterns
   - Existing API endpoints in `server.js`
   - Frontend component patterns in `public/index.html`
   - Data structures in `data/combined_data.json`
   - NYC Open Data query patterns in `fetch_nyc_data.js`

3. **Search for relevant documentation** if the feature requires:
   - New NYC Open Data APIs (check Socrata docs)
   - Mapbox features (check Mapbox GL JS docs)
   - New data sources

4. **Generate a complete PRP** following this structure:

```markdown
# PRP: [Feature Name]

> **Confidence Score:** [1-10] - [Reason]

## Overview
**Goal:** [One sentence]
**Complexity:** [Low/Medium/High]
**Files Modified:** [List]

## Prerequisites
- [ ] Checklist items

## Implementation Plan

### Phase 1: Backend Changes
**File:** server.js
#### Step 1.1: [Description]
**Location:** [Exact location - after line X or after function Y]
[Complete, copy-paste ready code]
**Validation:** [curl command with expected output]

### Phase 2: Frontend Changes
**File:** public/index.html
#### Step 2.1: [HTML changes]
#### Step 2.2: [CSS changes]
#### Step 2.3: [JavaScript changes]
**Validation:** [Browser testing steps]

### Phase 3: Data Changes (if needed)
**File:** fetch_nyc_data.js
[Changes if new data sources needed]

## Success Criteria
- [ ] Specific, testable criteria

## Final Testing Checklist
[Complete test commands]

## Rollback Plan
[How to undo if it fails]

## Notes
[Gotchas, edge cases, documentation links]
```

5. **Quality checks before outputting:**
   - All code is complete (no `// ...` or `/* TODO */`)
   - Line numbers/locations are specific
   - Validation commands are included for each step
   - Code follows project conventions (see CLAUDE.md)
   - No new npm dependencies added
   - Frontend stays single-file

6. **Save the PRP** to `PRPs/[feature-name].md`

## Project Constraints (from CLAUDE.md)
- Express 5.x backend, vanilla JS frontend
- Single-file frontend architecture (public/index.html)
- No React/Vue/Angular
- No new npm dependencies without approval
- API routes must start with `/api/`
- BBL is the primary key for properties
- Response format: `{ count, [items] }` for lists, `{ error }` for errors

## NYC Open Data APIs Available
- PLUTO: `https://data.cityofnewyork.us/resource/64uk-42ks.json`
- Sales: `https://data.cityofnewyork.us/resource/usep-8jbt.json`
- Permits: `https://data.cityofnewyork.us/resource/ipu4-2vj7.json`
- Violations: `https://data.cityofnewyork.us/resource/3h2n-5cm9.json`
- ACRIS: `https://data.cityofnewyork.us/resource/bnx9-e6tj.json`

## Output
Save the generated PRP to: `PRPs/[feature-name-kebab-case].md`

Then report:
- Feature name
- Confidence score with reasoning
- Number of implementation steps
- Estimated complexity
- Any concerns or missing information
