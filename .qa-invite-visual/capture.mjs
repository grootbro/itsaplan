import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '/tmp/invite-browser/node_modules/playwright/index.mjs';
const browser=await chromium.launch({headless:true});
const receipts=[];
const token='00000000-0000-4000-8000-000000000001';
const items=[{token,teamName:'Community product research and engineering collaboration',projectName:'Customer feedback and onboarding improvements'},{token:'00000000-0000-4000-8000-000000000002',teamName:'Команда совместной разработки и проверки интерфейсов',projectName:null}];
for(const spec of [
{name:'desktop-en',width:1100,height:800,locale:'en',scenario:'list'},
{name:'mobile-ru',width:390,height:844,locale:'ru',scenario:'list'},
{name:'desktop-dark',width:1100,height:800,locale:'en',scenario:'list',theme:'dark'},
{name:'mobile-error',width:390,height:844,locale:'ru',scenario:'error'},
{name:'desktop-loading',width:1100,height:800,locale:'en',scenario:'loading'},
{name:'empty',width:390,height:844,locale:'en',scenario:'empty'},
{name:'unverified',width:390,height:844,locale:'en',scenario:'unverified'},
{name:'accept-cache',width:1100,height:800,locale:'en',scenario:'accept'},
]) {
 const page=await browser.newPage({viewport:{width:spec.width,height:spec.height}});
 const errors=[];const posts=[];let inviteReads=0;let fail=spec.scenario==='error';
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const request=route.request();const path=new URL(request.url()).pathname;
  if(path==='/'||path==='/app.js'||path==='/app.css'){await route.continue();return;}
  if(request.method()==='POST')posts.push(path);
  let data={};let status=200;
  if(path.endsWith('/auth/get-session'))data={session:{id:'fixture-session',userId:'fixture-user',token:'synthetic',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString()},user:{id:'fixture-user',name:'Ada Example',email:'ada@example.test',emailVerified:spec.scenario!=='unverified',role:'user',image:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}};
  else if(path.endsWith('/me/invites')) {
   inviteReads++;
   if(spec.scenario==='loading'){await new Promise(r=>setTimeout(r,5000));}
   if(fail){status=500;data={error:'Synthetic outage'};}
   else data={items:spec.scenario==='empty'?[]:items,total:spec.scenario==='empty'?0:items.length,page:1,pageSize:10};
  } else if(path.endsWith('/accept'))data={teamName:'Example team',teamRef:'1.example',projectKey:null,projectName:null,role:null};
  else if(path.endsWith('/auth-config'))data={registration:'open',emailPassword:true,google:false,oidc:false};
  else if(path.includes('/preferences'))data={};
  else {status=404;data={error:`Unmocked ${path}`};}
  try{await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});}catch{}
 });
 await page.goto(`http://127.0.0.1:4189/?locale=${spec.locale}&scenario=${spec.scenario}&theme=${spec.theme??'light'}`);
 if(spec.scenario==='accept') {
  await page.getByRole('button',{name:'Accept invitation',exact:true}).click();
  await page.waitForFunction(()=>window.__NAV__.includes('/'));
  const states=await page.evaluate(()=>['projects','teams','workspaces','receivedInvites'].map(key=>window.__QC__.getQueryState([key])?.isInvalidated));
  assert.deepEqual(states,[true,true,true,true]);
 } else if(['empty','unverified'].includes(spec.scenario)) {
  await page.locator('#fallback').waitFor();
  if(spec.scenario==='unverified')assert.equal(inviteReads,0);
 } else if(spec.scenario==='error') {
  await page.getByRole('alert').waitFor();
 } else if(spec.scenario==='loading') {
  await page.getByRole('status').waitFor();
 } else {
  await page.locator(`a[href="/invite/${token}"]`).waitFor();
  assert.equal(await page.locator('a[href^="/invite/"]').count(),2);
 }
 await page.evaluate(()=>document.fonts.ready);
 const width=await page.evaluate(()=>document.documentElement.scrollWidth);
 assert.ok(width<=spec.width,`${spec.name}: overflow ${width}/${spec.width}`);
 if(!['empty','unverified','accept'].includes(spec.scenario))await page.screenshot({path:`/tmp/invite-evidence/${spec.name}.png`,fullPage:true});
 if(spec.scenario==='error') {fail=false;await page.getByRole('button',{name:'Повторить попытку',exact:true}).click();await page.locator('a[href^="/invite/"]').first().waitFor();}
 if(spec.scenario==='list') {
  await page.locator(`a[href="/invite/${token}"]`).click();
  await page.waitForFunction(t=>window.__NAV__.includes('/invite/'+t),token);
  await page.getByRole('button',{name:spec.locale==='ru'?'Продолжить без вступления':'Continue without joining',exact:true}).click();
  await page.locator('#fallback').waitFor();
 }
 if(spec.scenario!=='accept')assert.equal(posts.length,0,'Discovery must not accept an invitation');
 assert.deepEqual(errors,[]);
 receipts.push({...spec,documentWidth:width,inviteReads,posts,errors});
 await page.close();
}
await writeFile('/tmp/invite-evidence/browser-receipts.json',JSON.stringify(receipts,null,2));
await browser.close();
