import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProjectScopeProvider, useProjectScope } from '@/lib/project-scope';
import { authClient } from '@/lib/auth';
import { Loading } from '@/ui/primitives';
import { colors } from '@/ui/theme';

function RootNavigator() {
  const { data, isPending } = authClient.useSession();
  const queryClient = useQueryClient();
  const { clearProject } = useProjectScope();
  const [activeUserId, setActiveUserId] = useState<string | null | undefined>(undefined);
  const userId = data?.user?.id ?? null;
  useEffect(() => {
    if (isPending) return;
    if (activeUserId !== undefined && activeUserId !== userId) {
      queryClient.clear();
      clearProject();
    }
    setActiveUserId(userId);
  }, [activeUserId, clearProject, isPending, queryClient, userId]);
  if (isPending || activeUserId !== userId) return <Loading />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.canvas },
        headerTintColor: colors.ink,
        contentStyle: { backgroundColor: colors.canvas },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Protected guard={!data?.user}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!data?.user}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="project/[key]" options={{ title: 'Project' }} />
        <Stack.Screen name="issue/[id]" options={{ title: 'Issue' }} />
        <Stack.Screen
          name="edit-issue/[id]"
          options={{ title: 'Edit issue', presentation: 'modal' }}
        />
        <Stack.Screen
          name="edit-field/[issueId]/[fieldId]"
          options={{ title: 'Edit field', presentation: 'modal' }}
        />
        <Stack.Screen
          name="link-issue/[id]"
          options={{ title: 'Link issue', presentation: 'modal' }}
        />
        <Stack.Screen name="log-time/[id]" options={{ title: 'Log time', presentation: 'modal' }} />
        <Stack.Screen
          name="new-issue/[key]"
          options={{ title: 'New issue', presentation: 'modal' }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (AppState.currentState) focusManager.setFocused(AppState.currentState === 'active');
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 20_000, retry: 1, refetchOnReconnect: true },
        },
      }),
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ProjectScopeProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </ProjectScopeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
