import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { planningApi } from '@/lib/planning-api';
import { canReadPlanning, type PlanningKind } from '@/lib/planning-model';
import { defaultFilters, visibleIssues } from '@/lib/issue-list';
import { Action, EmptyState, Loading } from '@/ui/primitives';
import { Notice, SearchInput } from '@/ui/work-controls';
import { PlanningSummary } from '@/ui/PlanningSummary';
import { PlanningEditor } from '@/ui/PlanningEditor';
import { MarkdownText } from '@/ui/MarkdownText';
import { IssueRow } from '@/ui/IssueRow';
import { IssueActions } from '@/ui/IssueActions';
import { IssueWorkspace, useIssueWorkspace } from '@/ui/IssueWorkspace';
import { useColors } from '@/ui/theme';

export default function PlanningDetailRoute() {
  const { kind, id, key } = useLocalSearchParams<{ kind: string; id: string; key: string }>();
  const numeric = Number(id);
  if (
    (kind !== 'cycles' && kind !== 'initiatives') ||
    !key ||
    !Number.isSafeInteger(numeric) ||
    numeric <= 0
  )
    return <EmptyState title="Entry unavailable" />;
  return (
    <PlanningDetail key={`${kind}.${numeric}.${key}`} kind={kind} id={numeric} projectRef={key} />
  );
}
function PlanningDetail({
  kind,
  id,
  projectRef,
}: {
  kind: PlanningKind;
  id: number;
  projectRef: string;
}) {
  const colors = useColors();
  const navigation = useNavigation();
  const workspace = useIssueWorkspace();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const board = useQuery({ queryKey: ['board', projectRef], queryFn: () => api.board(projectRef) });
  const allowed = canReadPlanning(board.data, kind);
  const detail = useQuery({
    queryKey: ['planning', kind, projectRef, 'detail', id],
    queryFn: () => planningApi.detail(kind, id),
    enabled: allowed,
  });
  const readWork = board.data?.permissions.work_items?.read !== false;
  const issues = useQuery({
    queryKey: ['issues', projectRef],
    queryFn: () => api.issues(projectRef),
    enabled: allowed && readWork,
  });
  useEffect(() => {
    navigation.setOptions({
      title: detail.data?.title ?? (kind === 'cycles' ? 'Cycle' : 'Initiative'),
    });
  }, [detail.data?.title, kind, navigation]);
  const refresh = () => {
    void board.refetch();
    if (allowed) void detail.refetch();
    if (allowed && readWork) void issues.refetch();
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
  if (detail.isPending) return <Loading />;
  if (!detail.data) return <Notice message="Could not load this entry." onPress={refresh} />;
  const entry = detail.data;
  if (entry.projectId !== board.data.project.id)
    return <EmptyState title="Entry unavailable in this project" />;
  const related = (issues.data?.issues ?? []).filter(
    (issue) =>
      !issue.archivedAt &&
      (kind === 'cycles' ? issue.cycle?.id === id : issue.initiative?.id === id),
  );
  const visible = visibleIssues(related, { ...defaultFilters, query: search }, 'updated');
  const selected = related.find((issue) => issue.id === actionId);
  const header = (
    <View style={{ padding: 20, gap: 20 }}>
      {board.isError || detail.isError || issues.isError ? (
        <Notice message="Could not refresh. Loaded data remains available." onPress={refresh} />
      ) : null}
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        {board.data.project.teamName} · {board.data.project.name}
      </Text>
      <Text
        accessibilityRole="header"
        style={{ color: colors.ink, fontSize: 28, lineHeight: 36, fontWeight: '600' }}
      >
        {entry.title}
      </Text>
      <PlanningSummary entry={entry} kind={kind} />
      {kind === 'initiatives' && entry.ownerUserId ? (
        <Text style={{ color: colors.muted, fontSize: 15 }}>
          Owner ·{' '}
          {board.data.assignees.find((person) => person.userId === entry.ownerUserId)?.name ??
            'Unavailable member'}
        </Text>
      ) : null}
      {board.data.permissions[kind]?.edit ? (
        <Action
          label={kind === 'cycles' ? 'Edit cycle' : 'Edit initiative'}
          muted
          onPress={() => setEditing(true)}
        />
      ) : null}
      {entry.description ? (
        <MarkdownText>{entry.description}</MarkdownText>
      ) : (
        <Text style={{ color: colors.muted, fontSize: 16 }}>No description yet.</Text>
      )}
      <Text
        accessibilityRole="header"
        style={{ color: colors.ink, fontSize: 20, fontWeight: '600' }}
      >
        Work items · {related.length}
      </Text>
      {readWork ? (
        <SearchInput placeholder="Search related issues" value={search} onChange={setSearch} />
      ) : (
        <Notice message="Your role does not allow access to work items." />
      )}
    </View>
  );
  return (
    <IssueWorkspace workspace={workspace} overview>
      <View style={{ flex: 1, backgroundColor: colors.canvas }}>
        <FlatList
          data={readWork ? visible : []}
          keyExtractor={(issue) => String(issue.id)}
          ListHeaderComponent={header}
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl
              refreshing={detail.isRefetching || issues.isRefetching || board.isRefetching}
              onRefresh={refresh}
              tintColor={colors.ink}
            />
          }
          ListEmptyComponent={
            readWork ? (
              issues.isPending ? (
                <Loading />
              ) : (
                <EmptyState
                  title={issues.isError ? 'Work items unavailable' : 'No matching work items'}
                  detail="Try another search or refresh this entry."
                />
              )
            ) : null
          }
          renderItem={({ item }) => {
            const column = board.data?.columns.find((column) => column.id === item.columnId);
            return (
              <IssueRow
                issue={item}
                state={column?.name}
                stateType={column?.stateType}
                stateColor={column?.color}
                selected={workspace.selectedId === item.id}
                onPress={() => workspace.open(item.id)}
                onActions={
                  board.data?.permissions.work_items?.edit ? () => setActionId(item.id) : undefined
                }
              />
            );
          }}
        />
        {editing ? (
          <PlanningEditor
            kind={kind}
            projectRef={projectRef}
            entry={entry}
            onClose={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        ) : null}
        {selected && board.data.permissions.work_items?.edit ? (
          <IssueActions
            key={selected.id}
            issue={selected}
            board={board.data}
            onClose={() => setActionId(null)}
          />
        ) : null}
      </View>
    </IssueWorkspace>
  );
}
