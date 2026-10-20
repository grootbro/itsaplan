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

Values above mirror `theme.ts`; on-accent records the repeated white literal in
components. Contrast has not been measured for this native extension.

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

Use a portrait, single-column workspace with 22 logical units of horizontal content
padding. `space` exposes the five spacing values above; components also use local
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
  and selected state. Selection uses ink fill and a white semibold label.
- **NativeSheet:** React Native `Modal` with `pageSheet`, `animationType="none"`,
  safe-area content, title header, Done and scrollable body. This rule applies to
  this component; route-based editor modals use Expo Router's native presentation.
- **IssueRow:** identifier, textual state and dot, title, then priority, due date
  and assignee. The accessible label includes metadata and overdue status. Main
  press opens the issue; a separate named action button exposes permitted edits.
  Long press supplements this visible action. Pressed rows use accentSoft.
- **Notice / EmptyState / Loading:** direct text, retry where applicable and native
  activity indication. Refresh errors preserve loaded content and explain its state.
- **Navigation:** Expo Router stack plus My work, Projects, Inbox, Search and You
  tabs. Use Ionicons and native navigation affordances consistently.

## Do's and Don'ts

### Do:
- Do extend shared native primitives and preserve neutral hierarchy.
- Do retain visible metadata and accessible action names.
- Do keep list headers scrollable and respect safe-area creation controls.

### Don't:
- Don't communicate status or priority through color alone.
- Don't add decorative cards, custom sheet motion or display fonts.
- Don't claim dark appearance, Android readiness or device accessibility is verified.

Source evidence: `theme.ts`, `primitives.tsx`, `work-controls.tsx`, `IssueRow.tsx`,
project/My work lists, navigation layouts and `app.config.ts`. Configuration selects
light appearance and iOS phone release intent; Android release identifiers and
readiness are unresolved. No builds, tests, lint, typecheck, detector, server,
simulator, screenshot or device QA was run. A web design detector does not apply to
these native components. The sidecar's HTML previews are illustrative translations,
not rendered native evidence or additional implementation tokens.
