---
name: release-ready-worklist
description: Weekly report of issues that entered Release Ready status in the last 7 days
metadata:
  type: read-only report
  category: release tracking
  frequency: weekly
  requires: jira access
---

# Release Ready Worklist

Weekly report of CT project issues that transitioned to Release Ready status in the past 7 days.

## What to do

1. Query using JQL: `project = CT AND status CHANGED TO "Release Ready" AFTER -7d`

2. Request these fields explicitly:
   - `key`, `summary`, `issuetype`, `assignee`, `status`, `updated`

3. Paginate through all results until complete—do not stop at the default limit

4. For each issue, extract:
   - Issue key
   - Summary (summary text)
   - Issue type
   - Assignee display name (if present), or `–` if null/missing
   - Date it changed to Release Ready (from the status change timestamp)

5. Generate markdown report:

```markdown
## Release Ready Entries — Last 7 Days

N issues entered Release Ready in the last 7 days.

### By Issue Type

| Key | Summary | Assignee | Date Entered |
|-----|---------|----------|--------------|
| CT-1234 | Issue title here | john.doe | 2026-09-10 |
| CT-1235 | Another issue | – | 2026-09-09 |
```

If zero results, output one line: `No issues entered Release Ready in the last 7 days.`

6. Add brief Assumptions section noting:
   - The date range queried
   - How the assignment field was handled (null shown as `–`)
   - Any pagination applied
   - Whether the status change timestamp was used or created date (specify which)

7. Write complete report to: `reports/release-ready-YYYY-MM-DD.md`

8. Output/display the report in conversation

## Important notes

- **Read-only:** never modify Jira issues
- **Escape rule:** escape only actual pipe characters (`|`) in summary text—not entire summaries
- **Assignee handling:** if field is null/empty, show `–`; if field wasn't returned by API, document that in Assumptions
- **Date format:** YYYY-MM-DD for file and table dates
- **Pagination:** retrieve all results; do not accept partial results
- **File location:** `reports/` at project root
