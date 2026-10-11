# Momentum Documentation

All project specifications and BMAD-generated artifacts live under `docs/`.
The framework and its internal configuration remain under `_bmad/`.

## Specification Entry Points

| Document               | Location                                         | Scope                                                                 |
| ---------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Product requirements   | [prd.md](./prd.md)                               | Existing product requirements and backlog                             |
| UX specification       | [front-end-spec.md](./front-end-spec.md)         | User experience and interface specification                           |
| Architecture           | [architecture/index.md](./architecture/index.md) | Domain-based technical documentation                                  |
| Epic planning          | [epics.md](./epics.md)                           | Incremental daily-home-navigation planning, not a replacement backlog |
| Stories                | [stories/](./stories/)                           | Story specifications and implementation artifacts                     |
| Feature specifications | [features/](./features/) and [specs/](./specs/)  | Feature and companion specifications                                  |
| Historical references  | [archive/](./archive/)                           | Preserved, non-normative documents                                    |

The Epic 3 implementation plan is supplemental context, not a competing version
of `epics.md`. Explicitly select `front-end-spec.md` in workflows whose UX search
pattern only matches filenames containing `ux`.

Story 3.8's implementation status is tracked narrowly in
[`stories/sprint-status.yaml`](./stories/sprint-status.yaml); its canonical story records the
user-reported acceptance scope and distinguishes local validation from production deployment.
The Epic 3 addition is complete, but this does not mark the full historical Epic 3 backlog done.

## BMAD Output Configuration

- `planning_artifacts`: `{project-root}/docs`
- `implementation_artifacts`: `{project-root}/docs/stories`
- `project_knowledge`: `{project-root}/docs`
- `output_folder`: `docs` in the BMM, core, and memory configurations.

Implementation artifacts may include sprint status, retrospectives, quick specs,
and test summaries in addition to stories. Existing story filenames and workflow
completion metadata are preserved; use explicit story paths when automatic
discovery expects a different naming convention.

Architecture is maintained by domain, with the index as the discovery entry
point. The monolith and existing split were reconciled against repository sources
on 2026-10-11; the index maps all 18 original sections to active documents.
Superseded examples remain archived for provenance, not as current implementation
instructions. Documentation coverage does not certify implementation readiness.

BMAD reinstallations may regenerate configuration files. Preserve these output
paths when upgrading. Framework templates and bundled defaults are not project
specifications and are not relocated or globally rewritten.
