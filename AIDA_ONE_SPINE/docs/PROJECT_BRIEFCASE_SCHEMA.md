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

The spine standard prefers one predictable shape for both dedicated project briefcases and realm-as-project fallback files:

```json
{
  "name": "RPG",
  "kind": "realm",
  "status": "active",
  "summary": "Current human-readable status.",
  "role": "role_co_narrator.json",
  "interaction_rules": {
    "mode": "collaborative roleplay",
    "rules": [
      "Aida remains Aida outside quoted or clearly labeled character speech.",
      "Characters may have relationships, desires, conflicts, and romantic histories that are not Aida's own stance toward the user.",
      "Keep speaker boundaries clear when moving between Aida, narrator, and characters.",
      "Keep the conversation flowing; ask clarifying questions only when the scene or user intent is genuinely ambiguous."
    ]
  },
  "facts": [],
  "memory": {},
  "recent_turns": [],
  "last_updated": "2026-06-04"
}
```

The inspector can still name a project if one of these older fields exists either top-level or nested under `project`/`briefcase`:

```json
{
  "project_name": "Aida Architecture",
  "briefcase_title": "Aida Architecture",
  "display_name": "Aida Architecture",
  "name": "Aida Architecture"
}
```

Useful adapter fields:

```json
{
  "role_file": "role_oracle_voice.json",
  "default_role": "oracle_voice",
  "preferred_role": "role_co_narrator.json",
  "realm_facts": [],
  "project_facts": [],
  "memory_summary": {},
  "project_summary": "...",
  "briefcase_summary": "...",
  "interactionRules": {},
  "conversation_rules": [],
  "voice_rules": [],
  "summaries": [],
  "contexts": [],
  "threads": [],
  "notes": []
}
```

## Pre-LLM Role

If a project is active, its role, interaction rules, facts, memory, summaries, and recent turns are authoritative context. The LLM message builder must include them before sending the user message.

`spine/project_context.js` resolves the active role from the selected context first. If no role is declared, the spine checks compatibility aliases and then falls back to the boot default role.

During translation, the spine also carries a small compatibility alias map so old realm-only files can still select obvious roles:

```text
oracle -> role_oracle_voice.json
compliance -> role_compliance_officer.json
chronicle -> role_chronicler.json
protocol_mx -> role_protocol_unit.json
aida_architecture -> role_architect_companion.json
rpg -> role_co_narrator.json
```

These aliases are compatibility scaffolding. The new standard should still declare `role` directly inside each realm or project briefcase.
