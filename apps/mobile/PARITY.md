# Web to mobile coverage

Evidence date: 2026-10-22. Web reference:
[`croffasia/itsaplan@3f5dff9`](https://github.com/croffasia/itsaplan/tree/3f5dff92b68522913f749bbb6540461e15d333b3/apps/web/src).
API contracts were read from the deployed public OpenAPI document on the same date.
Mobile baseline is `61e41082cf2afcd2417c57b5def518fe7bcd783b` (TestFlight 1.0.0 build 7).
This document includes source changes awaiting publication and validation; implementation
does not imply successful device acceptance.

Status: **implemented** means the described native behavior exists in source;
**partial** means important parts of the corresponding web feature are absent;
**missing** means there is no native implementation. Verification is tracked separately.
No authenticated production data was changed during this audit.

| Area | Implementation and confirmed gaps | Status | Verification / evidence |
| --- | --- | --- | --- |
| Project and team navigation | Project directory, team filter, favorites, hidden projects, My work, Inbox, You and header search. Canonical `teamRef.key` routes separate equal keys across teams. The project menu switches projects across teams and opens permission-aware Cycles/Initiatives. Dedicated workspace administration navigation remains absent. | partial | Project identity and Inbox scope regressions; new route changes await cloud UI checks. Web `[teamRef]/(shell)` routes and API project refs. |
| Assigned work | Cross-project assigned work and project selection. Results are limited to 500 per project; no exhaustive pagination. | partial | Existing unit tests and build 7 compilation; no authenticated device acceptance. `src/lib/api.ts:assignedIssues`. |
| Board | Horizontally scrolling native columns with server status order, empty columns, cards, properties, counts/WIP limit labels, create in status and quick actions. Group by status, priority, assignee or none. Drag/drop, manual ordering, swimlanes and hidden/collapsed/pinned groups remain absent. | partial | New model regressions pass; cloud UI checks pending. Web `features/work-items`, `utils/viewSettings.ts`. |
| List and table | Native grouped list and a horizontally scrollable property table. Shared filters and actions. Mobile list is an additional native layout. | implemented | Source implemented; pending cloud UI and native acceptance. Web confirms table, not a separate list mode. |
| Calendar | Six-week month grid, day agenda, start/due date choice, Sunday/Monday start and unscheduled tasks. Custom date fields and direct calendar rescheduling remain absent. | partial | Date/leap-year/year-boundary/unscheduled regressions pass; UI pending. Web `features/work-items/utils/calendar.ts`. |
| Timeline | Web timeline week/month/quarter, date ranges and issue bars. | missing | Confirmed by `utils/viewTypes.ts` and timeline source. |
| Saved views | Web project views with filters, display configuration, favorite/share controls. Mobile display settings are per account/project/device; they are not server saved views. | missing | API `/projects/{projectKey}/views`; opaque stored JSON requires explicit compatible mapping. |
| Display persistence | Layout, scope, filters, sort, grouping, properties and calendar settings persist per account/project. In-session scroll and selected calendar day/month survive route return. | implemented | Storage recovery/identity tests pass; history and resize UI checks pending. Native scroll restoration still requires device QA. |
| Filtering and sort | Search text, status/archive, assignee, priority, due date, label, type, cycle and initiative intersect. Missing options remain visible and clearable. Four sort fields; web offers additional fields, direction and manual order. | partial | Existing filter tests plus new storage regressions. Web `viewTypes.ts`, `viewSettings.ts`. |
| Global search | Cross-project search with project choice and title/identifier results. Per-project API result limit is 50; exhaustive search pagination absent. | partial | Build 7 compilation; canonical reference migration pending CI. |
| Task creation and edits | Title, description, status, type, priority, assignee, labels, dates, points, cycle/initiative, custom fields, archive/restore, watchers, links and subtasks. Full web task actions, delegate/run controls and feature-specific estimate presentation need further comparison. | partial | Build 7 source review and regressions; new create-in-column path pending UI. `app/new-issue`, `edit-issue`, `IssueDetailPanel`. |
| Issue reading | Native status/priority symbols, properties, dates/overdue cues, Markdown headings, formatting, lists, code, links and tables. Images are attachment links. | partial | Build 7: Markdown regressions and native compile passed; no device screenshots. Web rich body/editor is broader. |
| Editor | Plain Markdown Write/Preview for descriptions and comments; custom field editors. Web rich editor interactions and inline image editing absent. | partial | Build 7 compilation and Markdown tests; native editing acceptance pending. |
| Comments and activity | Feed pagination, comments/replies/edit/delete with ownership checks. | implemented | Collaboration unit regressions and build 7 compilation; real-device interaction pending. Web `features/issues` feed components. |
| Checklists and time logs | CRUD, ordering, completion and time/date validation with permission checks. | implemented | Collaboration/date regressions and build 7 compilation; native interaction pending. |
| Attachments | Pick/upload/list/open/delete controls. Native authenticated download behavior, image display and failure recovery need a dedicated acceptance pass. | partial | Build 7 compiled only. Do not equate browser URL opening with verified authenticated native download. |
| Cycles | Task selection/filtering, planned and paginated completed lists, search within loaded cycles, detail goals/dates/progress, linked task drill-down and create/edit basic fields. Finish/start-next/transfer/delete and cycle timeline remain absent. | partial | Live `/projects/{projectKey}/cycles`, `/cycles/{cycleId}` and web `features/cycles`. New source awaits cloud UI/type validation; native acceptance pending. |
| Initiatives | Task selection/filtering, paginated server search/status lists, details/description/progress, linked task drill-down and create/edit title/body/status/priority/dates. Ownership/label editors, attachments/activity/documents, richer progress and delete remain absent. | partial | Live paginated initiative endpoints and web `features/initiatives`. New source awaits cloud UI/type validation; native acceptance pending. |
| Documents, notes and dashboards | Confirmed web project sections with their own detail routes. | missing | Web `[projectKey]/{docs,notes,dashboards}`; native has no routes. |
| Account | Name and password editing, sign out, System/Light/Dark theme, start screen and haptics. Email/avatar/username, session/security controls, connected accounts and full server preferences remain absent. | partial | Preference and contrast regressions; build 7 compiled. Web `account/*`. |
| Teams, invites and permissions | Existing accounts and API permissions guard task controls. Team/member/role management and token invite acceptance screens absent. | partial | Web `invite/[token]` and account/team settings; live GET/accept/reject token endpoints. Incoming invitation inbox is not in the audited deployed API/main and is excluded from confirmed scope. |
| Inbox and notifications | Project/all scope, unread/read and pagination. Push registration and complete server notification preferences absent. | partial | Inbox scope tests; build 7 compiled. Web notifications settings and Inbox routes. |
| Project configuration | Web states, types, labels, fields, templates, actions, integrations, import/export and webhooks. | missing | Confirmed project settings routes. Administrative mutations require separate permission-aware UX. |
| Agents and integrations | Web agent chat, queue/run details, schedules, API/MCP and team integrations/tools/analytics. | missing | Confirmed web project/team routes; no native routes. |
| Public/auth flows | Existing mobile login. Web registration, recovery/reset, provider flows and public issue/view sharing need dedicated mobile coverage. | partial | Web auth and public routes; build 7 login compiled. |
| Loading/error/empty | Native loading, refresh, retained cached data, retry notices, empty results, missing filter choices and permission-aware actions. Offline writes/queue absent. | partial | New synthetic UI scenarios pending. No offline mutation guarantee. |
| iPhone/iPad and accessibility | Compact navigation, regular sidebar, split issue detail, compact resize preservation, form sheets, minimum touch areas and system text scaling. New board/table/calendar adapt to actual work-area width. | partial | Adaptive layout/contrast tests pass; browser fixture is synthetic. Simulator and physical iPhone/iPad acceptance are **blocked by missing execution/evidence**, not marked passed. |
| Android | Shared native source and configuration exist. Release signing, Android artifact and Android interaction acceptance not established. | partial | No Android release claim. |
| Release and repository CI | Build 7 is in TestFlight. New source has not been released. Root audit reports 28 advisories (4 critical, 24 high) on 650f55f. Disposable S3 fixture uses upstream pinned RustFS after fresh MinIO authorization failure; integration results pending. | partial | CI39827693044 confirms format/lint/65 tests/typecheck/app builds passed on 650f55f; audit gate remains enabled. Synthetic UI initially5/9 passed; unsupported RNWeb native properties require the documented fixture bridge. New planning source and revised UI scenarios await the next run. |

## Delivery sequence

1. Finish and review project board/table/calendar/list, state preservation, canonical
   project references and safe synthetic UI scenarios. Publish to the existing draft PR.
2. Add permission-aware project navigation and cycle/initiative browsing/details with
   task drill-down, shared filters and preserved return state.
3. Complete core task fields, editor/files and permission/error handling against current
   contracts, including large data sets and reliable authenticated attachment handling.
4. Extend accounts, workspace/team switching, invites and notifications.
5. Add compatible server saved views, timeline and the remaining confirmed project
   sections. Track each separately; one finished screen does not complete mobile parity.

Native build and TestFlight delivery follow a verified source snapshot. Browser fixture
screenshots and browser history tests only validate the synthetic React Native Web
environment; they do not validate UIKit/Android gestures, native navigation or device rendering.
