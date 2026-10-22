import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { api } from '@/lib/api';
import { WorklogForm } from '@/ui/WorklogForm';
import { EmptyState } from '@/ui/primitives';
import { useThemedStyles, type Palette } from '@/ui/theme';

export default function LogTime() {
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const issueId = Number(id);
  const router = useRouter();
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (body: { minutes: number; spentOn: string; note: string | null }) =>
      api.logTime(issueId, body.minutes, body.spentOn, body.note ?? ''),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['issue', issueId] }),
        client.invalidateQueries({ queryKey: ['worklogs', issueId] }),
        client.invalidateQueries({ queryKey: ['issues'] }),
        client.invalidateQueries({ queryKey: ['feed', issueId] }),
      ]);
      router.back();
    },
    onError: (error) => Alert.alert('Could not log time', error.message),
  });
  if (!Number.isSafeInteger(issueId) || issueId <= 0) return <EmptyState title="Invalid issue" />;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      <WorklogForm key={issueId} pending={save.isPending} onSubmit={(body) => save.mutate(body)} />
    </ScrollView>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    content: { padding: 22, paddingBottom: 50 },
  });
