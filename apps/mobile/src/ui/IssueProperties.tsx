import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { localDay } from '@/lib/issue-list';
import type { Issue, Priority, ProjectBoard } from '@/lib/types';
import { IssuePriority, IssueProperty, IssueStatus } from './issue-metadata';
import { NativeSheet } from './work-controls';
import { useColors, useThemedStyles, type Palette } from './theme';

export function IssueProperties({
  issue,
  board,
  canEdit,
  onEdit,
}: {
  issue: Issue;
  board?: ProjectBoard;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const client = useQueryClient();
  const [picker, setPicker] = useState<'Status' | 'Priority' | 'Assignee' | null>(null);
  const update = useMutation({
    mutationFn: (patch: Parameters<typeof api.updateIssue>[1]) => api.updateIssue(issue.id, patch),
    onSuccess: async () => {
      setPicker(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['issue', issue.id] }),
        client.invalidateQueries({ queryKey: ['issues'] }),
        client.invalidateQueries({ queryKey: ['assigned'] }),
        client.invalidateQueries({ queryKey: ['planning'] }),
        client.invalidateQueries({ queryKey: ['search'] }),
        client.invalidateQueries({ queryKey: ['feed', issue.id] }),
      ]);
    },
    onError: (error) => Alert.alert('Could not update issue', error.message),
  });
  const save = (patch: Parameters<typeof api.updateIssue>[1]) => {
    if (canEdit && !update.isPending) update.mutate(patch);
  };
  const state = board?.columns.find((column) => column.id === issue.columnId);
  const overdue =
    !!issue.dueDate &&
    !!state &&
    !['completed', 'canceled'].includes(state.stateType) &&
    issue.dueDate.slice(0, 10) < localDay();
  const assignee = board?.assignees.find((person) => person.userId === issue.assigneeUserId);
  const priorities: Priority[] = [null, 'urgent', 'high', 'medium', 'low'];
  const edit = canEdit ? onEdit : undefined;
  const date = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    const parsed = new Date(year, month - 1, day, 12);
    return Number.isNaN(parsed.getTime())
      ? value
      : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const optionStyle = ({ pressed }: { pressed: boolean }) => [
    styles.option,
    pressed && { backgroundColor: colors.accentSoft },
  ];
  return (
    <View style={styles.properties}>
      <Text accessibilityRole="header" style={styles.heading}>
        Properties
      </Text>
      <IssueProperty label="Status" onPress={canEdit ? () => setPicker('Status') : undefined}>
        <IssueStatus name={state?.name ?? 'Status unavailable'} color={state?.color} />
      </IssueProperty>
      <IssueProperty label="Priority" onPress={canEdit ? () => setPicker('Priority') : undefined}>
        <IssuePriority value={issue.priority} />
      </IssueProperty>
      <IssueProperty label="Assignee" onPress={canEdit ? () => setPicker('Assignee') : undefined}>
        <View style={styles.person}>
          <Ionicons name="person-circle-outline" size={19} color={colors.muted} />
          <Text style={styles.value}>
            {assignee?.name ?? (issue.assigneeUserId ? 'Member unavailable' : 'Unassigned')}
          </Text>
        </View>
      </IssueProperty>
      {issue.typeId ? (
        <IssueProperty label="Type" onPress={edit}>
          <Text style={styles.value}>
            {board?.issueTypes.find((type) => type.id === issue.typeId)?.name ?? 'Type unavailable'}
          </Text>
        </IssueProperty>
      ) : null}
      {issue.startDate ? (
        <IssueProperty label="Start date" onPress={edit}>
          <Text style={styles.value}>{date(issue.startDate)}</Text>
        </IssueProperty>
      ) : null}
      {issue.dueDate || canEdit ? (
        <IssueProperty label="Due date" onPress={edit}>
          <Text
            style={[
              issue.dueDate ? styles.value : styles.empty,
              overdue && { color: colors.danger },
            ]}
          >
            {overdue ? 'Overdue · ' : ''}
            {issue.dueDate ? date(issue.dueDate) : 'Not set'}
          </Text>
        </IssueProperty>
      ) : null}
      {issue.estimatePoints != null ? (
        <IssueProperty label="Estimate" onPress={edit}>
          <Text style={styles.value}>{issue.estimatePoints} pt</Text>
        </IssueProperty>
      ) : null}
      {issue.cycle ? (
        <IssueProperty label="Cycle" onPress={edit}>
          <Text style={styles.value}>{issue.cycle.name}</Text>
        </IssueProperty>
      ) : null}
      {issue.initiative ? (
        <IssueProperty label="Initiative" onPress={edit}>
          <Text style={styles.value}>{issue.initiative.title}</Text>
        </IssueProperty>
      ) : null}
      {issue.labelIds.length || canEdit ? (
        <IssueProperty label="Labels" onPress={edit}>
          <View style={styles.labels}>
            {issue.labelIds.length ? (
              issue.labelIds.map((id) => {
                const label = board?.labels.find((item) => item.id === id);
                return label ? (
                  <View key={id} style={styles.labelTag}>
                    <View
                      style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: label.color }}
                    />
                    <Text style={styles.value}>{label.name}</Text>
                  </View>
                ) : null;
              })
            ) : (
              <Text style={styles.empty}>No labels</Text>
            )}
          </View>
        </IssueProperty>
      ) : null}
      {picker && board ? (
        <NativeSheet
          visible
          title={`Change ${picker.toLowerCase()}`}
          onClose={() => {
            if (!update.isPending) setPicker(null);
          }}
        >
          {update.isPending ? (
            <Text accessibilityLiveRegion="polite" style={styles.empty}>
              Saving…
            </Text>
          ) : null}
          {picker === 'Status'
            ? [...board.columns]
                .sort((a, b) => a.position - b.position)
                .map((column) => (
                  <Pressable
                    key={column.id}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: column.id === issue.columnId,
                      disabled: update.isPending,
                    }}
                    disabled={update.isPending}
                    style={optionStyle}
                    onPress={() =>
                      column.id === issue.columnId ? setPicker(null) : save({ columnId: column.id })
                    }
                  >
                    <View style={{ flex: 1 }}>
                      <IssueStatus name={column.name} color={column.color} />
                    </View>
                    {column.id === issue.columnId ? (
                      <Ionicons name="checkmark" size={20} color={colors.ink} />
                    ) : null}
                  </Pressable>
                ))
            : null}
          {picker === 'Priority'
            ? priorities.map((priority) => (
                <Pressable
                  key={priority ?? 'none'}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: priority === issue.priority,
                    disabled: update.isPending,
                  }}
                  disabled={update.isPending}
                  style={optionStyle}
                  onPress={() =>
                    priority === issue.priority ? setPicker(null) : save({ priority })
                  }
                >
                  <View style={{ flex: 1 }}>
                    <IssuePriority value={priority} />
                  </View>
                  {priority === issue.priority ? (
                    <Ionicons name="checkmark" size={20} color={colors.ink} />
                  ) : null}
                </Pressable>
              ))
            : null}
          {picker === 'Assignee'
            ? [
                { userId: null, name: 'Unassigned' },
                ...board.assignees.filter((person) => person.canReadWorkItems),
              ].map((person) => (
                <Pressable
                  key={person.userId ?? 'none'}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: person.userId === issue.assigneeUserId,
                    disabled: update.isPending,
                  }}
                  disabled={update.isPending}
                  style={optionStyle}
                  onPress={() =>
                    person.userId === issue.assigneeUserId
                      ? setPicker(null)
                      : save({ assigneeUserId: person.userId })
                  }
                >
                  <Ionicons name="person-circle-outline" size={22} color={colors.muted} />
                  <Text style={styles.value}>{person.name}</Text>
                  {person.userId === issue.assigneeUserId ? (
                    <Ionicons name="checkmark" size={20} color={colors.ink} />
                  ) : null}
                </Pressable>
              ))
            : null}
        </NativeSheet>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    properties: {
      marginTop: 28,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    heading: { color: colors.ink, fontSize: 16, fontWeight: '600', marginBottom: 8 },
    value: { color: colors.ink, fontSize: 14, lineHeight: 21, flexShrink: 1 },
    empty: { color: colors.muted, fontSize: 14, lineHeight: 21 },
    labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    labelTag: {
      maxWidth: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: colors.accentSoft,
    },
    person: { flexDirection: 'row', gap: 7, alignItems: 'center' },
    option: {
      minHeight: 52,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 10,
    },
  });
