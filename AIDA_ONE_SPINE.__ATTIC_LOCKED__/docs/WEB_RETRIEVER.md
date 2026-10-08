# Web Retriever

The Web Retriever is an explicit, on-demand lane for current outside information.

## User Phrases

- `Search the web for ...`
- `Look this up online ...`
- `Research online ...`
- `Find the latest information about ...`

Requests mentioning Aida's logs, memory, diary, journal, or Drive remain in the private memory-retrieval lane instead.

## Provider Contract

The first implementation uses OpenAI's Responses API with:

```json
{
  "tools": [{ "type": "web_search" }],
  "tool_choice": "auto",
  "include": ["web_search_call.action.sources"]
}
```

The configured research model is `gpt-5.5`. The normal conversation model remains unchanged.

Official references:

- https://developers.openai.com/api/docs/guides/tools-web-search
- https://developers.openai.com/api/reference/resources/responses/methods/create

## Privacy and Memory Rules

- Search requests contain only the explicit research query, not Aida's private memory context.
- Results and citations are labeled `external_research` and `web_sourced` in the session record.
- Sources render as safe clickable links.
- Research occurs only after an explicit user request.
- Aida must not claim she browsed, monitored, or researched while away.
- WYWA integration may later surface previously completed research, but it must identify it as earlier user-requested research rather than new offscreen activity.

## Current Boundary

Web retrieval currently requires the OpenAI route. Other providers receive a plain capability message rather than an invented result.
