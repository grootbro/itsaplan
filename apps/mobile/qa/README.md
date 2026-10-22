# Synthetic mobile UI scenarios

The existing CI workflow installs the locked tools in an isolated temporary directory,
builds the real mobile routes and components with Bun, and runs Chromium against a
local fixture. Network requests are restricted to localhost and every API operation is
handled with synthetic records. No production accounts, cookies or mutations are used.

Native bridges are replaced: router history, safe areas, SecureStore, haptics, linking,
file/document selection and date picker. Native upload/date-picker interaction is not
covered. `native.tsx` maps native `accessibilityState` and initial `contentOffset` onto
React Native Web, whose pinned version does not implement these native props:
[accessibility source](https://github.com/necolas/react-native-web/blob/0.21.2/packages/react-native-web/src/modules/createDOMProps/index.js),
[scroll source](https://github.com/necolas/react-native-web/blob/0.21.2/packages/react-native-web/src/exports/ScrollView/index.js).

Assertions establish source-level UI contracts in this synthetic environment. Browser
history is a router adapter; scroll restoration uses an explicit compatibility bridge.
Browser screenshots are layout evidence only. These results do not establish native
accessibility, Dynamic Type, gesture handling, UIKit navigation, native scroll restoration,
or physical iPhone/iPad/Android acceptance. Those remain separate native checks.

The fixture and its tools are excluded from native TypeScript compilation and EAS uploads.
Production routing and API code contain no test bypass flags.

The core task scenarios exercise the real create/edit form, changed-field PATCH payload,
failed-save draft retention, member/agent choices, duplicate submit prevention, Markdown
preview, comment creation, read-only controls, upload metadata and per-file failures.
The fixture maps `usePreventRemove` to its Back button and native Alert decisions to browser
confirm dialogs. Browser Back/Forward is only history behavior; native swipes need acceptance.
Its FormData adapter converts the native URI descriptor into synthetic bytes with the same
filename and MIME. This verifies metadata handling, not native transport or provider access.

The separate cloud export job compiles iOS and Android JavaScript/assets through Expo Metro.
It does not produce a signed binary or validate native module linking. Expo export options:
https://docs.expo.dev/more/expo-cli/#exporting

Timeline scenarios cover scale persistence, common search, collapsed groups, interval
opening, sticky labels during horizontal pan, restored position after Back, read-only
controls, empty recovery and iPad resizing. The timeline model is also tested under
America/New_York and Asia/Tokyo in CI. Synthetic pan/scroll offsets are browser contracts.
Native iPhone/iPad acceptance must check horizontal/vertical gesture arbitration, large
Dynamic Type, VoiceOver interval labels, opening/editing dates and returning, huge date
ranges and Split View changes. Date picker interaction remains a native-only check.
