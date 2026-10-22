import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSuccessHaptic } from '@/lib/preferences-context';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import type { Priority } from '@/lib/types';
import { validDate } from '@/lib/validation';
import { Action, EmptyState, Field, Loading } from '@/ui/primitives';
import { DateField } from '@/ui/DateField';
import { MarkdownField } from '@/ui/MarkdownField';
import { useColors, useThemedStyles, type Palette } from '@/ui/theme';

export default function NewIssue() {
  const successHaptic = useSuccessHaptic();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const {
    key,
    parentId,
    columnId: initialColumnId,
  } = useLocalSearchParams<{
    key: string;
    parentId?: string;
    columnId?: string;
  }>();
  const parentIssueId = parentId ? Number(parentId) : null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const board = useQuery({
    queryKey: ['board', key],
    queryFn: () => api.board(key),
    enabled: !!key,
  });
  const cycles = useQuery({
    queryKey: ['cycle-options', key],
    queryFn: () => api.cycleOptions(key),
    enabled: !!key && !!board.data?.project.cyclesEnabled,
  });
  const initiatives = useQuery({
    queryKey: ['initiative-options', key],
    queryFn: () => api.initiativeOptions(key),
    enabled: !!key && !!board.data?.project.initiativesEnabled,
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState<number | null>(null);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [priority, setPriority] = useState<Priority>(null);
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(null);
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [initiativeId, setInitiativeId] = useState<number | null>(null);
  const selected =
    columnId ??
    board.data?.columns.find((column) => column.id === Number(initialColumnId))?.id ??
    board.data?.columns.find((column) => column.stateType === 'backlog')?.id ??
    board.data?.columns[0]?.id;
  const selectedType =
    typeId ??
    board.data?.issueTypes.find((type) => type.isDefault)?.id ??
    board.data?.issueTypes[0]?.id;
  const create = useMutation({
    mutationFn: () =>
      api.createIssue(key, {
        title: title.trim(),
        description,
        columnId: selected!,
        ...(selectedType ? { typeId: selectedType } : {}),
        ...(parentIssueId ? { parentId: parentIssueId } : {}),
        priority,
        assigneeUserId,
        labelIds,
        dueDate: dueDate || null,
        ...(cycleId ? { cycleId } : {}),
        ...(initiativeId ? { initiativeId } : {}),
      }),
    onSuccess: async (issue) => {
      successHaptic();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issues', key] }),
        queryClient.invalidateQueries({ queryKey: ['assigned'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ]);
      if (parentIssueId)
        await queryClient.invalidateQueries({
          queryKey: ['issue', parentIssueId],
        });
      router.replace(`/issue/${issue.id}`);
    },
    onError: (error) => Alert.alert('Could not create issue', error.message),
  });
  const submit = () => {
    if (dueDate && !validDate(dueDate)) return Alert.alert('Invalid due date', 'Use YYYY-MM-DD.');
    create.mutate();
  };

  if (board.isLoading) return <Loading />;
  if (!board.data || !selected) return <EmptyState title="Project unavailable" />;
  if (!board.data.permissions?.work_items?.create)
    return <EmptyState title="No permission to create issues" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>
        {board.data.project.key} · {parentIssueId ? 'NEW SUBTASK' : 'NEW ISSUE'}
      </Text>
      <Field
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="What needs to be done?"
      />
      <MarkdownField
        value={description}
        onChangeText={setDescription}
        placeholder="Add context, links, or acceptance criteria"
      />
      {board.data.issueTypes.length ? (
        <>
          <Text style={styles.label}>Type</Text>
          <View style={styles.states}>
            {board.data.issueTypes.map((type) => (
              <Pressable
                accessibilityRole="button"
                key={type.id}
                onPress={() => setTypeId(type.id)}
                style={[styles.state, selectedType === type.id && styles.selected]}
              >
                <Text
                  style={{
                    color: selectedType === type.id ? colors.onAccent : colors.ink,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {type.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Text style={styles.label}>State</Text>
      <View style={styles.states}>
        {board.data.columns.map((column) => (
          <Pressable
            accessibilityRole="button"
            key={column.id}
            onPress={() => setColumnId(column.id)}
            style={[styles.state, selected === column.id && styles.selected]}
          >
            <Text
              style={{
                color: selected === column.id ? colors.onAccent : colors.ink,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {column.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Priority</Text>
      <View style={styles.states}>
        {(['none', 'urgent', 'high', 'medium', 'low'] as const).map((value) => {
          const selected = priority === (value === 'none' ? null : value);
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPriority(value === 'none' ? null : value)}
              style={[styles.state, selected && styles.selected]}
            >
              <Text
                style={{
                  color: selected ? colors.onAccent : colors.ink,
                  fontSize: 13,
                  fontWeight: '600',
                  textTransform: 'capitalize',
                }}
              >
                {value}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.label}>Assignee</Text>
      <View style={styles.states}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAssigneeUserId(null)}
          style={[styles.state, assigneeUserId === null && styles.selected]}
        >
          <Text style={{ color: assigneeUserId === null ? colors.onAccent : colors.ink }}>
            Unassigned
          </Text>
        </Pressable>
        {board.data.assignees
          .filter((item) => item.kind === 'member')
          .map((item) => (
            <Pressable
              key={item.userId}
              accessibilityRole="button"
              onPress={() => setAssigneeUserId(item.userId)}
              style={[styles.state, assigneeUserId === item.userId && styles.selected]}
            >
              <Text
                style={{
                  color: assigneeUserId === item.userId ? colors.onAccent : colors.ink,
                }}
              >
                {item.name}
              </Text>
            </Pressable>
          ))}
      </View>
      {board.data.labels.length ? (
        <>
          <Text style={styles.label}>Labels</Text>
          <View style={styles.states}>
            {board.data.labels.map((label) => {
              const selected = labelIds.includes(label.id);
              return (
                <Pressable
                  key={label.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() =>
                    setLabelIds((current) =>
                      selected ? current.filter((id) => id !== label.id) : [...current, label.id],
                    )
                  }
                  style={[styles.state, selected && styles.selected]}
                >
                  <Text style={{ color: selected ? colors.onAccent : colors.ink }}>
                    {label.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      <DateField label="Due date" value={dueDate} onChange={setDueDate} />
      {board.data.project.cyclesEnabled ? (
        <>
          <Text style={styles.label}>Cycle</Text>
          <View style={styles.states}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCycleId(null)}
              style={[styles.state, cycleId === null && styles.selected]}
            >
              <Text style={{ color: cycleId === null ? colors.onAccent : colors.ink }}>
                No cycle
              </Text>
            </Pressable>
            {cycles.data?.map((cycle) => (
              <Pressable
                key={cycle.id}
                accessibilityRole="button"
                onPress={() => setCycleId(cycle.id)}
                style={[styles.state, cycleId === cycle.id && styles.selected]}
              >
                <Text
                  style={{
                    color: cycleId === cycle.id ? colors.onAccent : colors.ink,
                  }}
                >
                  {cycle.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {board.data.project.initiativesEnabled ? (
        <>
          <Text style={styles.label}>Initiative</Text>
          <View style={styles.states}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setInitiativeId(null)}
              style={[styles.state, initiativeId === null && styles.selected]}
            >
              <Text
                style={{
                  color: initiativeId === null ? colors.onAccent : colors.ink,
                }}
              >
                No initiative
              </Text>
            </Pressable>
            {initiatives.data?.map((initiative) => (
              <Pressable
                key={initiative.id}
                accessibilityRole="button"
                onPress={() => setInitiativeId(initiative.id)}
                style={[styles.state, initiativeId === initiative.id && styles.selected]}
              >
                <Text
                  style={{
                    color: initiativeId === initiative.id ? colors.onAccent : colors.ink,
                  }}
                >
                  {initiative.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Action
        label={create.isPending ? 'Creating…' : parentIssueId ? 'Create subtask' : 'Create issue'}
        onPress={submit}
        disabled={!title.trim() || create.isPending}
      />
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: 22, paddingBottom: 50 },
    eyebrow: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1,
      marginBottom: 28,
    },
    label: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    states: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 30 },
    state: {
      backgroundColor: colors.surface,
      borderRadius: 15,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    selected: { backgroundColor: colors.ink },
  });
