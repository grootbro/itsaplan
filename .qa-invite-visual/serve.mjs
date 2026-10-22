const out='/tmp/invite-evidence/fixture';
Bun.serve({port:4189,hostname:'127.0.0.1',fetch(request){
 const url=new URL(request.url);
 if(url.pathname==='/app.js')return new Response(Bun.file(out+'/app.js'));
 if(url.pathname==='/app.css')return new Response(Bun.file(out+'/app.css'));
 return new Response(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/app.css"></head><body class="bg-background text-foreground"><div id="root"></div><script>window.process={env:{NODE_ENV:'production'},browser:true};window.__ITSAPLAN_ENV__={apiUrl:'http://127.0.0.1:4189',privacyUrl:'',termsUrl:''}</script><script type="module" src="/app.js"></script></body></html>`,{headers:{'content-type':'text/html'}});
}});
