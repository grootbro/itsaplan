import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { api } from '@/lib/api';
import type { Issue, Priority, ProjectBoard } from '@/lib/types';
import { Action } from './primitives';
import { DateField } from './DateField';
import { Choices, NativeSheet } from './work-controls';
import { colors } from './theme';

export function IssueActions({
  issue,
  board,
  onClose,
}: {
  issue: Issue;
  board: ProjectBoard;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [date, setDate] = useState(issue.dueDate?.slice(0, 10) ?? '');
  const update = useMutation({
    mutationFn: (patch: Parameters<typeof api.updateIssue>[1]) => api.updateIssue(issue.id, patch),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['issues'] }),
        client.invalidateQueries({ queryKey: ['issue', issue.id] }),
        client.invalidateQueries({ queryKey: ['assigned'] }),
        client.invalidateQueries({ queryKey: ['search'] }),
        client.invalidateQueries({ queryKey: ['feed', issue.id] }),
      ]);
      onClose();
    },
    onError: (error) => Alert.alert('Could not update issue', error.message),
  });
  const save = (patch: Parameters<typeof api.updateIssue>[1]) => {
    if (!update.isPending) update.mutate(patch);
  };
  return (
    <NativeSheet title={issue.identifier} visible onClose={onClose}>
      <Text
        style={{
          color: colors.ink,
          fontSize: 22,
          lineHeight: 29,
          fontWeight: '600',
          marginBottom: 24,
        }}
      >
        {issue.title}
      </Text>
      {update.isPending ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.muted }}>
          Saving…
        </Text>
      ) : (
        <>
          <Choices
            label="Status"
            value={issue.columnId}
            options={[...board.columns]
              .sort((a, b) => a.position - b.position)
              .map((column) => ({ value: column.id, label: column.name }))}
            onChange={(columnId) => save({ columnId })}
          />
          <Choices<Priority>
            label="Priority"
            value={issue.priority}
            options={[
              { value: null, label: 'No priority' },
              { value: 'urgent', label: 'Urgent' },
              { value: 'high', label: 'High' },
              { value: 'medium', label: 'Medium' },
              { value: 'low', label: 'Low' },
            ]}
            onChange={(priority) => save({ priority })}
          />
          <Choices<string | null>
            label="Assignee"
            value={issue.assigneeUserId}
            options={[
              { value: null, label: 'Unassigned' },
              ...board.assignees
                .filter((person) => person.canReadWorkItems)
                .map((person) => ({ value: person.userId, label: person.name })),
            ]}
            onChange={(assigneeUserId) => save({ assigneeUserId })}
          />
          <DateField label="Due date" value={date} onChange={setDate} />
          <Action
            label="Save due date"
            disabled={date === (issue.dueDate?.slice(0, 10) ?? '')}
            onPress={() => save({ dueDate: date || null })}
          />
        </>
      )}
    </NativeSheet>
  );
}
