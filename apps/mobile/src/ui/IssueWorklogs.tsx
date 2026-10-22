import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { canManageEntry } from '@/lib/collaboration';
import { Loading } from './primitives';
import { NativeSheet, Notice } from './work-controls';
import { WorklogForm } from './WorklogForm';
import { useThemedStyles, type Palette } from './theme';

export function IssueWorklogs({
  issueId,
  canEdit,
  owner,
  userId,
  loggedMinutes,
}: {
  issueId: number;
  canEdit: boolean;
  owner: boolean;
  userId?: string;
  loggedMinutes: number;
}) {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const client = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const logs = useQuery({ queryKey: ['worklogs', issueId], queryFn: () => api.worklogs(issueId) });
  const editing = logs.data?.find((entry) => entry.id === editingId);
  const refresh = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['worklogs', issueId] }),
      client.invalidateQueries({ queryKey: ['issue', issueId] }),
      client.invalidateQueries({ queryKey: ['issues'] }),
      client.invalidateQueries({ queryKey: ['feed', issueId] }),
    ]);
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Parameters<typeof api.updateWorklog>[1] }) =>
      api.updateWorklog(id, body),
    onSuccess: async () => {
      setEditingId(null);
      await refresh();
    },
    onError: (error) => Alert.alert('Could not save time entry', error.message),
  });
  const remove = useMutation({
    mutationFn: api.deleteWorklog,
    onSuccess: refresh,
    onError: (error) => Alert.alert('Could not delete time entry', error.message),
  });
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <View style={{ flex: 1 }}>
          <Text accessibilityRole="header" style={styles.title}>
            Time
          </Text>
          <Text style={styles.meta}>
            {Math.floor(loggedMinutes / 60)}h {loggedMinutes % 60}m logged
          </Text>
        </View>
        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => router.push(`/log-time/${issueId}`)}
          >
            <Text style={styles.buttonText}>Log time</Text>
          </Pressable>
        ) : null}
      </View>
      {logs.isPending ? <Loading /> : null}
      {logs.isError ? (
        <Notice message="Could not load time entries." onPress={() => void logs.refetch()} />
      ) : null}
      {logs.data?.length === 0 ? <Text style={styles.meta}>No time entries yet.</Text> : null}
      {logs.data?.map((entry) => (
        <View key={entry.id} style={styles.entry}>
          <Text style={styles.meta}>
            {entry.userName ?? 'Member'} · {entry.spentOn}
          </Text>
          <Text style={styles.body}>
            {Math.floor(entry.minutes / 60)}h {entry.minutes % 60}m
            {entry.note ? ` · ${entry.note}` : ''}
          </Text>
          {canManageEntry(canEdit, owner, userId, entry.userId) ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                style={styles.button}
                disabled={update.isPending || remove.isPending}
                onPress={() => setEditingId(entry.id)}
              >
                <Text style={styles.buttonText}>Edit entry</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={styles.button}
                disabled={update.isPending || remove.isPending}
                onPress={() =>
                  Alert.alert(
                    'Delete time entry?',
                    'The logged total will decrease by this entry. This cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => remove.mutate(entry.id),
                      },
                    ],
                  )
                }
              >
                <Text style={styles.danger}>Delete entry</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
      {editing ? (
        <NativeSheet
          visible
          title="Edit time entry"
          onClose={() => {
            if (!update.isPending)
              Alert.alert('Close time editor?', 'Unsaved changes will be discarded.', [
                { text: 'Keep editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => setEditingId(null) },
              ]);
          }}
        >
          <WorklogForm
            key={editing.id}
            initial={editing}
            pending={update.isPending}
            onSubmit={(body) => {
              if (canManageEntry(canEdit, owner, userId, editing.userId) && !update.isPending)
                update.mutate({ id: editing.id, body });
            }}
          />
        </NativeSheet>
      ) : null}
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    section: {
      marginTop: 32,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    heading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
    title: { color: colors.ink, fontSize: 18, fontWeight: '600' },
    meta: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
    body: { color: colors.ink, fontSize: 16, lineHeight: 24, marginTop: 7 },
    button: { minWidth: 48, minHeight: 48, paddingHorizontal: 10, justifyContent: 'center' },
    buttonText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    entry: {
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    danger: { color: colors.danger, fontSize: 15 },
  });
