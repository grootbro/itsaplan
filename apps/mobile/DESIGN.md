---
name: It's a Plan mobile
description: Native extension of the neutral Operate workspace system.
colors:
  canvas: "#F9F9F9"
  surface: "#FEFEFE"
  ink: "#242424"
  muted: "#646464"
  line: "#E8E8E8"
  accent: "#242424"
  accentSoft: "#F0F0F0"
  danger: "#C44343"
  urgent: "#C44343"
  high: "#9A4F1E"
  medium: "#78600B"
  low: "#436D77"
  on-accent: "#FFFFFF"
typography:
  headline:
    fontSize: "34pt"
    fontWeight: 700
    letterSpacing: "-0.8pt"
  project-title:
    fontSize: "30pt"
    fontWeight: 700
    letterSpacing: "-0.7pt"
  sheet-title:
    fontSize: "22pt"
    fontWeight: 700
  issue-title:
    fontSize: "17pt"
    fontWeight: 500
    lineHeight: 25
  action-label:
    fontSize: "15pt"
    fontWeight: 700
  metadata:
    fontSize: "13pt"
    lineHeight: 19
rounded:
  choice: "12pt"
  control: "14pt"
  fab: "16pt"
spacing:
  xs: "6pt"
  sm: "10pt"
  md: "16pt"
  lg: "22pt"
  xl: "28pt"
components:
  action-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.action-label}"
    rounded: "{rounded.control}"
    padding: "0 18pt"
  action-muted:
    backgroundColor: "{colors.accentSoft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "13pt 14pt"
  choice:
    backgroundColor: "{colors.accentSoft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.choice}"
    padding: "12pt 16pt"
  choice-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.choice}"
  issue-row:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    padding: "17pt 22pt"
---

# Design System: It's a Plan mobile

## Overview

**Creative North Star: "Operate"**

The native client extends the incumbent neutral workspace identity. Type weight,
spacing and small tonal differences establish hierarchy. Native navigation and
focused sheets keep work controls direct and readable.

This document applies to `apps/mobile`. `src/ui/theme.ts` and the native components
are the implementation authority. The repository root `DESIGN.md` describes the web
system; its CSS tokens, Inter font and dark appearance do not define native values.

**Key Characteristics:**
- Neutral surfaces and functional status color.
- System text and platform navigation.
- Readable issue lists and focused controls.

## Colors

Primary actions and selected choices use accent/ink with on-accent labels. Canvas,
surface and accentSoft separate content and controls; muted carries secondary text
and line supplies quiet separators. Danger marks errors and overdue dates. Priority
uses urgent, high, medium and low. Issue status dots use API-provided state colors.

**The Functional Color Rule.** Pair priority and status colors with visible text;
color alone must not carry their meaning.

Values above describe the light palette; `src/ui/palettes.ts` defines both palettes.
Use onAccent for selected controls rather than literal white. Contrast has not been
measured on a device for this native extension.

## Typography

Use the React Native system font with default font scaling. No custom font family
or scaling override is specified in the reviewed shared components. Numeric native
sizes are logical layout units; the frontmatter uses pt for portable documentation.

Screen titles, project titles, sheet titles, issue titles and metadata follow the
roles above. Field input text is 16; search text is 17; choice labels are 15; tab
labels are 11 at weight 600. Do not apply web display fonts to native screens.

**The Scalable Text Rule.** Keep text containers flexible as system text grows.
Issue titles permit three lines; status and assignee labels retain local truncation.
Device validation of large text remains outstanding.

## Layout

Use a single-column workspace on compact windows, with 22 logical units of horizontal
content padding. Regular iPad workspaces follow the adaptive layout below. `space`
exposes the five spacing values above; components also use local
gaps and padding. Lists use native `SectionList`, with the summary, search, display
controls and state choices inside the scrollable list header. Section headings do
not stick. Metadata wraps within an issue row.

**The Reachable Controls Rule.** Shared actions, choices, search clear, sheet Done
and row action controls use minimum 48-unit targets. Issue rows have minimum height
80. These are source constraints, not a claim about every control in the app.

Project creation uses a 52-unit minimum-height floating action, positioned at the
bottom safe-area inset plus 20; list bottom padding is inset plus 110. Maintain that
relationship when extending the list. Tab content respects the top safe area.

## Elevation & Depth

The reviewed shared primitives are flat. Tonal fills, whitespace and hairline issue
separators define grouping. Inputs have a one-unit line border. Root stack headers
disable their shadow. Native modal presentation supplies sheet depth; no custom
shadow or backdrop token is defined.

