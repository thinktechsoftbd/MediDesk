# Taste

## Workflow

- Expects the agent to apply pending database migrations/DDL to the configured database itself (e.g. `prisma db execute` / `prisma db push`) and verify the result, rather than leaving the SQL for the user to run. Confidence: 0.6
