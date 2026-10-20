# Mobile release candidate audit — 2026-10-20

## Source and isolation

The mobile source is an uncommitted Expo workspace in the local worktree
`/Users/dobrota/work/sekta/repos/itsaplan-mobile`, branch `feat/expo-ios-rc`,
base `4603f917d7dfffd302cd761d100a1f503a28050e`, upstream
`https://github.com/croffasia/itsaplan`. It is not a separate GitHub mobile repository.
The local branch was 95 commits behind its cached `origin/main`; no remote freshness
is claimed. The existing changes comprise `apps/mobile`, root `app.json`, `bun.lock`,
and the Expo integration in `packages/auth`.

A separate clone under the task workspace preserves that base and all existing mobile
source, with branch `codex/mobile-workspace`. The source worktree has not been
edited. App task inventory showed no other active task targeting this mobile worktree;
this is evidence from the available inventory, not a process-level lock.

## Source inspection

- Expo SDK 55, React Native 0.83.4, Expo Router and SecureStore are declared.
  Dependencies and native compatibility have not been installed or executed here.
- iOS has simulator, internal preview and production EAS profiles, bundle identifiers,
  a custom URL scheme and project metadata. Signing, provisioning, API deployment,
  device builds and store status are unverified. No release or paid build was started.
- Android has no explicit application ID, versionCode or dedicated release profile.
  Date selection has an Android code path; no Android device validation is available.
- Login supports email and username/password. The server delta adds the Expo auth
  plugin and `itsaplan://` trusted origin. SecureStore backs native cookie storage;
  API calls forward that cookie. Instance OAuth-only authentication, recovery and
  expired-session UX require separate validation. No credentials were read.
- Protected routes and query clearing on account change exist. Project preference
  hydration uses global SecureStore keys; account switching and cold-start races
  still need device validation.
- Projects, board, create/edit issue, fields, dates, comments, attachments, time logs,
  links, search and Inbox have implementations. Permissions gate issue create/edit.
  The README explicitly excludes administrative and several web-only flows.
- Notification list/unread/read-all routes match this base API. The server treats an
  omitted read-all projectId as all projects. Full compatibility with current upstream
  and the deployed instance has not been established. Cross-project links are already
  documented as requiring a separate API change.
- Navigation uses four bottom tabs and stack/modals for issue tasks. Light theme,
  accessibility labels and native date picker exist. Safe-area layout, keyboard,
  large text and actual device appearance need UI validation.
- CI already covers formatting, lint, typecheck, server builds and integration tests.
  Mobile unit tests are added to the existing quality job. All four Docker install
  stages now copy the mobile manifest required by the workspace lockfile.

## Implemented slice

Inbox and its badge share explicit `all`, project ID and unavailable scope values.
An unresolved saved project cannot reuse the all-project query key or submit a
read-all request. The API boundary rejects unavailable/invalid scopes. Read-all
captures its scope as mutation input and is disabled while pending. Mutation failures
show alerts. Initial load has retry actions; refresh and pagination failures retain
loaded notifications and expose retry actions. Pagination stops automatic retries
following a failure.

## Verification status and approved-host checklist

No tests, lint, typecheck, formatting tools, builds, audit, dev servers or device QA
were run on this Mac. `/Users/dobrota/work/sekta/AGENTS.md` explicitly prohibits these
local runs and requires an explicit user command for checks on a server. Free space
was 7.2 GiB at discovery. No dependencies were downloaded.

On the explicitly approved build host:

1. Install with `bun install --frozen-lockfile` and run the existing quality gate:
   `bun run format:check`, `bun run lint`, `bun run typecheck`,
   `bun --cwd apps/mobile run test`.
2. Run the repository's existing Docker build/integration gate; verify all four
   install stages accept the workspace manifest and lockfile.
3. On an approved simulator/device, first cache all-project notifications and unread
   count. Relaunch with a saved project scope while delaying/failing project loading.
   Read all and the badge must not expose cached all-project state. Retry must recover.
4. Select a removed project: show Choose a project; selecting All projects must restore
   the all-project list. Mark all in project ONE must send `{projectId: 1}` and leave
   TWO unread. All projects must explicitly send `{}`.
5. Delay read-all, tap again and switch scope. The in-flight operation must keep its
   original project target and show pending state. Fail either read mutation: show
   its error, retain unread state, allow retry after recovery.
6. Fail initial load, refresh and next-page requests separately. Initial load offers
   retry; later failures preserve existing rows. Next-page retry uses the same cursor.
7. Cache a project Inbox, then fail a background projects refetch. Existing rows must
   remain visible with a projects retry action. Initial projects failure without cached
   data must still show the blocking retry screen.
8. Verify login/logout/account switching/cold restart, project and issue CRUD,
   permission denial, date selection, attachment open/upload/delete, links, search,
   Inbox navigation, long lists, safe areas and large text on iOS and Android.

An independent reviewer inspected the 12 changed files, found a cached-project refresh
recovery regression, and approved the final slice after its correction. This was source
inspection only; it does not establish runtime or release readiness.

Publication and RC readiness remain blocked on these checks and upstream compatibility.
The changes are local and uncommitted; no branch was pushed and no Draft PR was opened.

The later workspace feature slice and its separate source-review evidence are recorded in
`workspace-slice.md`. The earlier Inbox review does not certify the later slice.
