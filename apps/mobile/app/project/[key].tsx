import { ProjectMenu } from '@/ui/ProjectMenu';
import { IssueWorkspace, useIssueWorkspace } from '@/ui/IssueWorkspace';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import {
  localDay,
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
import { useProjectDisplay } from '@/lib/use-project-display';
import type { ProjectLayout, ProjectScope } from '@/lib/project-display';
import { ProjectTimelineView } from '@/ui/ProjectTimelineView';
import {
  ProjectBoardView,
  ProjectTableView,
  ProjectCalendarView,
  type CollectionScroll,
} from '@/ui/ProjectCollections';
import { ProjectDisplaySheet, ProjectLayoutPicker } from '@/ui/ProjectDisplaySheet';

export default function ProjectRoute() {
  const { key, layout } = useLocalSearchParams<{ key: string; layout?: string }>();
  return <Project key={key} projectKey={key} layoutParam={layout} />;
}

function Project({ projectKey: key, layoutParam }: { projectKey: string; layoutParam?: string }) {
  const workspace = useIssueWorkspace();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const workStyles = useWorkStyles();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const session = authClient.useSession();
  const client = useQueryClient();
  const { height, fontScale } = useWindowDimensions();
  const userId = session.data?.user.id ?? '';
  const display = useProjectDisplay(userId, key);
  const { scope: view, filters, sort, grouping, layout } = display.state;
  const setView = (scope: ProjectScope) => display.change({ scope });
  const setFilters = (filters: Filters) => display.change({ filters });
  const setSort = (sort: IssueSort) => display.change({ sort });
  const setGrouping = (grouping: IssueGrouping) => display.change({ grouping });
  const runtimeKey = ['project-runtime', userId, key];
  const saved = client.getQueryData<{
    scroll: CollectionScroll;
    month: string;
    day: string;
    unscheduled: boolean;
    timelineCollapsed?: string[];
  }>(runtimeKey);
  const scroll = useRef<CollectionScroll>(
    saved?.scroll ?? { boardX: 0, columns: {}, tableX: 0, tableY: 0, listY: 0, calendarY: 0 },
  );
  const [month, setMonth] = useState(saved?.month ?? localDay().slice(0, 7));
  const [day, setDay] = useState(saved?.day ?? localDay());
  const [unscheduled, setUnscheduled] = useState(saved?.unscheduled ?? false);
  const [timelineCollapsed, setTimelineCollapsed] = useState<string[]>(
    saved?.timelineCollapsed ?? [],
  );
  const runtime = useRef({ scroll: scroll.current, month, day, unscheduled, timelineCollapsed });
  runtime.current = { scroll: scroll.current, month, day, unscheduled, timelineCollapsed };
  useEffect(() => {
    client.setQueryDefaults(['project-runtime', userId, key], { gcTime: Infinity });
    return () => {
      client.setQueryData(['project-runtime', userId, key], runtime.current);
    };
  }, [client, userId, key]);
  useEffect(() => {
    if (
      !display.isPending &&
      ['board', 'list', 'table', 'calendar', 'timeline'].includes(layoutParam ?? '') &&
      layoutParam !== layout
    )
      display.change({ layout: layoutParam as ProjectLayout });
  }, [layoutParam, display.isPending]);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
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
    enabled: !!key && !!board.data && board.data.permissions.work_items?.read !== false,
  });
  const archived = useQuery({
    queryKey: ['archived-issues', key],
    queryFn: () => api.archivedIssues(key),
    enabled:
      !!key &&
      view === 'archive' &&
      !!board.data &&
      board.data.permissions.work_items?.read !== false,
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
  const refresh = () => Promise.all([board.refetch(), listQuery.refetch()]);
  if (display.isPending || board.isPending) return <Loading />;
  if (!board.data && board.isError)
    return (
      <View style={styles.screen}>
        <EmptyState title="Project unavailable" detail="Check your connection, then try again." />
        <Action label="Retry" onPress={() => void refresh()} />
      </View>
    );
  if (!board.data) return <Loading />;

  const reset = () => display.change({ scope: 'all', filters: { ...defaultFilters } });
  const createIssue = (columnId?: number) =>
    router.push({
      pathname: '/new-issue/[key]',
      params: { key, ...(columnId ? { columnId: String(columnId) } : {}) },
    });
  const changeLayout = (layout: ProjectLayout) => {
    display.change({ layout });
    router.setParams({ layout });
  };
  const collection = {
    issues: visible,
    board: board.data,
    selectedId: workspace.selectedId,
    onOpen: workspace.open,
    onActions:
      view !== 'archive' && board.data.permissions.work_items?.edit ? setActionId : undefined,
    properties: display.state.properties,
    scroll,
  };
  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Project menu and switcher"
        onPress={() => setShowProjectMenu(true)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}
      >
        <Ionicons name="folder-open-outline" size={20} color={colors.ink} />
        <Text style={{ flex: 1, color: colors.ink, fontSize: 17, fontWeight: '600' }}>
          {board.data.project.name}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {height >= 600 ? (
        <View style={styles.summary}>
          <Text style={styles.subtitle}>
            {board.data.project.teamName} · {board.data.project.key}
          </Text>
          <Text style={styles.meta}>
            {view === 'archive' ? `${source.length} archived` : `${active.length} active`} ·{' '}
            {visible.length} shown
          </Text>
        </View>
      ) : null}
      <ProjectLayoutPicker value={layout} onChange={changeLayout} />
      <SearchInput value={filters.query} onChange={(query) => setFilters({ ...filters, query })} />
      <View style={styles.displayRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Filter issues"
          onPress={() => setShowFilters(true)}
          style={styles.filterButton}
        >
          <Ionicons name="filter-outline" size={18} color={colors.ink} />
          <Text style={workStyles.buttonText}>
            {filterCount ? `Filters · ${filterCount}` : 'Filters'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Display options"
          onPress={() => setShowDisplay(true)}
          style={styles.filterButton}
        >
          <Ionicons name="options-outline" size={18} color={colors.ink} />
          <Text style={workStyles.buttonText}>Display</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh issues"
          accessibilityState={{ disabled: listQuery.isFetching || board.isFetching }}
          disabled={listQuery.isFetching || board.isFetching}
          style={styles.refresh}
          onPress={() => void refresh()}
        >
          <Ionicons name="refresh-outline" size={21} color={colors.muted} />
        </Pressable>
        {filterCount || view !== 'all' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset filters and show all active issues"
            onPress={reset}
            style={workStyles.textButton}
          >
            <Text style={workStyles.buttonText}>Reset</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        contentContainerStyle={styles.states}
        style={{ flexGrow: 0 }}
      >
        {[
          { value: 'all' as const, name: 'All', count: active.length },
          ...columns.map((column) => ({
            value: column.id,
            name: column.name,
            count: active.filter((issue) => issue.columnId === column.id).length,
          })),
          ...(!['all', 'archive'].includes(String(view)) &&
          !columns.some((column) => column.id === view)
            ? [{ value: view, name: 'Unavailable status', count: inView.length }]
            : []),
          { value: 'archive' as const, name: 'Archive', count: undefined },
        ].map((item) => (
          <Pressable
            key={item.value}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} issues`}
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
    </View>
  );
  return (
    <IssueWorkspace workspace={workspace} overview>
      <View style={styles.screen}>
        {height < 600 || fontScale >= 1.6 ? (
          <ScrollView
            accessibilityLabel="Project controls"
            style={{ maxHeight: Math.max(96, height * 0.4), flexGrow: 0, flexShrink: 0 }}
            keyboardShouldPersistTaps="handled"
          >
            {header}
          </ScrollView>
        ) : (
          header
        )}
        {display.error ? <Notice message={display.error} /> : null}
        {board.isError || listQuery.isError ? (
          <Notice
            message="Could not refresh. Loaded issues remain available."
            onPress={() => void refresh()}
          />
        ) : null}
        {filterCount && !visible.length ? (
          <Notice
            message="No issues match the current filters."
            action="Reset filters"
            onPress={reset}
          />
        ) : null}
        {board.data.permissions.work_items?.read === false ? (
          <EmptyState
            title="Work items unavailable"
            detail="Open the project menu to access other available sections."
          />
        ) : listQuery.isPending ? (
          <Loading />
        ) : !listQuery.data && listQuery.isError ? (
          <EmptyState title="Issues unavailable" detail="Use Refresh to try again." />
        ) : layout === 'board' ? (
          <ProjectBoardView
            {...collection}
            grouping={grouping}
            showEmpty={display.state.showEmptyGroups}
            allIssues={active}
            archived={view === 'archive'}
            onCreate={
              view !== 'archive' && board.data.permissions.work_items?.create
                ? createIssue
                : undefined
            }
          />
        ) : layout === 'table' ? (
          <ProjectTableView {...collection} />
        ) : layout === 'timeline' ? (
          <ProjectTimelineView
            {...collection}
            scale={display.state.timelineScale}
            onScale={(timelineScale) => display.change({ timelineScale })}
            grouping={grouping}
            showEmpty={display.state.showEmptyGroups}
            collapsed={timelineCollapsed}
            onCollapsed={setTimelineCollapsed}
          />
        ) : layout === 'calendar' ? (
          <ProjectCalendarView
            {...collection}
            dateField={display.state.calendarDate}
            weekStart={display.state.weekStart}
            month={month}
            setMonth={setMonth}
            day={day}
            setDay={setDay}
            unscheduled={unscheduled}
            setUnscheduled={setUnscheduled}
          />
        ) : (
          <SectionList<Issue>
            sections={sections}
            keyExtractor={(issue) => String(issue.id)}
            stickySectionHeadersEnabled={false}
            contentOffset={{ x: 0, y: scroll.current.listY }}
            onScroll={(event) => {
              scroll.current.listY = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={100}
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
                selected={workspace.selectedId === item.id}
                state={columns.find((column) => column.id === item.columnId)?.name}
                stateType={columns.find((column) => column.id === item.columnId)?.stateType}
                stateColor={columns.find((column) => column.id === item.columnId)?.color}
                assignee={
                  board.data?.assignees.find((person) => person.userId === item.assigneeUserId)
                    ?.name
                }
                onPress={() => workspace.open(item.id)}
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
        )}
        {view !== 'archive' && board.data.permissions.work_items?.create && columns.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create issue"
            onPress={() => createIssue()}
            style={[styles.fab, { bottom: insets.bottom + 20 }]}
          >
            <Ionicons name="add" size={24} color={colors.onAccent} />
            <Text style={styles.fabLabel}>New issue</Text>
          </Pressable>
        ) : null}
        {showProjectMenu ? (
          <ProjectMenu board={board.data} onClose={() => setShowProjectMenu(false)} />
        ) : null}
        {showFilters ? (
          <IssueFilters
            hideDisplay
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
        {showDisplay ? (
          <ProjectDisplaySheet
            state={display.state}
            onChange={display.change}
            onClose={() => setShowDisplay(false)}
          />
        ) : null}
        {selectedIssue && !selectedIssue.archivedAt && board.data.permissions.work_items?.edit ? (
          <IssueActions
            key={selectedIssue.id}
            issue={selectedIssue}
            board={board.data}
            onClose={() => setActionId(null)}
          />
        ) : null}
      </View>
    </IssueWorkspace>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    header: { paddingHorizontal: 16, paddingTop: 6, gap: 8 },
    summary: {
      paddingTop: 4,
      paddingBottom: 2,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
    },
    refresh: { minHeight: 48, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    subtitle: { color: colors.muted, fontSize: 13 },
    meta: { color: colors.muted, fontSize: 13 },
    displayRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    filterButton: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 8 },
    states: { paddingBottom: 10, gap: 8 },
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
