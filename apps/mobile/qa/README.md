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