## Shapes

Search and choices use the choice radius, fields and actions use the control radius,
and the floating action uses the fab radius. Issue rows remain rectangular and span
the list width. Avoid enclosing each issue or control group in a decorative card.

## Components

- **Action:** primary or muted fill, centered label, minimum height 48. Disabled
  actions use opacity 0.5 and disable presses.
- **Field:** persistent label and accessible input name, surface fill and line
  border. Multiline input has minimum height 120. Native text editing handles focus.
- **SearchInput:** soft fill, search icon, named input and a labeled 48-unit clear
  action when nonempty. Search remains in the scrolling list header.
- **Choices:** horizontally scrollable options with label-derived accessible names
  and selected state. Selection uses ink fill and an onAccent semibold label.
- **NativeSheet:** React Native `Modal` with `formSheet` on regular windows and
  `pageSheet` on compact windows, `animationType="none"`,
  safe-area content, title header, Done and scrollable body. This rule applies to
  this component; route-based editor modals use Expo Router's native presentation.
- **IssueRow:** identifier, textual state and dot, title, then priority, due date
  and assignee. The accessible label includes metadata and overdue status. Main
  press opens the issue; a separate named action button exposes permitted edits.
  Long press supplements this visible action. Pressed rows use accentSoft.
- **Notice / EmptyState / Loading:** direct text, retry where applicable and native
  activity indication. Refresh errors preserve loaded content and explain its state.
- **Navigation:** Expo Router stack plus My work, Projects, Inbox and You. Search
  opens from workspace headers. Regular windows use a sidebar; compact windows use
  bottom tabs. Use Ionicons and native navigation affordances consistently.

## Do's and Don'ts

### Do:
- Do extend shared native primitives and preserve neutral hierarchy.
- Do retain visible metadata and accessible action names.
- Do keep list headers scrollable and respect safe-area creation controls.

### Don't:
- Don't communicate status or priority through color alone.
- Don't add decorative cards, custom sheet motion or display fonts.
- Don't claim dark appearance, Android readiness or device accessibility is verified.

Source evidence: `theme.ts`, `palettes.ts`, `primitives.tsx`, `work-controls.tsx`,
`IssueRow.tsx`, `IssueWorkspace.tsx`, navigation layouts and `app.config.ts`. The
release targets iPhone and iPad with automatic appearance. Android release readiness
remains unresolved. Cloud CI and native build outcomes are recorded in the release
report; device and Simulator UI acceptance remains outstanding. A web design
detector does not apply to these native components. The sidecar's HTML previews are
illustrative translations, not rendered native evidence or implementation tokens.

## Appearance and account

The native app supports System, Light and Dark appearance. The dark palette uses a #141414 canvas, #1E1E1E surfaces, #F1F1F1 text and #ADADAD secondary text. Selected controls invert their foreground through onAccent. All native styles resolve from the active palette; navigation, status bar, keyboards and date pickers follow the same choice.

The You screen groups device preferences separately from account actions. Appearance, launch destination and haptics persist locally. Profile name and password use the existing shared account API. Search opens from workspace headers; the bottom bar contains My work, Projects, Inbox and You.

## iPad workspace

The Operate layout follows the available window width and accessibility text size. Regular windows use the native navigation sidebar. Work areas of at least 900pt show a 360–420pt task list beside the shared issue detail surface. Selection remains mounted when the window narrows, with a Back to list control; phone-width list selections use the existing navigation stack. Very large text uses one column and bottom navigation.

Account and project directories have bounded reading widths. Focused forms and filter editors use native form sheets on regular windows. iPad supports both orientations and multitasking. Pointer and keyboard access use the same native controls and accessibility labels as touch. Hardware and Simulator visual acceptance remains a separate validation step.

## Issue reading and properties

Issue lists and detail properties share status dots with API colors and priority
symbols. Keep text labels beside both. Detail titles use 26/34 semibold system text;
Markdown body uses 16/26, with compact headings, lists, code, quotations and tables.
Tables and code scroll horizontally instead of squeezing the reading column. Image
syntax remains an accessible attachment link. Raw HTML renders as inert text.

Properties align a quiet label column with the current value and a 48pt editing
target. Status, priority and assignee open focused native choice sheets. The current
choice stays marked, mutations lock controls, and failed saves leave the sheet open.
Dates are localized; overdue dates include a text cue as well as the danger color.
Description editing offers Write and Preview without replacing the saved Markdown.
Shared surfaces resolve in both appearance palettes and the iPad detail workspace.
