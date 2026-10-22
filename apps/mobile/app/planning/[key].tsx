import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { planningApi } from '@/lib/planning-api';
import {
  canReadPlanning,
  initiativeStatuses,
  nextPlanningPage,
  type PlanningKind,
} from '@/lib/planning-model';
import { Action, EmptyState, Loading } from '@/ui/primitives';
import { Choices, Notice, SearchInput } from '@/ui/work-controls';
import { PlanningEditor } from '@/ui/PlanningEditor';
import { PlanningSummary } from '@/ui/PlanningSummary';
import { useColors } from '@/ui/theme';

export default function PlanningRoute() {
  const { key, kind } = useLocalSearchParams<{ key: string; kind: string }>();
  if (kind !== 'cycles' && kind !== 'initiatives')
    return <EmptyState title="Section unavailable" />;
  return <PlanningList key={`${key}.${kind}`} projectRef={key} kind={kind} />;
}
function PlanningList({ projectRef, kind }: { projectRef: string; kind: PlanningKind }) {
  const colors = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const client = useQueryClient();
  const runtimeKey = ['planning-runtime', projectRef, kind];
  const previous = client.getQueryData<{
    search: string;
    status: string;
    completed: boolean;
    y: number;
  }>(runtimeKey);
  const [search, setSearch] = useState(previous?.search ?? '');
  const [submitted, setSubmitted] = useState(previous?.search ?? '');
  const [status, setStatus] = useState(previous?.status ?? 'all');
  const [completed, setCompleted] = useState(previous?.completed ?? false);
  const [creating, setCreating] = useState(false);
  const runtime = useRef({ search, status, completed, y: previous?.y ?? 0 });
  runtime.current = { ...runtime.current, search, status, completed };
  useEffect(
    () => () => {
      client.setQueryData(['planning-runtime', projectRef, kind], runtime.current);
    },
    [client, projectRef, kind],
  );
  useEffect(() => {
    const timer = setTimeout(() => setSubmitted(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);
  const board = useQuery({ queryKey: ['board', projectRef], queryFn: () => api.board(projectRef) });
  const allowed = canReadPlanning(board.data, kind);
  const list = useInfiniteQuery({
    queryKey: [
      'planning',
      kind,
      projectRef,
      'list',
      completed,
      status,
      kind === 'initiatives' ? submitted : '',
    ],
    enabled: allowed,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      planningApi.list(
        kind,
        projectRef,
        pageParam,
        completed,
        kind === 'initiatives' ? submitted : '',
        status,
      ),
    getNextPageParam: nextPlanningPage,
  });
  useEffect(() => {
    navigation.setOptions({ title: kind === 'cycles' ? 'Cycles' : 'Initiatives' });
  }, [kind, navigation]);
  const rows = [
    ...new Map(
      (list.data?.pages.flatMap((page) => page.items) ?? []).map((item) => [item.id, item]),
    ).values(),
  ];
  const visible =
    kind === 'cycles'
      ? rows.filter((entry) =>
          `${entry.title} ${entry.description}`.toLowerCase().includes(search.trim().toLowerCase()),
        )
      : rows;
  const open = (id: number) =>
    router.push({
      pathname: '/planning-detail/[kind]/[id]',
      params: { kind, id: String(id), key: projectRef },
    });
  const refresh = () => {
    void board.refetch();
    if (allowed) void list.refetch();
  };
  if (board.isPending) return <Loading />;
  if (!board.data) return <Notice message="Could not load project." onPress={refresh} />;
  if (!allowed)
    return (
      <EmptyState
        title="Section unavailable"
        detail="This section is disabled or your role does not allow access."
      />
    );
  const header = (
    <View style={{ gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        {board.data.project.teamName} · {board.data.project.name}
      </Text>
      {board.isError || list.isError ? (
        <Notice message="Could not load the latest data." onPress={refresh} />
      ) : null}
      {board.data.permissions[kind]?.create ? (
        <Action
          label={kind === 'cycles' ? 'New cycle' : 'New initiative'}
          onPress={() => setCreating(true)}
        />
      ) : null}
      <SearchInput
        placeholder={kind === 'cycles' ? 'Search loaded cycles' : 'Search initiatives'}
        value={search}
        onChange={setSearch}
      />
      {kind === 'cycles' ? (
        <Choices
          label="Show cycles"
          value={completed ? 'completed' : 'planned'}
          options={[
            { value: 'planned', label: 'Active & upcoming' },
            { value: 'completed', label: 'Completed' },
          ]}
          onChange={(value) => setCompleted(value === 'completed')}
        />
      ) : (
        <Choices
          label="Status"
          value={status}
          options={[
            { value: 'all', label: 'All' },
            ...initiativeStatuses.map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            })),
          ]}
          onChange={setStatus}
        />
      )}
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {visible.length} shown · {list.data?.pages[0]?.total ?? 0} total
      </Text>
    </View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        contentOffset={{ x: 0, y: runtime.current.y }}
        onScroll={(event) => {
          runtime.current.y = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={100}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching || board.isRefetching}
            onRefresh={refresh}
            tintColor={colors.ink}
          />
        }
        ListEmptyComponent={
          list.isPending ? (
            <Loading />
          ) : (
            <EmptyState
              title={list.isError ? 'Data unavailable' : 'Nothing to show'}
              detail={
                search
                  ? 'Try another search or status.'
                  : 'Create an entry or choose another status.'
              }
            />
          )
        }
        ListFooterComponent={
          list.hasNextPage ? (
            <View style={{ padding: 20 }}>
              <Action
                label={list.isFetchingNextPage ? 'Loading…' : 'Load more'}
                disabled={list.isFetchingNextPage}
                onPress={() => {
                  if (!list.isFetchingNextPage) void list.fetchNextPage();
                }}
              />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.title}`}
            onPress={() => open(item.id)}
            style={({ pressed }) => ({
              padding: 20,
              gap: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
              backgroundColor: pressed ? colors.accentSoft : colors.canvas,
            })}
          >
            <Text style={{ color: colors.ink, fontSize: 20, lineHeight: 28, fontWeight: '600' }}>
              {item.title}
            </Text>
            <PlanningSummary entry={item} kind={kind} />
          </Pressable>
        )}
      />
      {creating ? (
        <PlanningEditor
          kind={kind}
          projectRef={projectRef}
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            setCreating(false);
            open(id);
          }}
        />
      ) : null}
    </View>
  );
}
