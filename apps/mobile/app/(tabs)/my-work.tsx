import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { authClient } from '@/lib/auth';
import { defaultFilters, dueGroup, visibleIssues, type IssueSort } from '@/lib/issue-list';
import type { IssueSearchHit } from '@/lib/types';
import { Action, EmptyState, Loading, ScreenTitle } from '@/ui/primitives';
import { IssueRow } from '@/ui/IssueRow';
import { Choices, NativeSheet, Notice, SearchInput, workStyles } from '@/ui/work-controls';
import { colors } from '@/ui/theme';

type AssignedIssue = IssueSearchHit & {
  projectKey: string;
  projectName: string;
  stateName: string;
  stateType: string;
  stateColor?: string;
  canEdit: boolean;
};

export default function MyWork() {
  const router = useRouter();
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const [term, setTerm] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [projectKey, setProjectKey] = useState('all');
  const [includeClosed, setIncludeClosed] = useState(false);
  const [grouping, setGrouping] = useState<'due' | 'project'>('due');
  const [sort, setSort] = useState<IssueSort>('due');
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const readable = (projects.data ?? []).filter(
    (project) => project.permissions?.work_items?.read !== false,
  );
  const assigned = useQuery({
    queryKey: ['assigned', userId, readable.map((project) => project.key).sort()],
    enabled: !!userId && !!projects.data,
    queryFn: async ({ signal }) => {
      const items: AssignedIssue[] = [];
      const failed: string[] = [];
      const limited: string[] = [];
      for (let index = 0; index < readable.length; index += 4) {
        if (signal.aborted) throw new Error('Loading canceled');
        const batch = readable.slice(index, index + 4);
        const responses = await Promise.allSettled(
          batch.map(async (project) => {
            const [issues, board] = await Promise.all([
              api.assignedIssues(project.key, userId!, signal),
              api.board(project.key, signal),
            ]);
            return { issues, board };
          }),
        );
        if (signal.aborted) throw new Error('Loading canceled');
        responses.forEach((response, offset) => {
          const project = batch[offset];
          if (response.status === 'rejected') {
            failed.push(project.name);
            return;
          }
          if (response.value.issues.length >= 500) limited.push(project.name);
          const board = response.value.board;
          items.push(
            ...response.value.issues
              .filter((issue) => !issue.archived)
              .map((issue) => {
                const column = board.columns.find((state) => state.id === issue.columnId);
                return {
                  ...issue,
                  projectKey: project.key,
                  projectName: project.name,
                  stateName: column?.name ?? 'Unknown status',
                  stateType: column?.stateType ?? '',
                  stateColor: column?.color,
                  canEdit: board.permissions.work_items?.edit === true,
                };
              }),
          );
        });
      }
      if (readable.length && failed.length === readable.length)
        throw new Error('Could not load your assigned work.');
      return { items, failed, limited };
    },
  });
  const source = (assigned.data?.items ?? []).filter(
    (issue) =>
      (projectKey === 'all' || issue.projectKey === projectKey) &&
      (includeClosed || !['completed', 'canceled'].includes(issue.stateType)),
  );
  const visible = visibleIssues(source, { ...defaultFilters, query: term }, sort, userId);
  const grouped = new Map<string, AssignedIssue[]>();
  if (grouping === 'due')
    for (const title of [
      'Overdue',
      'Today',
      'Next 7 days',
      'Later',
      'No due date',
      'Completed & canceled',
    ])
      grouped.set(title, []);
  for (const issue of visible) {
    const title =
      grouping === 'due'
        ? dueGroup(issue.dueDate, undefined, issue.stateType)
        : `${issue.projectName} · ${issue.projectKey}`;
    if (!grouped.has(title)) grouped.set(title, []);
    grouped.get(title)!.push(issue);
  }
  const sections = [...grouped.entries()]
    .filter(([, items]) => items.length)
    .map(([title, data]) => ({ key: title, title, data }));
  const refresh = () => Promise.all([projects.refetch(), assigned.refetch()]);
  const initialError = (projects.isError && !projects.data) || (assigned.isError && !assigned.data);
  const header = (
    <>
      <ScreenTitle title="My work" eyebrow="Assigned to you, across your projects" />
      <View style={workStyles.toolbar}>
        <SearchInput value={term} onChange={setTerm} placeholder="Find in your assigned work" />
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowOptions(true)}
          style={workStyles.textButton}
        >
          <Text style={workStyles.buttonText}>
            Filter & display · {includeClosed ? 'All work' : 'Open work'}
          </Text>
        </Pressable>
      </View>
    </>
  );
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {initialError ? (
        <View style={{ flex: 1 }}>
          {header}
          <EmptyState
            title="Your work is unavailable"
            detail="Check your connection and try again."
          />
          <Action label="Retry" onPress={() => void refresh()} />
        </View>
      ) : projects.isPending || assigned.isLoading ? (
        <>
          {header}
          <Loading />
        </>
      ) : (
        <SectionList<AssignedIssue>
          sections={sections}
          keyExtractor={(issue) => String(issue.id)}
          stickySectionHeadersEnabled={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={assigned.isRefetching || projects.isRefetching}
              onRefresh={() => void refresh()}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={
            <>
              {header}
              {projects.isError || assigned.isError ? (
                <Notice
                  message="Could not refresh. Showing loaded work."
                  onPress={() => void refresh()}
                />
              ) : null}
              {assigned.data?.failed.length ? (
                <Notice
                  message={`Some projects could not be loaded: ${assigned.data.failed.join(', ')}.`}
                  onPress={() => void assigned.refetch()}
                />
              ) : null}
              {assigned.data?.limited.length ? (
                <Notice
                  message={`Showing up to 500 assigned issues per project. Open these projects for the full list: ${assigned.data.limited.join(', ')}.`}
                />
              ) : null}
            </>
          }
          ListEmptyComponent={
            <EmptyState
              title={term ? 'No matching issues' : 'No assigned work here'}
              detail="Choose another project or include completed work. New assignments will appear here."
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={workStyles.section}>
              <Text accessibilityRole="header" style={workStyles.sectionTitle}>
                {section.title} · {section.data.length}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <IssueRow
              issue={item}
              state={`${item.projectKey} · ${item.stateName}`}
              stateColor={item.stateColor}
              stateType={item.stateType}
              onPress={() => router.push(`/issue/${item.id}`)}
              onActions={item.canEdit ? () => router.push(`/edit-issue/${item.id}`) : undefined}
            />
          )}
        />
      )}
      {showOptions ? (
        <NativeSheet visible title="Your work, your view" onClose={() => setShowOptions(false)}>
          <Choices
            label="Project"
            value={projectKey}
            options={[
              { value: 'all', label: 'All projects' },
              ...readable.map((project) => ({ value: project.key, label: project.name })),
            ]}
            onChange={setProjectKey}
          />
          <Choices
            label="Include"
            value={includeClosed ? 'all' : 'open'}
            options={[
              { value: 'open', label: 'Open work' },
              { value: 'all', label: 'Completed & canceled too' },
            ]}
            onChange={(value) => setIncludeClosed(value === 'all')}
          />
          <Choices
            label="Organize"
            value={`${grouping}:${sort}`}
            options={[
              { value: 'due:due', label: 'By due date' },
              { value: 'project:due', label: 'By project' },
              { value: 'due:priority', label: 'Priority within dates' },
            ]}
            onChange={(value) => {
              const [group, order] = value.split(':');
              setGrouping(group as 'due' | 'project');
              setSort(order as IssueSort);
            }}
          />
        </NativeSheet>
      ) : null}
    </View>
  );
}
