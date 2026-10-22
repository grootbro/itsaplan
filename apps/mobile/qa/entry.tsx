import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import Project from '../app/project/[key]';
import NewIssue from '../app/new-issue/[key]';
import EditIssue from '../app/edit-issue/[id]';
import Planning from '../app/planning/[key]';
import PlanningDetail from '../app/planning-detail/[kind]/[id]';
import { IssueDetailPanel } from '../src/ui/IssueDetailPanel';
import { PreferencesProvider } from '../src/lib/preferences-context';
import { ProjectScopeProvider } from '../src/lib/project-scope';
import { router, useLocation } from './bridges';

const client = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: Infinity } },
});
function Fixture() {
  const path = new URL(useLocation()).pathname;
  let content = <Project />;
  if (path.startsWith('/issue/'))
    content = <IssueDetailPanel issueId={Number(path.split('/')[2])} />;
  if (path.startsWith('/edit-issue/')) content = <EditIssue />;
  if (path.startsWith('/new-issue/')) content = <NewIssue />;
  if (path.startsWith('/planning/')) content = <Planning />;
  if (path.startsWith('/planning-detail/')) content = <PlanningDetail />;
  return (
    <QueryClientProvider client={client}>
      <PreferencesProvider>
        <ProjectScopeProvider>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', minHeight: 44, gap: 24 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fixture back"
                onPress={router.back}
              >
                <Text>Back</Text>
              </Pressable>
              <Text>Synthetic mobile UI fixture</Text>
            </View>
            {content}
          </View>
        </ProjectScopeProvider>
      </PreferencesProvider>
    </QueryClientProvider>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
