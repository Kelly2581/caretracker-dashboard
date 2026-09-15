---
name: coverage-gaps
description: Find Release Ready stories in CT project missing Zephyr test case links
metadata:
  type: read-only query
  category: testing
  requires: atlassian MCP access
---

# Coverage Gaps

Identify stories in the CT project that are Release Ready but lack linked Zephyr test cases.

## What to do

1. Search the CT project for all issues with a target status
   - Supported statuses in CT project: Sizing, Dev Ready, Development, Story Development, Open, Closed
   - By default, search for status "Dev Ready" (stories development-ready for release)
   - Use JQL: `project = CT AND status = "Dev Ready"`
   - Include fields: key, summary, issuetype, components
   - Tip: To use a different status, modify the JQL query or ask for clarification

2. For each story returned:
   - Get full issue details to check for linked issues
   - Look for issue links where the link type is related to testing (e.g., "is tested by", "relates to") pointing to Zephyr test cases
   - Zephyr test cases typically have keys like `ZEPHYR-*`, `TEST-*`, or are linked via specific link types
   - Track which stories have no test case links

3. Generate a markdown report with:
   - **Section 1: Stories Missing Test Coverage** — table with columns: Issue Key, Summary, Component(s)
   - **Section 2: Coverage Gaps by Component** — summary counts showing how many stories per component lack test coverage
   - Include totals at the end

## Output format

```markdown
# Test Coverage Gaps Report — CT Project

## Stories Missing Test Coverage

| Key | Summary | Component(s) |
|-----|---------|--------------|
| CT-123 | Story title | Component A |
| ...

**Total stories without test coverage:** X

## Coverage Gaps by Component

| Component | Missing Coverage Count |
|-----------|------------------------|
| Component A | 2 |
| Component B | 1 |

**Total components with gaps:** Y
```

## Important notes

- This is read-only — never modify or transition any issues
- If an issue has no component, list it under "Unassigned"
- Only report Release Ready stories, ignore other statuses
- If the linked test info is not immediately available, check the issue links and remote links sections
