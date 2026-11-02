# Taste

## Coding style

- Prefers data-driven values over hardcoded literals in the UI — e.g. brand/organization names should be read dynamically from the database (single source of truth) rather than hardcoded strings scattered across pages. Confidence: 0.7

## Workflow

- Expects the agent to apply pending database migrations/DDL to the configured database itself (e.g. `prisma db execute` / `prisma db push`) and verify the result, rather than leaving the SQL for the user to run. Confidence: 0.75
