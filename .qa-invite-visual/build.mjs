import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
const root=process.cwd();
const out='/tmp/invite-evidence/fixture';
await mkdir(out,{recursive:true});
const catalogs={};
for(const locale of ['en','ru']) {
 catalogs[locale]={};
 for(const name of await readdir(`${root}/apps/web/messages/${locale}`)) if(name.endsWith('.json')) catalogs[locale][name.slice(0,-5)]=JSON.parse(await readFile(`${root}/apps/web/messages/${locale}/${name}`,'utf8'));
}
let entry=await readFile(`${root}/.qa-invite-visual/entry.tsx`,'utf8');
entry=entry.replace('__CATALOGS__',JSON.stringify(catalogs));
await writeFile(`${root}/.qa-invite-visual/generated.tsx`,entry);
const result=await Bun.build({entrypoints:[`${root}/.qa-invite-visual/generated.tsx`],outdir:out,naming:'app.js',target:'browser',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'web-fixture',setup(build){
 build.onResolve({filter:/^@\//},({path:specifier})=>({path:Bun.resolveSync(`${root}/apps/web/src/${specifier.slice(2)}`,`${root}/apps/web`)}));
 build.onResolve({filter:/^[^./]/},({path:specifier,importer})=>({path:Bun.resolveSync(specifier,importer&&!importer.includes('/.qa-invite-visual/')?path.dirname(importer):`${root}/apps/web`)}));
}}]});
if(!result.success) throw new Error(result.logs.join('\n'));
const require=createRequire(`${root}/apps/web/package.json`);
const tailwindModule=require('@tailwindcss/postcss');
const tailwind=typeof tailwindModule==='function'?tailwindModule:tailwindModule.default;
const postcss=createRequire(require.resolve('@tailwindcss/postcss'))('postcss');
const source=`${root}/apps/web/src/app/globals.css`;
const fontPath=require.resolve('inter-ui/inter-variable.css');
let font=await readFile(fontPath,'utf8');
for(const match of font.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
 const bytes=await readFile(path.resolve(path.dirname(fontPath),match[1].split(/[?#]/)[0]));
 font=font.replace(match[0],`url(data:font/woff2;base64,${bytes.toString('base64')})`);
}
const css=(await readFile(source,'utf8')).replace("@import 'inter-ui/inter-variable.css';",font);
const built=await postcss([tailwind({base:`${root}/apps/web`,optimize:false})]).process(css,{from:source,to:`${out}/app.css`});
await writeFile(`${out}/app.css`,built.css);
