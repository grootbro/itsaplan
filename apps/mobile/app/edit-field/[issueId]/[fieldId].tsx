import { projectReference } from '@/lib/project-reference';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSuccessHaptic } from '@/lib/preferences-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { validDate } from '@/lib/validation';
import { DateField } from '@/ui/DateField';
import { Action, EmptyState, Field, Loading } from '@/ui/primitives';
import { useThemedStyles, type Palette } from '@/ui/theme';

const editableTypes = new Set([
  'text',
  'markdown',
  'url',
  'number',
  'boolean',
  'date',
  'select',
  'multi_select',
  'member',
]);

export default function EditField() {
  const successHaptic = useSuccessHaptic();
  const styles = useThemedStyles(createStyles);
  const { issueId: issueParam, fieldId: fieldParam } = useLocalSearchParams<{
    issueId: string;
    fieldId: string;
  }>();
  const issueId = Number(issueParam);
  const fieldId = Number(fieldParam);
  const router = useRouter();
  const queryClient = useQueryClient();
  const issue = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => api.issue(issueId),
    enabled: Number.isFinite(issueId),
  });
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const project = projects.data?.find((item) => item.id === issue.data?.projectId);
  const projectRef = project ? projectReference(project) : undefined;
  const board = useQuery({
    queryKey: ['board', projectRef],
    queryFn: () => api.board(projectReference(project!)),
    enabled: !!project,
  });
  const field = issue.data?.fields.find((item) => item.fieldId === fieldId);
  const definition = board.data?.customFields.find((item) => item.id === fieldId);
  const [value, setValue] = useState('');
  const [bool, setBool] = useState<boolean | null>(null);
  const [optionIds, setOptionIds] = useState<number[]>([]);

  useEffect(() => {
    if (!field) return;
    setValue(field.value == null || typeof field.value === 'boolean' ? '' : String(field.value));
    setBool(typeof field.value === 'boolean' ? field.value : null);
    setOptionIds(field.optionIds);
  }, [issueId, fieldId, field?.fieldId]);

  const save = useMutation({
    mutationFn: () => {
      if (!field) throw new Error('Field unavailable');
      if (field.fieldType === 'select' || field.fieldType === 'multi_select')
        return api.setIssueField(issueId, fieldId, { optionIds });
      if (field.fieldType === 'boolean')
        return api.setIssueField(issueId, fieldId, { value: bool });
      if (field.fieldType === 'number')
        return api.setIssueField(issueId, fieldId, {
          value: value.trim() ? Number(value.replace(',', '.')) : null,
        });
      return api.setIssueField(issueId, fieldId, {
        value: value.trim() || null,
      });
    },
    onSuccess: async () => {
      successHaptic();
      await queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      router.back();
    },
    onError: (error) => Alert.alert('Could not save field', error.message),
  });

  const submit = () => {
    if (!field) return;
    if (field.fieldType === 'date' && value && !validDate(value))
      return Alert.alert('Invalid date', 'Choose a valid date.');
    if (
      field.fieldType === 'number' &&
      value.trim() &&
      !Number.isFinite(Number(value.replace(',', '.')))
    )
      return Alert.alert('Invalid number', 'Enter a number.');
    save.mutate();
  };

  if (issue.isLoading || projects.isLoading || board.isLoading) return <Loading />;
  if (!issue.data || !field || !board.data || !definition)
    return <EmptyState title="Field unavailable" />;
  if (!board.data.permissions?.work_items?.edit || issue.data.archivedAt)
    return <EmptyState title="No permission to edit this field" />;
  if (!editableTypes.has(field.fieldType))
    return (
      <EmptyState
        title="Edit this field on the web"
        detail="Its native editor is not available yet."
      />
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.eyebrow}>{issue.data.identifier} · CUSTOM FIELD</Text>
      <Text style={styles.title}>{field.name}</Text>
      {['text', 'markdown', 'url', 'number'].includes(field.fieldType) ? (
        <Field
          label="Value"
          value={value}
          onChangeText={setValue}
          multiline={field.fieldType === 'markdown'}
          keyboardType={
            field.fieldType === 'number'
              ? 'decimal-pad'
              : field.fieldType === 'url'
                ? 'url'
                : 'default'
          }
          autoCapitalize={field.fieldType === 'url' ? 'none' : 'sentences'}
        />
      ) : null}
      {field.fieldType === 'date' ? (
        <DateField label="Value" value={value} onChange={setValue} />
      ) : null}
      {field.fieldType === 'boolean' ? (
        <View style={styles.options}>
          {[
            { label: 'Not set', value: null },
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ].map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected: bool === item.value }}
              onPress={() => setBool(item.value)}
              style={[styles.option, bool === item.value && styles.active]}
            >
              <Text style={[styles.optionText, bool === item.value && styles.activeText]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {['select', 'multi_select'].includes(field.fieldType) ? (
        <View style={styles.options}>
          {definition.options.map((option) => {
            const selected = optionIds.includes(option.id);
            return (
              <Pressable
                key={option.id}
                accessibilityRole={field.fieldType === 'multi_select' ? 'checkbox' : 'button'}
                accessibilityState={{ selected, checked: selected }}
                onPress={() =>
                  setOptionIds((current) =>
                    field.fieldType === 'select'
                      ? [option.id]
                      : selected
                        ? current.filter((id) => id !== option.id)
                        : [...current, option.id],
                  )
                }
                style={[styles.option, selected && styles.active]}
              >
                <Text style={[styles.optionText, selected && styles.activeText]}>
                  {option.value}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => setOptionIds([])}
            style={styles.option}
          >
            <Text style={styles.optionText}>Clear</Text>
          </Pressable>
        </View>
      ) : null}
      {field.fieldType === 'member' ? (
        <View style={styles.options}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setValue('')}
            style={[styles.option, !value && styles.active]}
          >
            <Text style={[styles.optionText, !value && styles.activeText]}>Unassigned</Text>
          </Pressable>
          {board.data.assignees
            .filter(
              (item) =>
                item.canReadWorkItems &&
                (definition.memberScope === 'agents'
                  ? item.kind === 'agent'
                  : definition.memberScope === 'humans'
                    ? item.kind === 'member'
                    : true),
            )
            .map((item) => (
              <Pressable
                key={item.userId}
                accessibilityRole="button"
                onPress={() => setValue(item.userId)}
                style={[styles.option, value === item.userId && styles.active]}
              >
                <Text style={[styles.optionText, value === item.userId && styles.activeText]}>
                  {item.name}
                </Text>
              </Pressable>
            ))}
        </View>
      ) : null}
      <Action
        label={save.isPending ? 'Saving…' : 'Save field'}
        onPress={submit}
        disabled={save.isPending}
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
      letterSpacing: 0.8,
    },
    title: {
      color: colors.ink,
      fontSize: 25,
      fontWeight: '700',
      marginTop: 10,
      marginBottom: 24,
    },
    options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 },
    option: {
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderRadius: 13,
    },
    active: { backgroundColor: colors.ink },
    optionText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
    activeText: { color: colors.onAccent },
  });
