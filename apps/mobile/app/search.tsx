import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '@/lib/api';
import type { IssueSearchHit, Project } from '@/lib/types';
import { useProjectScope } from '@/lib/project-scope';
import { EmptyState, Loading } from '@/ui/primitives';
import { IssueRow } from '@/ui/IssueRow';
import { useColors, useThemedStyles, type Palette } from '@/ui/theme';
import { Notice } from '@/ui/work-controls';

type SearchResult = IssueSearchHit & { projectKey: string };

async function searchProjects(
  projects: Project[],
  term: string,
): Promise<{ items: SearchResult[]; failed: number }> {
  const items: SearchResult[] = [];
  let failed = 0;
  for (let index = 0; index < projects.length; index += 4) {
    const batch = projects.slice(index, index + 4);
    const responses = await Promise.allSettled(
      batch.map((project) => api.search(project.key, term)),
    );
    responses.forEach((response, offset) => {
      if (response.status === 'fulfilled') {
        items.push(
          ...response.value.map((issue) => ({
            ...issue,
            projectKey: batch[offset].key,
          })),
        );
      } else {
        failed += 1;
      }
    });
  }
  if (projects.length && failed === projects.length) throw new Error('Search unavailable');
  return { items, failed };
}

export default function Search() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { projectKey, selectProject } = useProjectScope();
  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [allProjects, setAllProjects] = useState(true);
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const readable = (projects.data ?? []).filter(
    (project) => project.permissions?.work_items?.read !== false,
  );
  const key = readable.find((project) => project.key === projectKey)?.key ?? readable[0]?.key;
  const results = useQuery({
    queryKey: ['search', allProjects ? 'all' : key, submitted],
    queryFn: () =>
      searchProjects(
        allProjects ? readable : readable.filter((project) => project.key === key),
        submitted,
      ),
    enabled: !!submitted && !!projects.data && (allProjects || !!key),
  });
  const submit = () => {
    const value = term.trim();
    if (!value) return;
    if (value === submitted) void results.refetch();
    else setSubmitted(value);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel="Search issues"
          value={term}
          onChangeText={setTerm}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="Issue, title, or description"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" onPress={submit}>
          <Text style={styles.go}>Go</Text>
        </Pressable>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={styles.projects}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: allProjects }}
          onPress={() => {
            setAllProjects(true);
            setSubmitted('');
          }}
          style={[styles.project, allProjects && styles.selectedProject]}
        >
          <Text style={[styles.projectText, allProjects && styles.selectedText]}>All projects</Text>
        </Pressable>
        {readable.map((project) => (
          <Pressable
            accessibilityRole="button"
            key={project.id}
            onPress={() => {
              selectProject(project.key);
              setAllProjects(false);
              setSubmitted('');
            }}
            style={[styles.project, !allProjects && key === project.key && styles.selectedProject]}
          >
            <Text
              style={[
                styles.projectText,
                !allProjects && key === project.key && styles.selectedText,
              ]}
            >
              {project.key}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {projects.isError && !projects.data ? (
        <Notice message="Projects could not be loaded." onPress={() => void projects.refetch()} />
      ) : !submitted ? (
        <EmptyState title="Find an issue" detail="Search one project or all your projects." />
      ) : projects.isPending || results.isLoading ? (
        <Loading />
      ) : results.isError && !results.data ? (
        <Notice
          message="Search unavailable. Check your connection and retry."
          onPress={() => void results.refetch()}
        />
      ) : (
        <FlatList
          data={results.data?.items ?? []}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<EmptyState title="No matches" detail="Try another term." />}
          ListHeaderComponent={
            results.isError || projects.isError ? (
              <Notice
                message="Could not refresh search. Showing loaded results."
                onPress={() => void Promise.all([projects.refetch(), results.refetch()])}
              />
            ) : results.data?.failed ? (
              <Text style={styles.partial}>
                Some projects could not be searched. Tap Go to retry.
              </Text>
            ) : null
          }
          renderItem={({ item }) => (
            <IssueRow
              issue={item}
              state={allProjects ? item.projectKey : undefined}
              onPress={() => router.push(`/issue/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    inputWrap: {
      marginHorizontal: 22,
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
    },
    input: { flex: 1, minHeight: 49, color: colors.ink, fontSize: 15 },
    go: { color: colors.accent, fontWeight: '700', padding: 14, minHeight: 48 },
    projects: { paddingHorizontal: 22, paddingVertical: 15, gap: 7 },
    project: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 13,
      minHeight: 48,
    },
    selectedProject: { backgroundColor: colors.ink },
    projectText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
    selectedText: { color: colors.onAccent },
    partial: {
      color: colors.muted,
      fontSize: 12,
      paddingHorizontal: 22,
      paddingVertical: 10,
    },
  });
