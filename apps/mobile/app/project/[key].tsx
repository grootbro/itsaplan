import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import {
  activeFilterCount,
  defaultFilters,
  visibleIssues,
  projectIssueSections,
  type IssueFilters as Filters,
  type IssueGrouping,
  type IssueSort,
} from '@/lib/issue-list';
import type { Issue } from '@/lib/types';
import { Action, EmptyState, Loading } from '@/ui/primitives';
import { IssueRow } from '@/ui/IssueRow';
import { IssueActions } from '@/ui/IssueActions';
import { IssueFilters } from '@/ui/IssueFilters';
import { Notice, SearchInput, useWorkStyles } from '@/ui/work-controls';
import { useColors, useThemedStyles, type Palette } from '@/ui/theme';

export default function Project() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const workStyles = useWorkStyles();
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const session = authClient.useSession();
  const [view, setView] = useState<'all' | 'archive' | number>('all');
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [sort, setSort] = useState<IssueSort>('updated');
  const [grouping, setGrouping] = useState<IssueGrouping>('state');
  const [showFilters, setShowFilters] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const board = useQuery({
    queryKey: ['board', key],
    queryFn: () => api.board(key),
    enabled: !!key,
  });
  const issues = useQuery({
    queryKey: ['issues', key],
    queryFn: () => api.issues(key),
    enabled: !!key,
  });
  const archived = useQuery({
    queryKey: ['archived-issues', key],
    queryFn: () => api.archivedIssues(key),
    enabled: !!key && view === 'archive',
  });
  const cycles = useQuery({
    queryKey: ['cycles', key],
    queryFn: () => api.cycleOptions(key),
    enabled: !!key && !!board.data?.project.cyclesEnabled,
  });
  const initiatives = useQuery({
    queryKey: ['initiatives', key],
    queryFn: () => api.initiativeOptions(key),
    enabled: !!key && !!board.data?.project.initiativesEnabled,
  });
  const columns = useMemo(
    () => [...(board.data?.columns ?? [])].sort((a, b) => a.position - b.position),
    [board.data?.columns],
  );
  const active = (issues.data?.issues ?? []).filter((issue) => !issue.archivedAt);
  const source = view === 'archive' ? (archived.data ?? []) : active;
  const inView =
    typeof view === 'number' ? source.filter((issue) => issue.columnId === view) : source;
  const visible = visibleIssues(inView, filters, sort, session.data?.user.id);
  const selectedIssue = source.find((issue) => issue.id === actionId);
  const cycleChoices = [
    ...new Map([
      ...(cycles.data ?? []).map(
        (cycle) => [cycle.id, { id: cycle.id, name: cycle.name }] as const,
      ),
      ...source.flatMap((issue) =>
        issue.cycle
          ? [[issue.cycle.id, { id: issue.cycle.id, name: issue.cycle.name }] as const]
          : [],
      ),
    ]).values(),
  ];
  const initiativeChoices = [
    ...new Map([
      ...(initiatives.data ?? []).map(
        (initiative) => [initiative.id, { id: initiative.id, title: initiative.title }] as const,
      ),
      ...source.flatMap((issue) =>
        issue.initiative
          ? [
              [
                issue.initiative.id,
                { id: issue.initiative.id, title: issue.initiative.title },
              ] as const,
            ]
          : [],
      ),
    ]).values(),
  ];
  const retryOptions = () => {
    if (board.data?.project.cyclesEnabled) void cycles.refetch();
    if (board.data?.project.initiativesEnabled) void initiatives.refetch();
  };
  const listQuery = view === 'archive' ? archived : issues;
  const filterCount = activeFilterCount(filters);
  const sections = projectIssueSections(visible, grouping, columns, board.data?.assignees ?? []);

  useEffect(() => {
    navigation.setOptions({ title: board.data?.project.name ?? key });
  }, [board.data?.project.name, key, navigation]);
  useEffect(() => {
    setView('all');
    setFilters({ ...defaultFilters });
    setActionId(null);
    setShowFilters(false);
  }, [key]);

  const refresh = () => Promise.all([board.refetch(), listQuery.refetch()]);
  if (board.isPending || issues.isPending) return <Loading />;
  if ((!board.data && board.isError) || (!issues.data && issues.isError))
    return (
      <View style={styles.screen}>
        <EmptyState title="Project unavailable" detail="Check your connection, then try again." />
        <Action label="Retry" onPress={() => void refresh()} />
      </View>
    );
  if (!board.data) return <Loading />;

  const header = (
    <>
      <View style={styles.summary}>
        <Text style={styles.subtitle}>
          {board.data.project.teamName} · {key}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          Work items
        </Text>
        <Text style={styles.meta}>
          {active.length} active · {visible.length} shown
        </Text>
      </View>
      <View style={workStyles.toolbar}>
        <SearchInput
          value={filters.query}
          onChange={(query) => setFilters((current) => ({ ...current, query }))}
        />
        <View style={styles.displayRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter and display options"
            onPress={() => setShowFilters(true)}
            style={styles.filterButton}
          >
            <Ionicons name="options-outline" size={19} color={colors.ink} />
            <Text style={workStyles.buttonText}>
              {filterCount ? `Filters · ${filterCount}` : 'Filter & display'}
            </Text>
          </Pressable>
          {filterCount ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setFilters({ ...defaultFilters })}
              style={workStyles.textButton}
            >
              <Text style={workStyles.buttonText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.states}
      >
        {[
          { value: 'all' as const, name: 'All', count: active.length },
          ...columns.map((column) => ({
            value: column.id,
            name: column.name,
            count: active.filter((issue) => issue.columnId === column.id).length,
          })),
          { value: 'archive' as const, name: 'Archive', count: undefined },
        ].map((item) => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityState={{ selected: view === item.value }}
            onPress={() => setView(item.value)}
            style={[styles.state, view === item.value && styles.stateSelected]}
          >
            <Text style={[styles.stateLabel, view === item.value && styles.stateLabelSelected]}>
              {item.name}
              {item.count !== undefined ? `  ${item.count}` : ''}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
  return (
    <View style={styles.screen}>
      <SectionList<Issue>
        sections={sections}
        keyExtractor={(issue) => String(issue.id)}
        stickySectionHeadersEnabled={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: insets.bottom + 110, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isRefetching || board.isRefetching}
            onRefresh={() => void refresh()}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          <>
            {header}
            {board.isError || listQuery.isError ? (
              <Notice
                message="Could not refresh. Your loaded work is still here."
                onPress={() => void refresh()}
              />
            ) : null}
            {view === 'archive' && archived.isPending ? <Loading /> : null}
          </>
        }
        ListEmptyComponent={
          view === 'archive' && archived.isPending ? null : (
            <EmptyState
              title={filterCount ? 'No matching issues' : 'No issues here'}
              detail={
                filterCount
                  ? 'Clear a filter or search for another term.'
                  : 'Choose another status, or create a new issue.'
              }
            />
          )
        }
        renderSectionHeader={({ section }) =>
          section.title ? (
            <View style={workStyles.section}>
              <Text accessibilityRole="header" style={workStyles.sectionTitle}>
                {section.title} · {section.data.length}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <IssueRow
            issue={item}
            state={columns.find((column) => column.id === item.columnId)?.name}
            stateType={columns.find((column) => column.id === item.columnId)?.stateType}
            stateColor={columns.find((column) => column.id === item.columnId)?.color}
            assignee={
              board.data?.assignees.find((person) => person.userId === item.assigneeUserId)?.name
            }
            onPress={() => router.push(`/issue/${item.id}`)}
            onLongPress={
              view !== 'archive' && board.data?.permissions.work_items?.edit
                ? () => setActionId(item.id)
                : undefined
            }
            onActions={
              view !== 'archive' && board.data?.permissions.work_items?.edit
                ? () => setActionId(item.id)
                : undefined
            }
          />
        )}
      />
      {view !== 'archive' && board.data.permissions.work_items?.create ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create issue"
          onPress={() => router.push(`/new-issue/${key}`)}
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
        >
          <Ionicons name="add" size={24} color={colors.onAccent} />
          <Text style={styles.fabLabel}>New issue</Text>
        </Pressable>
      ) : null}
      {showFilters ? (
        <IssueFilters
          board={board.data}
          filters={filters}
          onChange={setFilters}
          sort={sort}
          setSort={setSort}
          grouping={grouping}
          setGrouping={setGrouping}
          onClose={() => setShowFilters(false)}
          cycles={cycleChoices}
          initiatives={initiativeChoices}
          optionsError={cycles.isError || initiatives.isError}
          onRetryOptions={retryOptions}
        />
      ) : null}
      {selectedIssue && board.data.permissions.work_items?.edit ? (
        <IssueActions
          key={selectedIssue.id}
          issue={selectedIssue}
          board={board.data}
          onClose={() => setActionId(null)}
        />
      ) : null}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    summary: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 22 },
    subtitle: { color: colors.muted, fontSize: 14, marginBottom: 8 },
    title: { color: colors.ink, fontSize: 30, fontWeight: '700', letterSpacing: -0.7 },
    meta: { color: colors.muted, fontSize: 14, marginTop: 6 },
    displayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    filterButton: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8 },
    states: { paddingHorizontal: 22, paddingBottom: 12, gap: 8 },
    state: {
      minHeight: 48,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    stateSelected: { backgroundColor: colors.ink },
    stateLabel: { color: colors.ink, fontSize: 15 },
    stateLabelSelected: { color: colors.onAccent, fontWeight: '600' },
    fab: {
      position: 'absolute',
      right: 22,
      bottom: 20,
      backgroundColor: colors.ink,
      minHeight: 52,
      paddingHorizontal: 20,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    fabLabel: { color: colors.onAccent, fontSize: 16, fontWeight: '600' },
  });
