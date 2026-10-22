import { mkdir, copyFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const mobile = resolve(import.meta.dir, '..');
const tools = process.env.MOBILE_UI_TOOLS;
if (!tools) throw new Error('MOBILE_UI_TOOLS must name the isolated QA dependency directory.');
const output = resolve(process.env.RUNNER_TEMP ?? '/tmp', 'itsaplan-mobile-ui-output');
await mkdir(output, { recursive: true });
const bridge = resolve(import.meta.dir, 'bridges.tsx');
const result = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'entry.tsx')],
  outdir: output,
  target: 'browser',
  define: { __DEV__: 'false', 'process.env.NODE_ENV': '"production"' },
  plugins: [
    {
      name: 'native-fixture-bridges',
      setup(build) {
        build.onResolve({ filter: /^(react|react-dom)(\/.*)?$/ }, ({ path }) => ({
          path: Bun.resolveSync(path, tools),
        }));
        build.onResolve({ filter: /^react-native$/ }, () => ({
          path: resolve(import.meta.dir, 'native.tsx'),
        }));
        build.onResolve({ filter: /^react-native-web$/ }, () => ({
          path: Bun.resolveSync('react-native-web', tools),
        }));
        build.onResolve(
          {
            filter:
              /^(@react-navigation\/native|expo-router|expo-secure-store|expo-haptics|expo-linking|expo-document-picker|expo-file-system|expo\/fetch|react-native-safe-area-context|@react-native-community\/datetimepicker|@expo\/vector-icons)$/,
          },
          () => ({ path: bridge }),
        );
        build.onResolve({ filter: /^(\.\/auth|@\/lib\/auth)$/ }, () => ({ path: bridge }));
        build.onResolve({ filter: /^@\// }, ({ path }) => ({
          path: Bun.resolveSync(path.replace('@/', `${mobile}/src/`), mobile),
        }));
      },
    },
  ],
});
if (!result.success) throw new AggregateError(result.logs, 'Mobile fixture bundle failed');
const icons = dirname(Bun.resolveSync('@expo/vector-icons/package.json', mobile));
await copyFile(
  resolve(icons, 'build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  resolve(output, 'Ionicons.ttf'),
);
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mobile UI fixture</title><style>@font-face{font-family:Ionicons;src:url(/Ionicons.ttf)}html,body,#root{margin:0;height:100%;overflow:hidden}#root{display:flex;flex-direction:column}*:focus-visible{outline:2px solid #3569c8}</style><div id="root"></div><script type="module" src="/entry.js"></script></html>`;
Bun.serve({
  hostname: '127.0.0.1',
  port: 4173,
  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/'))
      return Response.json(
        { error: 'Fixture requests must be intercepted by the test.' },
        { status: 500 },
      );
    if (path === '/entry.js' || path === '/Ionicons.ttf')
      return new Response(Bun.file(resolve(output, path.slice(1))));
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  },
});
console.log('Synthetic mobile UI fixture listening on http://127.0.0.1:4173');
