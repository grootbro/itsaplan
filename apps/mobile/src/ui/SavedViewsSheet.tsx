import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { savedViewDisplay, viewSnapshot, type SavedView } from '@/lib/saved-views';
import type { ProjectDisplay } from '@/lib/project-display';
import type { ProjectBoard } from '@/lib/types';
import { Action, EmptyState, Field, Loading } from './primitives';
import { NativeSheet, Notice, SearchInput } from './work-controls';
import { useColors, useThemedStyles, type Palette } from './theme';

export function SavedViewsSheet({
  projectKey,
  userId,
  board,
  state,
  active,
  savedOrder,
  onSelect,
  onClose,
}: {
  projectKey: string;
  userId: string;
  board: ProjectBoard;
  state: ProjectDisplay;
  active?: SavedView;
  savedOrder?: boolean;
  onSelect: (id: number | null) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const client = useQueryClient();
  const permissions = board.permissions.views;
  const allowed = permissions?.read === true;
  const query = useQuery({
    queryKey: ['saved-views', userId, projectKey],
    queryFn: () => api.views(projectKey),
    enabled: allowed,
  });
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<SavedView | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SavedView | null>(null);
  const [name, setName] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: () => Promise<unknown>) => {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      await action();
      await query.refetch({ throwOnError: true });
      await client.invalidateQueries({ queryKey: ['saved-views', userId, projectKey] });
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Could not save. Check your connection and retry.',
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  };
  const close = () => {
    if (!lock.current) onClose();
  };
  const start = (view: SavedView | 'new') => {
    setEditor(view);
    setName(view === 'new' ? '' : view.name);
    setDeleting(null);
    setError(null);
  };
  const rows = [...(query.data ?? [])]
    .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.position - b.position)
    .filter((view) => view.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const save = () =>
    void run(async () => {
      if (editor === 'new') {
        const snapshot = viewSnapshot(
          state,
          userId,
          active?.filters,
          undefined,
          active ? (active.display ?? {}) : null,
          savedOrder,
        );
        try {
          const created = await api.createView(projectKey, { name: name.trim(), ...snapshot });
          setEditor(null);
          onSelect(created.id);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status >= 500) {
            setEditor(null);
            throw new Error(
              'The save outcome is unknown. Reload saved views before creating another copy.',
            );
          }
          throw error;
        }
      } else if (editor) {
        await api.renameView(editor.id, name.trim());
        setEditor(null);
      }
    });
  return (
    <NativeSheet title="Saved views" visible onClose={close}>
      <Text style={styles.detail}>Shared with this project. Stars are personal.</Text>
      {active ? (
        <Text style={styles.detail}>
          {savedViewDisplay(active.display).warnings.length
            ? 'Web display options not rendered here: ' +
              savedViewDisplay(active.display).warnings.join(', ') +
              '. '
            : ''}
          Filters and ordering come from the saved view. Local changes do not modify the shared
          original.
        </Text>
      ) : null}
      {error ? <Notice message={error} /> : null}
      {!allowed ? (
        <EmptyState
          title="Saved views unavailable"
          detail="Your role does not allow reading saved views."
        />
      ) : editor ? (
        <View style={styles.form}>
          <Text accessibilityRole="header" style={styles.title}>
            {editor === 'new' ? 'Save current view' : 'Rename view'}
          </Text>
          {editor === 'new' ? (
            <Text style={styles.detail}>
              Saves the current filters and display for everyone with access. Today and next-week
              filters become fixed dates. Existing web filters are retained when saving a copy.
            </Text>
          ) : null}
          <Field label="View name" value={name} onChangeText={setName} editable={!pending} />
          <Action
            label={pending ? 'Saving…' : 'Save view'}
            disabled={pending || !name.trim()}
            onPress={save}
          />
          <Action label="Cancel" muted disabled={pending} onPress={() => setEditor(null)} />
        </View>
      ) : deleting ? (
        <View style={styles.form}>
          <Text accessibilityRole="header" style={styles.title}>
            Delete {deleting.name}?
          </Text>
          <Text style={styles.detail}>
            This removes the shared view for everyone. Issues are kept.
          </Text>
          <Action
            label={pending ? 'Deleting…' : 'Delete shared view'}
            disabled={pending}
            onPress={() =>
              void run(async () => {
                await api.deleteView(deleting.id);
                if (active?.id === deleting.id) onSelect(null);
                setDeleting(null);
              })
            }
          />
          <Action label="Keep view" muted disabled={pending} onPress={() => setDeleting(null)} />
        </View>
      ) : (
        <>
          <Action
            label="All project issues"
            muted
            disabled={pending}
            onPress={() => onSelect(null)}
          />
          <SearchInput placeholder="Search saved views" value={search} onChange={setSearch} />
          {query.isPending ? (
            <Loading />
          ) : query.isError ? (
            <Notice message="Could not load saved views." onPress={() => void query.refetch()} />
          ) : rows.length ? (
            rows.map((view) => (
              <View key={view.id} style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={'Open saved view ' + view.name}
                  accessibilityState={{ selected: active?.id === view.id, disabled: pending }}
                  disabled={pending}
                  onPress={() => onSelect(view.id)}
                  style={styles.open}
                >
                  <Text style={styles.title}>{view.name}</Text>
                  {active?.id === view.id ? <Text style={styles.detail}>Current view</Text> : null}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={(view.favorite ? 'Unstar ' : 'Star ') + view.name}
                  accessibilityState={{ selected: view.favorite, disabled: pending }}
                  disabled={pending}
                  onPress={() => void run(() => api.favoriteView(view.id, !view.favorite))}
                  style={styles.icon}
                >
                  <Ionicons
                    name={view.favorite ? 'star' : 'star-outline'}
                    size={21}
                    color={colors.ink}
                  />
                </Pressable>
                {permissions?.edit ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={'Rename ' + view.name}
                    disabled={pending}
                    style={styles.icon}
                    onPress={() => start(view)}
                  >
                    <Ionicons name="pencil-outline" size={20} color={colors.muted} />
                  </Pressable>
                ) : null}
                {permissions?.delete ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={'Delete ' + view.name}
                    disabled={pending}
                    style={styles.icon}
                    onPress={() => {
                      setDeleting(view);
                      setError(null);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
            ))
          ) : (
            <EmptyState
              title={search ? 'No matching views' : 'No saved views yet'}
              detail={
                search ? 'Try another name.' : 'Save a project display to reuse it with your team.'
              }
            />
          )}
          {permissions?.create ? (
            <Action
              label="Save current view as…"
              muted
              disabled={pending}
              onPress={() => start('new')}
            />
          ) : null}
        </>
      )}
    </NativeSheet>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    open: {
      flex: 1,
      minWidth: 100,
      minHeight: 64,
      justifyContent: 'center',
      paddingVertical: 12,
      gap: 4,
    },
    icon: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    title: { color: colors.ink, fontSize: 17, fontWeight: '600', lineHeight: 24 },
    detail: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 12 },
    form: { gap: 14, paddingVertical: 16 },
  });
