import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Appearance, AppState, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProjectScopeProvider, useProjectScope } from '@/lib/project-scope';
import { authClient } from '@/lib/auth';
import { Loading } from '@/ui/primitives';
import { useColors, useTheme } from '@/ui/theme';
import { PreferencesProvider, usePreferences } from '@/lib/preferences-context';

function RootNavigator() {
  const colors = useColors();
  const { dark } = useTheme();
  const { width } = useWindowDimensions();
  const presentation = width >= 768 ? 'formSheet' : 'modal';
  const { ready } = usePreferences();
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
  if (!ready || isPending || activeUserId !== userId) return <Loading />;

  return (
    <ThemeProvider
      value={{
        ...(dark ? DarkTheme : DefaultTheme),
        colors: {
          ...(dark ? DarkTheme : DefaultTheme).colors,
          primary: colors.accent,
          background: colors.canvas,
          card: colors.canvas,
          text: colors.ink,
          border: colors.line,
          notification: colors.danger,
        },
      }}
    >
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
          <Stack.Screen name="search" options={{ title: 'Search' }} />
          <Stack.Screen name="profile" options={{ title: 'Edit profile', presentation }} />
          <Stack.Screen
            name="change-password"
            options={{ title: 'Change password', presentation }}
          />
          <Stack.Screen name="project/[key]" options={{ title: 'Project' }} />
          <Stack.Screen name="planning/[key]" options={{ title: 'Planning' }} />
          <Stack.Screen name="planning-detail/[kind]/[id]" options={{ title: 'Planning' }} />
          <Stack.Screen name="issue/[id]" options={{ title: 'Issue' }} />
          <Stack.Screen name="edit-issue/[id]" options={{ title: 'Edit issue', presentation }} />
          <Stack.Screen
            name="edit-field/[issueId]/[fieldId]"
            options={{ title: 'Edit field', presentation }}
          />
          <Stack.Screen name="link-issue/[id]" options={{ title: 'Link issue', presentation }} />
          <Stack.Screen name="log-time/[id]" options={{ title: 'Log time', presentation }} />
          <Stack.Screen name="new-issue/[key]" options={{ title: 'New issue', presentation }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

function DeviceAppearance() {
  const { preferences } = usePreferences();
  const { dark } = useTheme();
  useEffect(() => {
    Appearance.setColorScheme(preferences.theme === 'system' ? 'unspecified' : preferences.theme);
    return () => Appearance.setColorScheme('unspecified');
  }, [preferences.theme]);
  return <StatusBar style={dark ? 'light' : 'dark'} />;
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
        <PreferencesProvider>
          <ProjectScopeProvider>
            <DeviceAppearance />
            <RootNavigator />
          </ProjectScopeProvider>
        </PreferencesProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
