import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { planningApi } from '@/lib/planning-api';
import {
  initiativeStatuses,
  planningDraft,
  planningPayload,
  planningValidation,
  type PlanningEntry,
  type PlanningKind,
} from '@/lib/planning-model';
import type { Priority } from '@/lib/types';
import { NativeSheet, Choices, Notice } from './work-controls';
import { Action, Field } from './primitives';
import { DateField } from './DateField';
import { MarkdownField } from './MarkdownField';
import { useColors } from './theme';

export function PlanningEditor({
  kind,
  projectRef,
  entry,
  onClose,
  onSaved,
}: {
  kind: PlanningKind;
  projectRef: string;
  entry?: PlanningEntry;
  onClose: () => void;
  onSaved: (id: number) => void;
}) {
  const colors = useColors();
  const client = useQueryClient();
  const initial = useRef(planningDraft(entry)).current;
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  const singular = kind === 'cycles' ? 'cycle' : 'initiative';
  const changed = Object.keys(planningPayload(kind, draft, initial)).length > 0;
  const save = useMutation({
    mutationFn: () =>
      planningApi.save(
        kind,
        projectRef,
        entry?.id,
        planningPayload(kind, draft, entry ? initial : undefined),
      ),
    onSuccess: async (result) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['planning'] }),
        client.invalidateQueries({ queryKey: ['issues'] }),
        client.invalidateQueries({ queryKey: ['issue'] }),
        client.invalidateQueries({ queryKey: [kind] }),
        client.invalidateQueries({
          queryKey: [kind === 'cycles' ? 'cycle-options' : 'initiative-options'],
        }),
      ]);
      onSaved(result.id);
    },
    onError: (error) => setError(error.message),
    onSettled: () => {
      saving.current = false;
    },
  });
  const close = () => {
    if (saving.current) return;
    if (!changed) return onClose();
    Alert.alert('Discard changes?', 'Your unsaved text will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  };
  const submit = () => {
    if (saving.current || (entry && !Object.keys(planningPayload(kind, draft, initial)).length))
      return;
    const validation = planningValidation(kind, draft);
    setError(validation);
    if (validation) return;
    saving.current = true;
    save.mutate();
  };
  return (
    <NativeSheet visible title={`${entry ? 'Edit' : 'New'} ${singular}`} onClose={close}>
      <View style={{ width: '100%', maxWidth: 640, alignSelf: 'center' }}>
        {error ? <Notice message={error} /> : null}
        {save.isPending ? null : (
          <>
            <Field
              label={kind === 'cycles' ? 'Name' : 'Title'}
              value={draft.title}
              onChangeText={(title) => setDraft({ ...draft, title })}
            />
            {kind === 'cycles' ? (
              <Field
                label="Goal"
                value={draft.description}
                onChangeText={(description) => setDraft({ ...draft, description })}
                multiline
              />
            ) : (
              <>
                <MarkdownField
                  value={draft.description}
                  onChangeText={(description) => setDraft({ ...draft, description })}
                />
                <Choices
                  label="Status"
                  value={draft.status}
                  options={initiativeStatuses.map((value) => ({
                    value,
                    label: value[0].toUpperCase() + value.slice(1),
                  }))}
                  onChange={(status) => setDraft({ ...draft, status })}
                />
                <Choices<Priority>
                  label="Priority"
                  value={draft.priority}
                  options={[
                    { value: null, label: 'No priority' },
                    ...(['urgent', 'high', 'medium', 'low'] as const).map((value) => ({
                      value,
                      label: value[0].toUpperCase() + value.slice(1),
                    })),
                  ]}
                  onChange={(priority) => setDraft({ ...draft, priority })}
                />
              </>
            )}
            <DateField
              label="Start date"
              value={draft.startDate ?? ''}
              onChange={(startDate) => setDraft({ ...draft, startDate: startDate || null })}
              disabled={save.isPending}
            />
            <DateField
              label={kind === 'cycles' ? 'End date' : 'Target date'}
              value={draft.targetDate ?? ''}
              onChange={(targetDate) => setDraft({ ...draft, targetDate: targetDate || null })}
              disabled={save.isPending}
            />
          </>
        )}
        {save.isPending ? (
          <Text accessibilityLiveRegion="polite" style={{ color: colors.muted }}>
            Saving…
          </Text>
        ) : null}
        <Action
          label={`Save ${singular}`}
          disabled={save.isPending || !draft.title.trim() || (!!entry && !changed)}
          onPress={submit}
        />
      </View>
    </NativeSheet>
  );
}
