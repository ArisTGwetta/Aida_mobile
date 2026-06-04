# Project Briefcase Schema

Project briefcases are the project-specific layer of Aida's context.

They are loaded from Drive and mapped into:

```text
AIDA_RUNTIME.mind.projects
AIDA_RUNTIME.mind.activeProject
AIDA_RUNTIME.context.project
```

## Spine Owner

`spine/project_context.js` owns the project menu and active context.

Drive modules may fetch files and expose raw JSON, but they should not decide which project is active. They should delegate to:

```text
AIDA_PROJECTS.list()
AIDA_PROJECTS.select(projectKey)
AIDA_PROJECTS.mapDriveFilesToMind(files)
```

Legacy file names are adapter inputs, not spine law. The canonical runtime shape is `AIDA_RUNTIME.mind.projectLedger` plus `AIDA_RUNTIME.context.project`.

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

For the current checkpoint, `AIDA_PROJECTS` builds `AIDA_RUNTIME.mind.projectLedger` in this order:

1. Curated project index entries from `project_summary.json` or equivalent adapter data.
2. Recent activity entries written by sleep/butler routines.
3. Dedicated project payloads already present in Drive memory.
4. Realm files as fallback selectable contexts.

The Realm/Project selector lets the user explicitly choose the active context. Filename preferences are fallback adapters only.

## Realm vs Project

Older Aida versions sometimes used realms as projects. The spine keeps them separate:

- `realm`: the world, universe, tone field, or operating context.
- `project briefcase`: a specific work thread inside that realm, such as one book in a universe, one RPG campaign in a world, or the Aida architecture effort inside the Aida realm.
- `role`: Aida's job/hat inside the active realm/project.

If no dedicated project briefcase exists, the active realm remains authoritative and is treated as a project placeholder. This preserves old behavior without blocking richer nested projects later.

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
