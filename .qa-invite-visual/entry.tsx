import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from 'next-themes';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { Users } from 'lucide-react';
import InviteStart from '@/features/invite/components/InviteStart';
import InviteActions from '@/features/invite/components/InviteActions';
import AccountInvitationsPage from '@/features/account/AccountInvitationsPage';
import StartEmpty from '@/components/layout/StartEmpty';
import { TooltipProvider } from '@/components/ui/tooltip';
import { qk } from '@/services/queryKeys';
const catalogs=__CATALOGS__;
const params=new URLSearchParams(location.search);
const locale=params.get('locale')==='ru'?'ru':'en';
const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity}}});
for(const key of [qk.projects,qk.teams,qk.workspaces,qk.receivedInvites])client.setQueryData(key,[]);
const account=location.pathname.startsWith('/account/invitations');
if(account)client.setQueryData(qk.projects,[{id:99,ref:'existing.PRJ'}]);
Object.assign(window,{__QC__:client,__NAV__:[]});
const router={push:(p)=>window.__NAV__.push(p),replace:(p)=>window.__NAV__.push(p),refresh(){},back(){},forward(){},prefetch(){}};
let content=<InviteStart><div id="fallback"><StartEmpty icon={<Users/>} title={catalogs[locale].shell.noTeamsTitle} hint={catalogs[locale].shell.noTeamsHint}/></div></InviteStart>;
if(account)content=<AccountInvitationsPage/>;
else if(params.get('scenario')==='accept')content=<InviteActions token="00000000-0000-4000-8000-000000000001" projectKey={null}/>;
createRoot(document.getElementById('root')).render(
<AppRouterContext.Provider value={router}><QueryClientProvider client={client}><NextIntlClientProvider locale={locale} messages={catalogs[locale]} timeZone="UTC"><ThemeProvider attribute="class" defaultTheme={params.get('theme')==='dark'?'dark':'light'} enableSystem={false}><TooltipProvider>
{content}
</TooltipProvider></ThemeProvider></NextIntlClientProvider></QueryClientProvider></AppRouterContext.Provider>);
