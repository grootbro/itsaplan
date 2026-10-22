# Mobile workspace slice — 2026-10-20

## Working copy and boundaries

Branch: `codex/mobile-workspace`. Base: `4603f917d7dfffd302cd761d100a1f503a28050e`.
The isolated task clone contains the original local Expo RC and the earlier Inbox fix.
The original `/Users/dobrota/work/sekta/repos/itsaplan-mobile` has not been edited.
`mobile-before-workspace/` beside this clone preserves the mobile code before this slice.
No dependencies, credentials, signing settings, server business rules or web worktrees
were changed. Nothing was committed, pushed, deployed or released.

## Implemented capabilities

| Surface | Behavior | Existing API |
| --- | --- | --- |
| My work | Assigned issues across readable projects, open/all states, due-date or project sections, priority within dates, text search, project filter, open/edit issue | GET projects; GET projects/:key/issues with assigneeUserId and limit=500; GET projects/:key |
| Projects | Search name/key/team, team filter, Favorites and Hidden views, favorite/unfavorite, hide/show | GET projects?permissions=true; PATCH projects/:key/preferences |
| Work items | Text, assignee/mine/unassigned, priority/unset, due date, type, label, cycle and initiative filters | Existing board and archive payloads; options endpoints supplemented with relations from loaded issues |
| Work items | Sort updated/due/priority/title; group status/assignee/priority or none; status and archive views | Existing board and archive payloads |
| Quick actions | Change status, priority, assignee or due date; server errors visible; edit permission required | PATCH issues/:id with only changed fields |
| Reliability | List invalidation after related issue changes, native foreground refresh, retained loaded content during refresh errors, retry actions, saved-preference hydration/write ordering, sign-out error handling | Existing API and SecureStore |
| Native interface | Five sections, safe-area tab layout, scrollable list headers, clearer task metadata, named accessible quick actions, 48pt controls, bottom inset for FAB, focused native sheets | Expo Router and existing React Native dependencies |

The filtered assigned-issue API caps each project at 500. My work reports that limit
and partial failures explicitly; it does not claim to have paginated the full workspace.
Hidden projects remain accessible by the API, so assigned work includes readable hidden
projects. Personal hide/favorite preferences only affect the current member.

## Design and review evidence

The user explicitly requested Impeccable and selected maximum web functionality.
Impeccable's context command ran once; the existing neutral system was preserved.
Product context is in apps/mobile/PRODUCT.md. Native design documentation records actual
source values and known limits. No image assets were generated or replaced.

Independent code review inspected 22 changed mobile source/test files and API contracts.
Two findings were fixed: historical relation filter choices and the native empty-state
behavior for ungrouped lists. Final source verdict: approve, no findings.

A fresh Impeccable native reviewer accepted 4/4 listed source fixes: VoiceOver metadata,
FAB bottom inset, the date Clear target and scrollable list headers. Native sheet motion
was removed. This is source review, not a visual/device ship verdict.

## Checks and remaining acceptance

No tests, lint, typecheck, formatting tool, audit, build, dev server, simulator/emulator
or UI automation was executed on this Mac. The local prohibition in
/Users/dobrota/work/sekta/AGENTS.md remains in effect. Independent reviews do not establish
passing tests. No new server run was started.

There are 16 new pure regression tests in src/lib/__tests__/issue-list.test.ts, covering
filter intersections, identifiers/descriptions, assignment, null priority, sorting,
cache immutability, calendar boundaries, closed-work due grouping and native section/empty-state structure. The
previous six Inbox regressions remain. Existing mobile test script and CI step discover
both files automatically. All 22 tests remain unexecuted here.

The previous QA-only three-file patch only covers the earlier Inbox helper. It is not
a verification plan for this larger slice and must not be treated as one.

On an explicitly approved host, run the existing workspace quality gate and
`bun --cwd apps/mobile run test`. Validate native dependency/config compatibility and
run the repository's server integration gate separately. Full-RC publication requires
reviewing the original uncommitted RC provenance and final publication scope first.

Device acceptance on approved iPhone hardware or simulator:

1. Open each of the five tabs, navigate forward/back and through issue modals; verify
   safe areas, bottom tab labels and keyboard behavior at normal and accessibility text sizes.
2. In Projects, search by team/key/name, combine team and Favorites filters, hide/show a
   project and reload. Verify that these actions do not change another member's preferences.
3. In My work, use two projects with assigned/unassigned/closed/canceled/undated work.
   Validate scopes, due grouping, project grouping and priority sorting; block one project's
   requests and simulate a 500-result response to verify truthful partial/limit messaging.
4. In a project, intersect every filter, including no-priority, mine, unassigned and an
   issue linked to a completed cycle/initiative excluded from assignment-picker options.
5. Test all grouping/sort combinations and zero results with grouping disabled. Search input
   must keep focus as results update; all header controls must remain reachable by scrolling.
6. Open quick actions via ellipsis and long press. Update each supported field and clear a
   date. Verify PATCH omits untouched cycle/initiative IDs. Denied edits must show errors and
   read-only projects must not expose editing actions. The server remains authoritative.
7. Edit/create/archive/restore via existing screens and return to My work, search and project
   lists. Return from background; confirm stale data refreshes without destructive UI resets.
8. Delay SecureStore hydration, select a project, change Inbox scope, then sign out/in and
   restart. Old reads/writes must not overwrite newer selections. Fail storage and sign-out
   requests to validate visible recovery and absence of unhandled rejections.
9. Use VoiceOver on task rows/actions, dates and filter controls. Validate metadata, focus,
   touch targets, home-indicator clearance, sheet dismissal and Reduce Motion.

The app retains its explicit light appearance and current iOS release scope. Dark scheme,
Android release readiness, live API compatibility and final store/device readiness remain
unestablished. No screenshots exist for this source-only handoff.
