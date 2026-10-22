# It's a Plan for iOS

Expo SDK 55 client for the existing It's a Plan API. The app includes email or username sign-in, projects, work-item lists by state or across the board, archives, issue creation and editing (type, priority, assignee, labels, dates, estimate, cycle and initiative), custom field viewing and editing for text, number, boolean, date, select and member fields, subtasks, following, comments and paginated activity, checklists, attachment upload, open and delete, time logging, issue links, project or workspace search, and Inbox with a saved all-project or current-project scope.

## Configuration

Set `EXPO_PUBLIC_API_URL` to the HTTPS origin of the API. Set `IOS_BUNDLE_IDENTIFIER` to the identifier registered in the Apple Developer account. The app is linked to the EAS project `@ravefox/plan` (`c0ae89bb-ba6e-4400-877f-2970832536e0`); `EAS_PROJECT_ID` can override it for another installation. The API must include the `@better-auth/expo` server plugin from this branch so native session cookies can be stored securely on the device.

The API URL defaults to the SEKTA instance for local development. An EAS build for another installation must set `EXPO_PUBLIC_API_URL` in its build environment.

Cross-project issue links need the separate cross-project API change. Without it, the server only accepts links inside one project. The picker only shows projects in the same team and lets the server enforce permissions on both issues.

## Web feature coverage

The mobile client now covers the daily issue and Inbox flows. The web application still owns administrative settings, team and integration management, notes canvas, timeline and calendar views, bulk board operations, and complex custom-field editors (datetime and ranges). Native push notifications are not configured; the Inbox fetches updates when opened and refreshes its unread count while the app is active. These need separate product and device validation before claiming complete web parity.

## Development

From the repository root, install the workspace with `bun install`. Then run `bun --cwd apps/mobile start` to launch Expo. The app uses the same email and password as the web client.

## iOS release candidate

1. Register the bundle identifier with the Apple Developer team and connect the Expo project to EAS.
2. Set `EXPO_PUBLIC_API_URL` and `IOS_BUNDLE_IDENTIFIER` for the build profile.
3. Deploy the API auth plugin and confirm native sign-in against the target instance.
4. Run the repository checks and an iOS device build on the approved build host.
5. Complete a device pass for sign-in, projects, board, issue and custom-field edits, date selection, subtasks, following, archive and restore, attachment upload, open and delete, comments, long activity feeds, project and workspace search, Inbox, sign-out, account switching, and a cold app restart.
6. Build the `simulator` profile for testing without Apple credentials. Build the `preview` profile for internal device distribution after iOS signing is configured, then use `production` for TestFlight.

This branch contains the source and release configuration. Device builds still require an Apple Developer team and bundle identifier.
