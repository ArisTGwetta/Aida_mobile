# Project Briefcase Schema

Project briefcases are the project-specific layer of Aida's context.

They are loaded from Drive and mapped into:

```text
AIDA_RUNTIME.mind.projects
AIDA_RUNTIME.mind.activeProject
AIDA_RUNTIME.context.project
```

## Filename Conventions

Preferred:

```text
project_briefcase_aida_architecture.json
```

Also supported:

```text
briefcase_aida_architecture.json
project_aida_architecture.json
project_*.json
briefcase_*.json
project_briefcase_*.json
```

## Selection Rule

For the current checkpoint:

1. Prefer `project_briefcase_aida_architecture.json`.
2. Then `briefcase_aida_architecture.json`.
3. Then `project_aida_architecture.json`.
4. Then the first loaded project/briefcase file.
5. Otherwise `activeProject = null`.

Later, the Realm/Project selector should let the user explicitly choose the active project.

## Recommended Fields

The inspector can name a project if one of these fields exists either top-level or nested under `project`/`briefcase`:

```json
{
  "project_name": "Aida Architecture",
  "briefcase_title": "Aida Architecture",
  "display_name": "Aida Architecture",
  "name": "Aida Architecture"
}
```

Useful summary fields:

```json
{
  "project_summary": "...",
  "briefcase_summary": "...",
  "summaries": [],
  "contexts": [],
  "threads": [],
  "notes": []
}
```

## Pre-LLM Role

If a project is active, its facts and summaries are authoritative context. The LLM message builder must include them before sending the user message.
