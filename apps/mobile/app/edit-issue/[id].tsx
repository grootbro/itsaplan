import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useSuccessHaptic } from '@/lib/preferences-context';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import type { Priority } from '@/lib/types';
import { validDate } from '@/lib/validation';
import { Action, EmptyState, Field, Loading } from '@/ui/primitives';
import { DateField } from '@/ui/DateField';
import { MarkdownField } from '@/ui/MarkdownField';
import { useThemedStyles, type Palette } from '@/ui/theme';

const priorities: { label: string; value: Priority }[] = [
  { label: 'None', value: null },
  { label: 'Urgent', value: 'urgent' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export default function EditIssue() {
  const successHaptic = useSuccessHaptic();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const issueId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const issue = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => api.issue(issueId),
    enabled: Number.isFinite(issueId),
  });
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const project = projects.data?.find((item) => item.id === issue.data?.projectId);
  const board = useQuery({
    queryKey: ['board', project?.key],
    queryFn: () => api.board(project!.key),
    enabled: !!project,
  });
  const cycles = useQuery({
    queryKey: ['cycle-options', project?.key],
    queryFn: () => api.cycleOptions(project!.key),
    enabled: !!project && !!board.data?.project.cyclesEnabled,
  });
  const initiatives = useQuery({
    queryKey: ['initiative-options', project?.key, issue.data?.initiative?.id],
    queryFn: () => api.initiativeOptions(project!.key, issue.data?.initiative?.id),
    enabled: !!project && !!board.data?.project.initiativesEnabled,
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>(null);
  const [assigneeUserId, setAssigneeUserId] = useState<string | null>(null);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [labelIds, setLabelIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatePoints, setEstimatePoints] = useState('');
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [initiativeId, setInitiativeId] = useState<number | null>(null);

  useEffect(() => {
    if (!issue.data) return;
    setTitle(issue.data.title);
    setDescription(issue.data.description);
    setPriority(issue.data.priority);
    setAssigneeUserId(issue.data.assigneeUserId);
    setTypeId(issue.data.typeId);
    setLabelIds(issue.data.labelIds);
    setStartDate(issue.data.startDate ?? '');
    setDueDate(issue.data.dueDate ?? '');
    setEstimatePoints(issue.data.estimatePoints?.toString() ?? '');
    setCycleId(issue.data.cycle?.id ?? null);
    setInitiativeId(issue.data.initiative?.id ?? null);
  }, [issue.data?.id]);

  const submit = () => {
    if (startDate && !validDate(startDate))
      return Alert.alert('Invalid start date', 'Use YYYY-MM-DD.');
    if (dueDate && !validDate(dueDate)) return Alert.alert('Invalid due date', 'Use YYYY-MM-DD.');
    if (startDate && dueDate && startDate > dueDate)
      return Alert.alert('Invalid dates', 'The due date must be on or after the start date.');
    const points = estimatePoints.trim();
    if (points && (!Number.isFinite(Number(points)) || Number(points) < 0))
      return Alert.alert(
        'Invalid estimate',
        'Enter a number of points greater than or equal to zero.',
      );
    save.mutate();
  };

  const save = useMutation({
    mutationFn: () =>
      api.updateIssue(issueId, {
        title: title.trim(),
        description,
        priority,
        assigneeUserId,
        typeId,
        labelIds,
        startDate: startDate || null,
        dueDate: dueDate || null,
        estimatePoints: estimatePoints.trim() ? Number(estimatePoints) : null,
        ...(cycleId !== (issue.data?.cycle?.id ?? null) ? { cycleId } : {}),
        ...(initiativeId !== (issue.data?.initiative?.id ?? null) ? { initiativeId } : {}),
      }),
    onSuccess: async () => {
      successHaptic();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
        queryClient.invalidateQueries({ queryKey: ['issues', project?.key] }),
        queryClient.invalidateQueries({ queryKey: ['assigned'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ]);
      router.back();
    },
    onError: (error) => Alert.alert('Could not save issue', error.message),
  });

  if (issue.isLoading || board.isLoading) return <Loading />;
  if (!issue.data || !board.data) return <EmptyState title="Issue unavailable" />;
  if (!board.data.permissions?.work_items?.edit)
    return <EmptyState title="No permission to edit this issue" />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>{issue.data.identifier}</Text>
      <Field label="Title" value={title} onChangeText={setTitle} />
      <MarkdownField value={description} onChangeText={setDescription} placeholder="Add details" />
      <Text style={styles.label}>Type</Text>
      <View style={styles.options}>
        {board.data.issueTypes.map((type) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: typeId === type.id }}
            key={type.id}
            onPress={() => setTypeId(type.id)}
            style={[styles.option, typeId === type.id && styles.active]}
          >
            <Text style={[styles.optionText, typeId === type.id && styles.activeText]}>
              {type.name}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Priority</Text>
      <View style={styles.options}>
        {priorities.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.label}
            onPress={() => setPriority(item.value)}
            style={[styles.option, priority === item.value && styles.active]}
          >
            <Text style={[styles.optionText, priority === item.value && styles.activeText]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Assignee</Text>
      <View style={styles.options}>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAssigneeUserId(null)}
          style={[styles.option, assigneeUserId === null && styles.active]}
        >
          <Text style={[styles.optionText, assigneeUserId === null && styles.activeText]}>
            Unassigned
          </Text>
        </Pressable>
        {board.data.assignees
          .filter((item) => item.kind === 'member')
          .map((item) => (
            <Pressable
              accessibilityRole="button"
              key={item.userId}
              onPress={() => setAssigneeUserId(item.userId)}
              style={[styles.option, assigneeUserId === item.userId && styles.active]}
            >
              <Text
                style={[styles.optionText, assigneeUserId === item.userId && styles.activeText]}
              >
                {item.name}
              </Text>
            </Pressable>
          ))}
      </View>
      {board.data.labels.length ? (
        <>
          <Text style={styles.label}>Labels</Text>
          <View style={styles.options}>
            {board.data.labels.map((label) => {
              const selected = labelIds.includes(label.id);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  key={label.id}
                  onPress={() =>
                    setLabelIds((current) =>
                      selected ? current.filter((id) => id !== label.id) : [...current, label.id],
                    )
                  }
                  style={[styles.option, selected && styles.active]}
                >
                  <Text style={[styles.optionText, selected && styles.activeText]}>
                    {label.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
      <DateField label="Start date" value={startDate} onChange={setStartDate} />
      <DateField label="Due date" value={dueDate} onChange={setDueDate} />
      <Field
        label="Estimate · points"
        value={estimatePoints}
        onChangeText={setEstimatePoints}
        placeholder="Optional"
        keyboardType="decimal-pad"
      />
      {board.data.project.cyclesEnabled ? (
        <>
          <Text style={styles.label}>Cycle</Text>
          <View style={styles.options}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCycleId(null)}
              style={[styles.option, cycleId === null && styles.active]}
            >
              <Text style={[styles.optionText, cycleId === null && styles.activeText]}>
                No cycle
              </Text>
            </Pressable>
            {cycles.data?.map((cycle) => (
              <Pressable
                key={cycle.id}
                accessibilityRole="button"
                onPress={() => setCycleId(cycle.id)}
                style={[styles.option, cycleId === cycle.id && styles.active]}
              >
                <Text style={[styles.optionText, cycleId === cycle.id && styles.activeText]}>
                  {cycle.name}
                </Text>
              </Pressable>
            ))}
            {issue.data.cycle &&
            !cycles.data?.some((cycle) => cycle.id === issue.data.cycle?.id) ? (
              <Text style={styles.optionText}>Current: {issue.data.cycle.name}</Text>
            ) : null}
          </View>
        </>
      ) : null}
      {board.data.project.initiativesEnabled ? (
        <>
          <Text style={styles.label}>Initiative</Text>
          <View style={styles.options}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setInitiativeId(null)}
              style={[styles.option, initiativeId === null && styles.active]}
            >
              <Text style={[styles.optionText, initiativeId === null && styles.activeText]}>
                No initiative
              </Text>
            </Pressable>
            {initiatives.data?.map((initiative) => (
              <Pressable
                key={initiative.id}
                accessibilityRole="button"
                onPress={() => setInitiativeId(initiative.id)}
                style={[styles.option, initiativeId === initiative.id && styles.active]}
              >
                <Text
                  style={[styles.optionText, initiativeId === initiative.id && styles.activeText]}
                >
                  {initiative.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      <Action
        label={save.isPending ? 'Saving…' : 'Save changes'}
        onPress={submit}
        disabled={!title.trim() || save.isPending}
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
      marginBottom: 26,
    },
    label: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 10,
    },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    option: {
      backgroundColor: colors.surface,
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 13,
    },
    active: { backgroundColor: colors.ink },
    optionText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
    activeText: { color: colors.onAccent },
  });
