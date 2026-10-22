import { findProject, projectReference } from '@/lib/project-reference';
import { SearchButton } from '@/ui/SearchButton';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import type { Project } from '@/lib/types';
import { useProjectScope } from '@/lib/project-scope';
import { Action, EmptyState, Loading, ScreenTitle } from '@/ui/primitives';
import { Choices, NativeSheet, Notice, SearchInput, useWorkStyles } from '@/ui/work-controls';
import { useColors, useThemedStyles, type Palette } from '@/ui/theme';

export default function Projects() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const workStyles = useWorkStyles();
  const router = useRouter();
  const client = useQueryClient();
  const { selectProject } = useProjectScope();
  const [term, setTerm] = useState('');
  const [scope, setScope] = useState<'all' | 'favorites' | 'hidden'>('all');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const query = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const selected = findProject(query.data, actionKey);
  const update = useMutation({
    mutationFn: ({
      key,
      patch,
    }: {
      key: string;
      patch: { isFavorite?: boolean; isHidden?: boolean };
    }) => api.projectPreferences(key, patch),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['projects'] });
      setActionKey(null);
    },
    onError: (error) => Alert.alert('Could not update project', error.message),
  });
  const teams = [
    ...new Map((query.data ?? []).map((project) => [project.teamId, project.teamName])).entries(),
  ];
  const projects = [...(query.data ?? [])]
    .filter((project) => {
      if (scope === 'hidden' ? !project.isHidden : project.isHidden) return false;
      if (scope === 'favorites' && !project.isFavorite) return false;
      if (teamId !== null && project.teamId !== teamId) return false;
      return `${project.name} ${project.key} ${project.teamName}`
        .toLocaleLowerCase()
        .includes(term.trim().toLocaleLowerCase());
    })
    .sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite) || a.name.localeCompare(b.name));
  const sections = teams
    .map(([id, name]) => ({
      key: String(id),
      title: name,
      data: projects.filter((project) => project.teamId === id),
    }))
    .filter((section) => section.data.length);
  const header = (
    <>
      <ScreenTitle
        action={<SearchButton />}
        title="Projects"
        eyebrow={
          query.data
            ? `${query.data.filter((project) => !project.isHidden).length} in your workspace`
            : undefined
        }
      />
      <View style={workStyles.toolbar}>
        <SearchInput value={term} onChange={setTerm} placeholder="Find a project or team" />
        <Choices
          label="Show"
          value={scope}
          options={[
            { value: 'all', label: 'Projects' },
            { value: 'favorites', label: 'Favorites' },
            { value: 'hidden', label: 'Hidden' },
          ]}
          onChange={setScope}
        />
        {teams.length > 1 ? (
          <Choices<number | null>
            label="Team"
            value={teamId}
            options={[
              { value: null, label: 'All teams' },
              ...teams.map(([id, name]) => ({ value: id, label: name })),
            ]}
            onChange={setTeamId}
          />
        ) : null}
      </View>
    </>
  );
  return (
    <View style={[styles.screen, { width: '100%', maxWidth: 1000, alignSelf: 'center' }]}>
      {query.isPending ? (
        <>
          {header}
          <Loading />
        </>
      ) : query.isError && !query.data ? (
        <View style={{ flex: 1 }}>
          {header}
          <EmptyState
            title="Projects unavailable"
            detail="Check your connection, then try again."
          />
          <Action label="Retry" onPress={() => void query.refetch()} />
        </View>
      ) : (
        <SectionList<Project>
          sections={sections}
          keyExtractor={(project) => String(project.id)}
          stickySectionHeadersEnabled={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              tintColor={colors.accent}
            />
          }
          ListHeaderComponent={
            <>
              {header}
              {query.isError ? (
                <Notice
                  message="Could not refresh projects."
                  onPress={() => void query.refetch()}
                />
              ) : null}
            </>
          }
          ListEmptyComponent={
            <EmptyState
              title={term ? 'No matching projects' : 'No projects here'}
              detail={
                scope === 'favorites'
                  ? 'Use a project’s actions to add it to Favorites.'
                  : 'Try another view or search term.'
              }
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={workStyles.section}>
              <Text accessibilityRole="header" style={workStyles.sectionTitle}>
                {section.title}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.project}>
              <Pressable
                style={styles.open}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.name}`}
                onPress={() => {
                  selectProject(projectReference(item));
                  router.push(`/project/${projectReference(item)}`);
                }}
              >
                <View style={styles.monogram}>
                  <Text style={styles.monogramText}>{item.key.slice(0, 2)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.key}
                    {item.isFavorite ? ' · Favorite' : ''}
                    {item.isHidden ? ' · Hidden' : ''}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Actions for ${item.name}`}
                onPress={() => setActionKey(projectReference(item))}
                style={styles.actions}
              >
                <Ionicons name="ellipsis-horizontal" size={21} color={colors.muted} />
              </Pressable>
            </View>
          )}
        />
      )}
      {selected ? (
        <NativeSheet visible title={selected.name} onClose={() => setActionKey(null)}>
          <Text style={styles.explanation}>These preferences only change your workspace.</Text>
          <Action
            label={selected.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            disabled={update.isPending}
            onPress={() =>
              update.mutate({
                key: projectReference(selected),
                patch: { isFavorite: !selected.isFavorite },
              })
            }
          />
          <View style={{ height: 16 }} />
          <Action
            muted
            label={selected.isHidden ? 'Show project' : 'Hide project'}
            disabled={update.isPending}
            onPress={() =>
              update.mutate({
                key: projectReference(selected),
                patch: { isHidden: !selected.isHidden },
              })
            }
          />
          <Text style={styles.explanation}>
            Hidden projects stay accessible here in the Hidden view.
          </Text>
        </NativeSheet>
      ) : null}
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    project: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    open: {
      minHeight: 86,
      flex: 1,
      paddingHorizontal: 22,
      paddingVertical: 15,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 15,
    },
    actions: {
      minWidth: 48,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    monogram: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monogramText: { color: colors.ink, fontSize: 13, fontWeight: '700' },
    name: { color: colors.ink, fontSize: 17, fontWeight: '600' },
    meta: { color: colors.muted, fontSize: 13, marginTop: 5 },
    explanation: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 23,
      marginBottom: 20,
      marginTop: 12,
    },
  });
