import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { activityRows, canManageEntry } from '@/lib/collaboration';
import type { FeedItem } from '@/lib/types';
import { Action, Loading } from './primitives';
import { MarkdownText } from './MarkdownText';
import { Choices, NativeSheet, Notice } from './work-controls';
import { useColors, useThemedStyles, type Palette } from './theme';

type Composer = { mode: 'new' | 'reply' | 'edit'; target?: FeedItem };
export function IssueDiscussion({
  issueId,
  canEdit,
  owner,
  userId,
}: {
  issueId: number;
  canEdit: boolean;
  owner: boolean;
  userId?: string;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const client = useQueryClient();
  const [mode, setMode] = useState<'all' | 'comments'>('all');
  const [composer, setComposer] = useState<Composer | null>(null);
  const [draft, setDraft] = useState('');
  const feed = useInfiniteQuery({
    queryKey: ['feed', issueId],
    initialPageParam: undefined as unknown,
    queryFn: ({ pageParam }) => api.feed(issueId, pageParam),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const refresh = () => client.invalidateQueries({ queryKey: ['feed', issueId] });
  const save = useMutation({
    mutationFn: ({ editor, body }: { editor: Composer; body: string }) =>
      editor.mode === 'edit'
        ? api.editComment(editor.target!.id, body)
        : api.comment(issueId, body, editor.mode === 'reply' ? editor.target!.id : undefined),
    onSuccess: async () => {
      setDraft('');
      setComposer(null);
      await refresh();
    },
    onError: (error) => Alert.alert('Could not save comment', error.message),
  });
  const remove = useMutation({
    mutationFn: api.deleteComment,
    onSuccess: refresh,
    onError: (error) => Alert.alert('Could not delete comment', error.message),
  });
  const open = (editor: Composer) => {
    setComposer(editor);
    setDraft(editor.mode === 'edit' ? (editor.target?.body ?? '') : '');
  };
  const close = () => {
    if (save.isPending) return;
    const initial = composer?.mode === 'edit' ? (composer.target?.body ?? '') : '';
    if (draft !== initial)
      Alert.alert('Discard comment changes?', 'Your unsaved text will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            setComposer(null);
            setDraft('');
          },
        },
      ]);
    else setComposer(null);
  };
  const rows = activityRows(feed.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (row) => mode === 'all' || row.item.kind === 'comment',
  );
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Discussion & activity
        </Text>
        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => open({ mode: 'new' })}
          >
            <Text style={styles.buttonText}>Comment</Text>
          </Pressable>
        ) : null}
      </View>
      <Choices
        label="Show"
        value={mode}
        options={[
          { value: 'all', label: 'All activity' },
          { value: 'comments', label: 'Comments' },
        ]}
        onChange={setMode}
      />
      {feed.isPending ? <Loading /> : null}
      {feed.isError ? (
        <Notice
          message={
            feed.data
              ? 'Could not refresh activity. Loaded entries remain below.'
              : 'Activity unavailable.'
          }
          onPress={() => void feed.refetch()}
        />
      ) : null}
      {!feed.isPending && !feed.isError && !rows.length ? (
        <Text style={styles.muted}>
          No {mode === 'comments' ? 'comments' : 'activity'} in the loaded entries.
        </Text>
      ) : null}
      {rows.map(({ item, depth }) => (
        <View key={item.id} style={[styles.entry, { marginLeft: Math.min(depth, 3) * 12 }]}>
          <Text style={styles.meta}>
            {item.actorName ?? 'System'} · {new Date(item.createdAt).toLocaleString()}
            {item.editedAt ? ' · Edited' : ''}
          </Text>
          {item.replyToId !== null ? (
            <Text style={styles.meta}>Reply to comment #{item.replyToId}</Text>
          ) : null}
          {item.kind === 'comment' && item.body ? (
            <View style={{ marginTop: 10 }}>
              <MarkdownText>{item.body}</MarkdownText>
            </View>
          ) : (
            <Text selectable style={styles.body}>
              {item.body ?? (item.action ?? item.kind).replaceAll('_', ' ')}
            </Text>
          )}
          {item.kind === 'comment' && canEdit ? (
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Reply to ${item.actorName ?? 'comment'}`}
                onPress={() => open({ mode: 'reply', target: item })}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Reply</Text>
              </Pressable>
              {canManageEntry(canEdit, owner, userId, item.actorUserId) ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => open({ mode: 'edit', target: item })}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={remove.isPending}
                    onPress={() =>
                      Alert.alert(
                        'Delete comment and its replies?',
                        'This permanently removes the comment and every reply below it.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => remove.mutate(item.id),
                          },
                        ],
                      )
                    }
                    style={styles.button}
                  >
                    <Text style={styles.danger}>Delete</Text>
                  </Pressable>
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      ))}
      {feed.hasNextPage ? (
        <Action
          muted
          label={feed.isFetchingNextPage ? 'Loading earlier activity…' : 'Load earlier activity'}
          disabled={feed.isFetching}
          onPress={() => void feed.fetchNextPage()}
        />
      ) : null}
      {composer ? (
        <NativeSheet
          visible
          title={
            composer.mode === 'edit'
              ? 'Edit comment'
              : composer.mode === 'reply'
                ? 'Reply'
                : 'New comment'
          }
          onClose={close}
        >
          {composer.target ? (
            <View style={styles.quote}>
              <Text style={styles.meta}>{composer.target.actorName ?? 'Member'}</Text>
              <Text style={styles.muted} numberOfLines={4}>
                {composer.target.body}
              </Text>
            </View>
          ) : null}
          <TextInput
            accessibilityLabel="Comment text"
            editable={!save.isPending}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={50_000}
            placeholder="Write a comment…"
            placeholderTextColor={colors.muted}
            style={styles.editor}
          />
          <Text style={styles.hint}>Use @username to mention a member or agent.</Text>
          <Action
            label={
              save.isPending
                ? 'Saving…'
                : composer.mode === 'edit'
                  ? 'Save changes'
                  : 'Post comment'
            }
            disabled={save.isPending || !draft.trim() || !canEdit}
            onPress={() => {
              if (draft.trim() && !save.isPending && canEdit)
                save.mutate({ editor: composer, body: draft.trim() });
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
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 10,
    },
    title: { color: colors.ink, fontSize: 18, fontWeight: '600' },
    button: { minHeight: 48, minWidth: 48, paddingHorizontal: 10, justifyContent: 'center' },
    buttonText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
    danger: { color: colors.danger, fontSize: 15 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    entry: {
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    meta: { color: colors.muted, fontSize: 13, lineHeight: 20 },
    body: { color: colors.ink, fontSize: 16, lineHeight: 25, marginTop: 7 },
    muted: { color: colors.muted, fontSize: 15, lineHeight: 22 },
    quote: {
      backgroundColor: colors.accentSoft,
      borderRadius: 12,
      padding: 14,
      gap: 5,
      marginBottom: 18,
    },
    editor: {
      color: colors.ink,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      minHeight: 170,
      fontSize: 17,
      lineHeight: 25,
      textAlignVertical: 'top',
    },
    hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginVertical: 14 },
  });
