import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import { tabletNavigation } from '@/lib/adaptive-layout';
import { Redirect, Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@/lib/auth';
import { api } from '@/lib/api';
import { inboxProjectId, resolveInboxScope } from '@/lib/inbox-scope';
import { useProjectScope } from '@/lib/project-scope';
import { Loading } from '@/ui/primitives';
import { useColors } from '@/ui/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function TabLayout() {
  const colors = useColors();
  const { width, fontScale } = useWindowDimensions();
  const sidebar = tabletNavigation(width, fontScale);
  const { data, isPending } = authClient.useSession();
  const { projectKey, inboxAll } = useProjectScope();
  const projects = useQuery({
    queryKey: ['projects'],
    queryFn: api.projects,
    enabled: !!data?.user,
  });
  const scope = resolveInboxScope(inboxAll, projectKey, projects.data);
  const unread = useQuery({
    queryKey: ['unread', scope],
    queryFn: () => api.unread(inboxProjectId(scope)),
    enabled: !!data?.user && scope !== null,
    refetchInterval: 60_000,
  });
  if (isPending) return <Loading />;
  if (!data?.user) return <Redirect href="/login" />;

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: colors.canvas }}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarPosition: sidebar ? 'left' : 'bottom',
          tabBarLabelPosition: sidebar ? 'beside-icon' : 'below-icon',
          tabBarItemStyle: sidebar
            ? { minHeight: 52, marginVertical: 4, marginHorizontal: 8, borderRadius: 12 }
            : undefined,
          tabBarActiveBackgroundColor: sidebar ? colors.accentSoft : undefined,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.canvas,
            borderTopColor: colors.line,
            paddingTop: sidebar ? 24 : 8,
            width: sidebar ? 200 : undefined,
            borderRightColor: colors.line,
            borderTopWidth: sidebar ? 0 : 1,
          },
          tabBarLabelStyle: { fontSize: sidebar ? 15 : 11, fontWeight: '600', letterSpacing: 0.1 },
        }}
      >
        <Tabs.Screen
          name="my-work"
          options={{
            title: 'My work',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkbox-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="projects"
          options={{
            title: 'Projects',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="grid-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
            tabBarBadge: scope !== null ? unread.data?.unread || undefined : undefined,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="mail-unread-outline" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="account"
          options={{
            title: 'You',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle-outline" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
