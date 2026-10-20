import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import { movedIds } from '@/lib/collaboration';
import type { IssueDetail } from '@/lib/types';
import { Action } from './primitives';
import { NativeSheet } from './work-controls';
import { colors } from './theme';

type Editor =
  | { kind: 'list'; id?: number; value: string }
  | { kind: 'item'; id?: number; listId: number; value: string };
type Command =
  | { kind: 'save'; editor: Editor; text: string }
  | { kind: 'toggle'; id: number; done: boolean }
  | { kind: 'delete-list' | 'delete-item'; id: number }
  | { kind: 'order-lists'; ids: number[] }
  | { kind: 'order-items'; id: number; ids: number[] };
export function IssueChecklists({
  issueId,
  lists,
  canEdit,
}: {
  issueId: number;
  lists: IssueDetail['checklists'];
  canEdit: boolean;
}) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [text, setText] = useState('');
  const mutate = useMutation({
    mutationFn: async (command: Command) => {
      if (command.kind === 'toggle') await api.setChecklistItemDone(command.id, command.done);
      if (command.kind === 'delete-list') await api.deleteChecklist(command.id);
      if (command.kind === 'delete-item') await api.deleteChecklistItem(command.id);
      if (command.kind === 'order-lists') await api.reorderChecklists(issueId, command.ids);
      if (command.kind === 'order-items') await api.reorderChecklistItems(command.id, command.ids);
      if (command.kind === 'save') {
        const target = command.editor;
        if (target.kind === 'list') {
          if (target.id !== undefined) await api.renameChecklist(target.id, command.text);
          else await api.addChecklist(issueId, command.text);
        } else if (target.id !== undefined) await api.editChecklistItem(target.id, command.text);
        else await api.addChecklistItem(target.listId, command.text);
      }
    },
    onSuccess: async (_, command) => {
      if (
        command.kind === 'save' ||
        command.kind === 'delete-list' ||
        command.kind === 'delete-item'
      ) {
        setEditor(null);
        setText('');
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ['issue', issueId] }),
        client.invalidateQueries({ queryKey: ['feed', issueId] }),
      ]);
    },
    onError: (error) => Alert.alert('Could not update checklist', error.message),
  });
  const run = (command: Command) => {
    if (canEdit && !mutate.isPending) mutate.mutate(command);
  };
  const open = (target: Editor) => {
    setEditor(target);
    setText(target.value);
  };
  const close = () => {
    if (mutate.isPending) return;
    if (editor && text !== editor.value)
      Alert.alert('Discard changes?', 'Your unsaved text will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => setEditor(null) },
      ]);
    else setEditor(null);
  };
  const list =
    editor?.kind === 'item' ? lists.find((entry) => entry.id === editor.listId) : undefined;
  const siblings = editor?.kind === 'list' ? lists : (list?.items ?? []);
  const position = siblings.findIndex((entry) => entry.id === editor?.id);
  const move = (direction: -1 | 1) => {
    if (!editor?.id) return;
    const ids = movedIds(siblings, editor.id, direction);
    if (!ids) return;
    run(
      editor.kind === 'list'
        ? { kind: 'order-lists', ids }
        : { kind: 'order-items', id: editor.listId, ids },
    );
  };
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Checklists
        </Text>
        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => open({ kind: 'list', value: '' })}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Add checklist</Text>
          </Pressable>
        ) : null}
      </View>
      {!lists.length ? <Text style={styles.muted}>Break the work into a checklist.</Text> : null}
      {lists.map((checklist) => (
        <View key={checklist.id} style={styles.checklist}>
          <View style={styles.heading}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listTitle}>{checklist.title}</Text>
              <Text style={styles.meta}>
                {checklist.items.filter((item) => item.done).length} of {checklist.items.length}{' '}
                complete
              </Text>
            </View>
            {canEdit ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${checklist.title}`}
                disabled={mutate.isPending}
                style={styles.button}
                onPress={() => open({ kind: 'list', id: checklist.id, value: checklist.title })}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
          {checklist.items.map((item) => (
            <View key={item.id} style={styles.row}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={item.content}
                accessibilityState={{ checked: item.done, disabled: !canEdit || mutate.isPending }}
                disabled={!canEdit || mutate.isPending}
                onPress={() => run({ kind: 'toggle', id: item.id, done: !item.done })}
                style={styles.check}
              >
                <Ionicons
                  name={item.done ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={colors.ink}
                />
                <Text style={[styles.content, item.done && styles.completed]}>{item.content}</Text>
              </Pressable>
              {canEdit ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${item.content}`}
                  disabled={mutate.isPending}
                  style={styles.button}
                  onPress={() =>
                    open({ kind: 'item', id: item.id, listId: checklist.id, value: item.content })
                  }
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          ))}
          {canEdit ? (
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              disabled={mutate.isPending}
              onPress={() => open({ kind: 'item', listId: checklist.id, value: '' })}
            >
              <Text style={styles.buttonText}>Add item</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {editor ? (
        <NativeSheet
          visible
          title={
            editor.id ? 'Edit checklist' : editor.kind === 'list' ? 'New checklist' : 'New item'
          }
          onClose={close}
        >
          <Text style={styles.label}>
            {editor.kind === 'list' ? 'Checklist title' : 'Item text'}
          </Text>
          <TextInput
            accessibilityLabel={editor.kind === 'list' ? 'Checklist title' : 'Item text'}
            value={text}
            onChangeText={setText}
            editable={!mutate.isPending}
            multiline
            maxLength={editor.kind === 'list' ? 200 : 500}
            style={styles.input}
          />
          <Action
            label={mutate.isPending ? 'Saving…' : 'Save'}
            disabled={
              mutate.isPending ||
              !text.trim() ||
              !canEdit ||
              (!!editor.id && text.trim() === editor.value)
            }
            onPress={() => run({ kind: 'save', editor, text: text.trim() })}
          />
          {editor.id ? (
            <>
              <View style={styles.actions}>
                <Action
                  muted
                  label="Move up"
                  disabled={mutate.isPending || position <= 0}
                  onPress={() => move(-1)}
                />
                <Action
                  muted
                  label="Move down"
                  disabled={mutate.isPending || position < 0 || position >= siblings.length - 1}
                  onPress={() => move(1)}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={mutate.isPending || !canEdit}
                style={styles.button}
                onPress={() =>
                  Alert.alert(
                    editor.kind === 'list'
                      ? 'Delete checklist and every item?'
                      : 'Delete this item?',
                    'This permanently removes the selected content.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () =>
                          run({
                            kind: editor.kind === 'list' ? 'delete-list' : 'delete-item',
                            id: editor.id!,
                          }),
                      },
                    ],
                  )
                }
              >
                <Text style={styles.danger}>
                  Delete {editor.kind === 'list' ? 'checklist' : 'item'}
                </Text>
              </Pressable>
            </>
          ) : null}
        </NativeSheet>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  section: {
    marginTop: 32,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  heading: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { color: colors.ink, fontSize: 18, fontWeight: '600' },
  checklist: { marginTop: 18 },
  listTitle: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 5 },
  muted: { color: colors.muted, fontSize: 15, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  check: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  content: { flex: 1, color: colors.ink, fontSize: 16, lineHeight: 24 },
  completed: { color: colors.muted, textDecorationLine: 'line-through' },
  button: { minWidth: 48, minHeight: 48, paddingHorizontal: 10, justifyContent: 'center' },
  buttonText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  danger: { color: colors.danger, fontSize: 15 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  input: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 25,
    minHeight: 100,
    borderRadius: 12,
    padding: 16,
    backgroundColor: colors.surface,
    marginBottom: 20,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginVertical: 20 },
});
