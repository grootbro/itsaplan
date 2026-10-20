# Native workspace

Artifact: `apps/mobile`. Product scope is in `PRODUCT.md`; visual rules and exact
tokens are in `DESIGN.md`. Extend the incumbent neutral Operate system.

The workspace supports project filtering, sorting and grouping, personal project
preferences, cross-project assigned work and quick issue edits alongside existing
issue detail flows. API permissions determine available actions. This surface does
not assert complete web parity.

Project and My work views use scrollable list headers, native sectioned issue lists,
readable metadata and focused filter/display sheets. Project state choices scroll
horizontally. Quick actions expose status, priority, assignee and due date; the
visible row action accompanies long press. Project creation stays above the bottom
safe area with matching list clearance. My work groups assigned issues by due date
or project and explains partial loads and per-project result limits.

Preserve system-scaled text, shared 48-unit minimum targets, flexible row metadata,
header accessibility roles and labeled controls. `NativeSheet` uses no custom
animation and contains its own scrolling body. Route editor modals retain platform
navigation presentation.

Evidence: source review accepted the four accessibility/layout fixes: accessible issue metadata,
explicit reachable controls, scrollable list headers and safe-area floating
action clearance. This verdict is limited to source inspection. No visual, device,
contrast, runtime or deployed API evidence was obtained. Local QA execution remains
prohibited by `/Users/dobrota/work/sekta/AGENTS.md`. No detector applies to native.

Open validation: large text and VoiceOver on device, keyboard and sheet behavior,
safe-area layout, current server compatibility, dark appearance and Android release
readiness. Configuration currently selects light appearance and iOS phone intent.
