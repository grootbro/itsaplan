import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { inboxProjectId, resolveInboxScope, type InboxScope } from '@/lib/inbox-scope';
import { useProjectScope } from '@/lib/project-scope';
import { Action, EmptyState, Loading, ScreenTitle } from '@/ui/primitives';
import { useColors, useThemedStyles, type Palette } from '@/ui/theme';

export default function Inbox() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { projectKey, inboxAll, setInboxAll } = useProjectScope();
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const project = projects.data?.find((item) => item.key === projectKey);
  const scope = resolveInboxScope(inboxAll, projectKey, projects.data);
  const ready = scope !== null;
  const inbox = useInfiniteQuery({
    queryKey: ['inbox', scope],
    initialPageParam: undefined as { ts: string; id: number } | undefined,
    queryFn: ({ pageParam }) => api.notifications(inboxProjectId(scope), pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: ready,
  });
  const unread = useQuery({
    queryKey: ['unread', scope],
    queryFn: () => api.unread(inboxProjectId(scope)),
    enabled: ready,
  });
  const markRead = useMutation({
    mutationFn: (id: number) => api.markRead(id, true),
    onError: (error) => Alert.alert('Could not mark notification read', error.message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['unread'] });
    },
  });
  const markAll = useMutation({
    mutationFn: (target: Exclude<InboxScope, null>) => api.markAllRead(target),
    onError: (error) => Alert.alert('Could not mark Inbox read', error.message),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['unread'] });
    },
  });

  return (
    <View style={styles.screen}>
      <ScreenTitle
        title="Inbox"
        eyebrow={ready && unread.data ? `${unread.data.unread} unread` : 'Updates'}
        action={
          ready && unread.data?.unread ? (
            <Pressable
              accessibilityRole="button"
              disabled={markAll.isPending}
              accessibilityState={{ disabled: markAll.isPending, busy: markAll.isPending }}
              onPress={() => {
                if (scope !== null && !markAll.isPending) markAll.mutate(scope);
              }}
            >
              <Text style={styles.markAll}>{markAll.isPending ? 'Marking read…' : 'Read all'}</Text>
            </Pressable>
          ) : undefined
        }
      />
      <View style={styles.scope}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setInboxAll(true)}
          style={[styles.scopeOption, inboxAll && styles.scopeActive]}
        >
          <Text style={[styles.scopeText, inboxAll && styles.scopeTextActive]}>All projects</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={!project}
          onPress={() => setInboxAll(false)}
          style={[
            styles.scopeOption,
            !inboxAll && styles.scopeActive,
            !project && { opacity: 0.45 },
          ]}
        >
          <Text style={[styles.scopeText, !inboxAll && styles.scopeTextActive]}>
            {project?.name ?? 'This project'}
          </Text>
        </Pressable>
      </View>
      {!inboxAll && projects.isPending ? (
        <Loading />
      ) : !inboxAll && projects.isError && !projects.data ? (
        <View style={{ flex: 1 }}>
          <EmptyState title="Projects unavailable" detail="Retry to load your selected project." />
          <Action label="Retry" onPress={() => void projects.refetch()} />
        </View>
      ) : !ready ? (
        <EmptyState
          title="Choose a project"
          detail="Open a project first, or switch to all projects."
        />
      ) : inbox.isLoading ? (
        <Loading />
      ) : inbox.isError && !inbox.data ? (
        <View style={{ flex: 1 }}>
          <EmptyState title="Inbox unavailable" detail="Check your connection and retry." />
          <Action
            label="Retry"
            onPress={() => void Promise.all([inbox.refetch(), unread.refetch()])}
          />
        </View>
      ) : (
        <FlatList
          data={inbox.data?.pages.flatMap((page) => page.items) ?? []}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={inbox.isRefetching}
              onRefresh={() => void Promise.all([inbox.refetch(), unread.refetch()])}
              tintColor={colors.accent}
            />
          }
          onEndReached={() => {
            if (inbox.hasNextPage && !inbox.isFetching && !inbox.isFetchNextPageError)
              void inbox.fetchNextPage();
          }}
          onEndReachedThreshold={0.4}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              title="You're all caught up"
              detail="New work and mentions will appear here."
            />
          }
          ListHeaderComponent={
            <View>
              {!inboxAll && projects.isError ? (
                <Action
                  label="Could not refresh projects. Retry"
                  onPress={() => void projects.refetch()}
                />
              ) : null}
              {inbox.isRefetchError ? (
                <Action label="Could not refresh. Retry" onPress={() => void inbox.refetch()} />
              ) : null}
            </View>
          }
          ListFooterComponent={
            <View>
              {inbox.isFetchingNextPage ? <Loading /> : null}
              {inbox.isFetchNextPageError ? (
                <Action
                  label="Could not load more. Retry"
                  onPress={() => void inbox.fetchNextPage()}
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.item, !item.readAt && styles.unreadItem]}
              onPress={() => {
                if (!item.readAt) markRead.mutate(item.id);
                router.push(`/issue/${item.issueId}`);
              }}
              accessibilityRole="button"
            >
              <View style={[styles.dot, item.readAt && styles.readDot]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.context}>
                  {item.projectKey} · {item.type.replaceAll('_', ' ')}
                </Text>
                <Text style={[styles.title, !item.readAt && styles.unreadTitle]} numberOfLines={2}>
                  {item.issueTitle}
                </Text>
                <Text style={styles.detail}>
                  {item.actorName ?? 'Workspace'} · {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    markAll: { color: colors.ink, fontSize: 13, fontWeight: '700' },
    scope: {
      flexDirection: 'row',
      marginHorizontal: 22,
      marginBottom: 15,
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      padding: 4,
    },
    scopeOption: {
      flex: 1,
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 10,
      alignItems: 'center',
    },
    scopeActive: { backgroundColor: colors.surface },
    scopeText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    scopeTextActive: { color: colors.ink },
    list: { paddingBottom: 32 },
    item: {
      paddingHorizontal: 22,
      paddingVertical: 17,
      backgroundColor: colors.canvas,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      flexDirection: 'row',
      gap: 11,
    },
    unreadItem: { backgroundColor: colors.surface },
    dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
    readDot: { backgroundColor: 'transparent' },
    context: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    title: { color: colors.ink, fontSize: 16, fontWeight: '500', marginTop: 5, lineHeight: 23 },
    unreadTitle: { fontWeight: '700' },
    detail: { color: colors.muted, fontSize: 12, marginTop: 7 },
  });
