import { useMutation, useQuery } from '@tanstack/react-query';
import { usePreventRemove } from '@react-navigation/native';
import { useNavigation } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { issuePatch, issueValidation, type IssueDraft } from '@/lib/issue-editor';
import type { Issue, ProjectBoard } from '@/lib/types';
import { Action, Field } from './primitives';
import { DateField } from './DateField';
import { MarkdownField } from './MarkdownField';
import { SelectionField } from './SelectionField';
import { Notice } from './work-controls';
import { useThemedStyles, type Palette } from './theme';

export function IssueEditor({
  initial,
  board,
  projectRef,
  issueId,
  creatingSubtask = false,
  canSave,
  onSubmit,
  onComplete,
}: {
  initial: IssueDraft;
  board: ProjectBoard;
  projectRef: string;
  issueId?: number;
  creatingSubtask?: boolean;
  canSave: boolean;
  onSubmit: (draft: IssueDraft, original: IssueDraft) => Promise<Issue>;
  onComplete: (issue: Issue) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const original = useRef(initial).current;
  const [draft, setDraft] = useState(original);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Issue | null>(null);
  const submitting = useRef(false);
  const completed = useRef(onComplete);
  completed.current = onComplete;
  const dirty = Object.keys(issuePatch(draft, original)).length > 0;
  const save = useMutation({
    mutationFn: ({ values }: { values: IssueDraft }) => onSubmit(values, original),
    onSuccess: setSaved,
    onError: (failure) => setError(failure.message),
    onSettled: () => {
      submitting.current = false;
    },
  });
  usePreventRemove((dirty || save.isPending) && !saved, ({ data }) => {
    if (submitting.current) return;
    Alert.alert('Discard issue changes?', 'Your unsaved text and property changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });
  useEffect(() => {
    if (saved) completed.current(saved);
  }, [saved]);
  const cycles = useQuery({
    queryKey: ['cycle-options', projectRef],
    queryFn: () => api.cycleOptions(projectRef),
    enabled: !!board.project.cyclesEnabled,
  });
  const initiatives = useQuery({
    queryKey: ['initiative-options', projectRef, original.initiativeId],
    queryFn: () => api.initiativeOptions(projectRef, original.initiativeId ?? undefined),
    enabled: !!board.project.initiativesEnabled,
  });
  const editable = canSave && !save.isPending && !saved;
  const update = <K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) => {
    if (!editable) return;
    setDraft((current) => ({ ...current, [key]: value }));
    setError(null);
  };
  const submit = () => {
    if (submitting.current || !editable || (issueId && !dirty)) return;
    const validation = issueValidation(draft);
    setError(validation);
    if (validation) return;
    submitting.current = true;
    save.mutate({ values: { ...draft, labelIds: [...draft.labelIds] } });
  };
  let submitLabel = 'Create issue';
  if (creatingSubtask) submitLabel = 'Create subtask';
  if (issueId) submitLabel = 'Save changes';
  if (save.isPending) submitLabel = 'Saving…';
  return (
    <ScrollView
      style={styles.screen}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
    >
      <Text style={styles.project}>
        {board.project.name}
        {creatingSubtask ? ' · New subtask' : ''}
      </Text>
      {!canSave ? (
        <Notice message="Editing is unavailable. Your unsaved text remains here." />
      ) : null}
      {error ? <Notice message={error} /> : null}
      <Field
        label="Title"
        value={draft.title}
        editable={!!editable}
        onChangeText={(value) => update('title', value)}
      />
      <MarkdownField
        issueId={issueId}
        value={draft.description}
        editable={!!editable}
        onChangeText={(value) => update('description', value)}
        placeholder="Add context, links, or acceptance criteria"
      />
      <Text accessibilityRole="header" style={styles.heading}>
        Properties
      </Text>
      <SelectionField
        label="State"
        selected={[draft.columnId]}
        disabled={!editable}
        options={board.columns.map((column) => ({ value: column.id, label: column.name }))}
        onSelect={(value) => update('columnId', value)}
      />
      <SelectionField
        label="Type"
        selected={[draft.typeId]}
        disabled={!editable}
        options={[
          { value: null, label: 'No type' },
          ...board.issueTypes.map((type) => ({ value: type.id, label: type.name })),
        ]}
        onSelect={(value) => update('typeId', value)}
      />
      <SelectionField<IssueDraft['priority']>
        label="Priority"
        selected={[draft.priority]}
        disabled={!editable}
        options={[
          { value: null, label: 'No priority' },
          { value: 'urgent', label: 'Urgent' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ]}
        onSelect={(value) => update('priority', value)}
      />
      <SelectionField
        label="Assignee"
        selected={[draft.assigneeUserId]}
        disabled={!editable}
        options={[
          { value: null, label: 'Unassigned' },
          ...board.assignees
            .filter((member) => member.kind === 'member')
            .map((member) => ({ value: member.userId, label: member.name })),
        ]}
        onSelect={(value) => update('assigneeUserId', value)}
      />
      {board.assignees.some((member) => member.kind === 'agent') || draft.delegateUserId ? (
        <SelectionField
          label="Delegate"
          selected={[draft.delegateUserId]}
          disabled={!editable}
          options={[
            { value: null, label: 'No delegate' },
            ...board.assignees
              .filter((member) => member.kind === 'agent')
              .map((member) => ({ value: member.userId, label: member.name })),
          ]}
          onSelect={(value) => update('delegateUserId', value)}
        />
      ) : null}
      {board.labels.length || draft.labelIds.length ? (
        <SelectionField
          label="Labels"
          selected={draft.labelIds}
          multiple
          disabled={!editable}
          options={board.labels.map((label) => ({ value: label.id, label: label.name }))}
          onSelect={(value) =>
            update(
              'labelIds',
              draft.labelIds.includes(value)
                ? draft.labelIds.filter((id) => id !== value)
                : [...draft.labelIds, value],
            )
          }
        />
      ) : null}
      <View style={styles.dates}>
        <DateField
          label="Start date"
          value={draft.startDate}
          disabled={!editable}
          onChange={(value) => update('startDate', value)}
        />
        <DateField
          label="Due date"
          value={draft.dueDate}
          disabled={!editable}
          onChange={(value) => update('dueDate', value)}
        />
        {board.project.pointsEstimateEnabled ? (
          <Field
            label="Estimate · points"
            value={draft.estimatePoints}
            editable={!!editable}
            keyboardType="decimal-pad"
            onChangeText={(value) => update('estimatePoints', value)}
          />
        ) : null}
        {board.project.timeEstimateEnabled ? (
          <Field
            label="Estimate · minutes"
            value={draft.estimateMinutes}
            editable={!!editable}
            keyboardType="number-pad"
            onChangeText={(value) => update('estimateMinutes', value)}
          />
        ) : null}
      </View>
      {board.project.cyclesEnabled ? (
        <>
          {cycles.isError ? (
            <Notice
              message="Could not load cycle choices. The current cycle is preserved."
              onPress={() => void cycles.refetch()}
            />
          ) : null}
          <SelectionField
            label="Cycle"
            selected={[draft.cycleId]}
            disabled={!editable}
            options={[
              { value: null, label: 'No cycle' },
              ...(cycles.data ?? []).map((cycle) => ({ value: cycle.id, label: cycle.name })),
            ]}
            onSelect={(value) => update('cycleId', value)}
          />
        </>
      ) : null}
      {board.project.initiativesEnabled ? (
        <>
          {initiatives.isError ? (
            <Notice
              message="Could not load initiative choices. The current initiative is preserved."
              onPress={() => void initiatives.refetch()}
            />
          ) : null}
          <SelectionField
            label="Initiative"
            selected={[draft.initiativeId]}
            disabled={!editable}
            options={[
              { value: null, label: 'No initiative' },
              ...(initiatives.data ?? []).map((initiative) => ({
                value: initiative.id,
                label: initiative.title,
              })),
            ]}
            onSelect={(value) => update('initiativeId', value)}
          />
        </>
      ) : null}
      <View style={styles.submit}>
        <Action
          label={submitLabel}
          disabled={!editable || !draft.title.trim() || (!!issueId && !dirty)}
          onPress={submit}
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: 22, maxWidth: 720, width: '100%', alignSelf: 'center' },
    project: { color: colors.muted, fontSize: 15, marginBottom: 22 },
    heading: { color: colors.ink, fontSize: 19, fontWeight: '600', marginTop: 24, marginBottom: 8 },
    dates: { marginTop: 24 },
    submit: { marginTop: 28 },
  });
