# Aida Live Acceptance Test — 2026-06-22

Run this against the hosted Aida page after GitHub Pages has updated. Use the OpenAI route unless a step explicitly tests another lane.

## Pass Rule

The bundle passes when every critical test below succeeds without private-memory leakage, duplicate visible projects, invented web research, or broken Drive character art.

If a critical step fails, stop before folder consolidation and record:

- the exact phrase used;
- Aida's visible reply;
- the relevant BIOS/log line;
- a screenshot if the failure is visual.

## 1. Clean Boot and Drive

1. Hard-refresh the hosted page.
2. Connect Drive and complete OAuth.
3. Wake Aida through the normal airlock.
4. Open the project browser.

Expected:

- Wake completes without a missing-script error.
- Project shelves hydrate without the old temporary UNFILED/duplicate flicker.
- The active provider badge is correct.

## 2. Command Guide

Say:

> What can you do?

Expected:

- Aida returns a readable guide covering memory, projects, portfolio tools, privacy lanes, persistence, and web research.
- No LLM or web-search request is needed for the guide itself.

## 3. Memory Navigation

Say:

> Review what we have.

Then:

> Give me a fresh glance.

Then:

> Show me the sources for that glance.

Expected:

- The overview lists only projects visible to the current LLM lane.
- Fresh Glance returns up to three useful threads.
- Source references appear when available.
- Storage-shaped text such as `[object Object]` or mechanical summary boilerplate does not appear.

## 4. Project Summary and Navigation

Say:

> Summarize Bard and the Frozen Guide.

Then:

> Open project Bard and the Frozen Guide.

Expected:

- Aida identifies the project, realm, summary, open-thread count, and source count.
- Opening the project activates RPG context and its role.

## 5. Duplicate Reconciliation

Only run this if both Bard briefcases still exist in Drive.

Say:

> Compare the two Bard and the Frozen Guide project versions.

Expected:

- Aida names both briefcase files.
- She recommends one survivor and explains that the duplicate will be archived rather than permanently deleted.
- She asks for confirmation.

Then either say:

> Cancel merge.

Expected: nothing changes.

Or, when ready:

> Yes, merge them.

Then use Commit.

Expected:

- Unique memories survive in the canonical project.
- Only one Bard project remains visible.
- The second Drive briefcase remains recoverable with `archived: true`, `status: "superseded"`, and `superseded_by`.

## 6. Portfolio Glance

Say:

> Give me a portfolio glance.

Expected:

- Aida proposes evidence-backed synergies, dependencies, consolidation candidates, conflicts, references, or spin-offs.
- Each relationship includes confidence and shared signals.
- She does not silently restructure anything.

If suggestion 1 is sensible, say:

> Link suggestion 1.

Then use Commit.

Expected:

- Both project briefcases receive reciprocal `related_projects` entries.
- A conflict suggestion is not automatically linked.

## 7. Serana Private Character Pack

Open an RPG/Serana narrative context and ask for a staged Serana moment.

Expected:

- Serana renders after Drive authentication.
- Her image URL is an authenticated browser blob, not a public GitHub asset path.
- Changing expression loads the corresponding private Drive portrait.

Negative check:

- Before Drive authentication, or if the private pack is unavailable, Director uses Aida's System stage and does not advertise Serana as available.

## 8. Explicit Web Retrieval

Say something time-sensitive, for example:

> Search the web for the latest OpenAI web-search API guidance.

Expected:

- Aida visibly says she is checking the web.
- The answer contains clickable source links.
- The BIOS log reports the web-retriever provider, model, and source count.
- The request uses the OpenAI lane.
- The result is marked as external, web-sourced research.

Negative checks:

- “Search our logs for Liora” searches private memory, not the public web.
- A normal conversation does not invoke web search.
- Grok or Ollama does not fabricate a web result if the OpenAI web-search lane is unavailable.

## 9. Privacy-Lane Isolation

With OpenAI selected, recall a known OpenAI-only project detail.

Switch to Grok and ask for the same detail.

Expected:

- Grok cannot see OpenAI-only memory.
- Shared core memory remains visible.

Optional explicit test:

> Meditate across all LLMs about the Bard project.

Expected:

- Cross-lane access is granted for one use.
- The scope reseals immediately afterward.

## 10. Sleep and Commit

Have one short meaningful exchange, then run Sleep.

Expected:

- Sleep produces readable diary/summary candidates.
- Web research remains labeled as sourced external material rather than becoming an unquestioned personal fact.
- Commit previews the intended Drive writes before applying them.
- No private character blob or API credential is written into Git/static state.

## 11. WYWA Honesty Baseline

Leave and return, or use the existing test-gap helper.

Expected:

- Aida can mention held project threads or previously completed user-requested research.
- She does not claim she browsed, monitored, waited anxiously, or performed new offscreen work.
- Future scout behavior should invite research: “I noticed this item—want me to take a closer look?” Research happens only after approval.

## Final Decision

If all critical sections pass:

1. Mark `AIDA_ONE_SPINE` as the canonical implementation.
2. Begin the capability/vision audit.
3. Implement the honest WYWA scout → invitation → approved research flow.
4. Build the folder-consolidation manifest: Keep, Transplant, Archive, Delete, or Uncertain.
5. Archive before deleting any legacy Aida folder.
