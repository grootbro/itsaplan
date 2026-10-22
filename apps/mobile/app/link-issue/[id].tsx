import { projectReference } from '@/lib/project-reference';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '@/lib/api';
import { EmptyState, Loading } from '@/ui/primitives';
import { useColors, useThemedStyles, type Palette } from '@/ui/theme';

const relations = [
  { label: 'Related', kind: 'relates' },
  { label: 'Blocks', kind: 'blocks' },
  { label: 'Blocked by', kind: 'blocked_by' },
  { label: 'Duplicates', kind: 'duplicates' },
] as const;

export default function LinkIssue() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const issueId = Number(id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [projectKey, setProjectKey] = useState<string | null>(null);
  const [relation, setRelation] = useState<string>('relates');
  const [term, setTerm] = useState('');
  const [submitted, setSubmitted] = useState('');
  const issue = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => api.issue(issueId),
    enabled: Number.isFinite(issueId),
  });
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const ownProject = projects.data?.find((project) => project.id === issue.data?.projectId);
  const candidates =
    projects.data?.filter(
      (project) => project.teamId === ownProject?.teamId && project.permissions?.work_items?.edit,
    ) ?? [];
  const selectedKey = projectKey ?? (ownProject ? projectReference(ownProject) : undefined);
  const results = useQuery({
    queryKey: ['link-search', selectedKey, submitted],
    queryFn: () => api.search(selectedKey!, submitted),
    enabled: !!selectedKey && !!submitted,
  });
  const create = useMutation({
    mutationFn: (targetIssueId: number) => api.linkIssue(issueId, targetIssueId, relation),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['issue', issueId] });
      router.back();
    },
    onError: (error) => Alert.alert('Could not link issues', error.message),
  });

  if (issue.isLoading || projects.isLoading) return <Loading />;
  if (!issue.data || !ownProject) return <EmptyState title="Issue unavailable" />;

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>FROM {issue.data.identifier}</Text>
      <Text style={styles.label}>Relationship</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.options}
      >
        {relations.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.kind}
            onPress={() => setRelation(item.kind)}
            style={[styles.option, relation === item.kind && styles.active]}
          >
            <Text style={[styles.optionText, relation === item.kind && styles.activeText]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text style={styles.label}>Project</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scroll}
        contentContainerStyle={styles.options}
      >
        {candidates.map((project) => (
          <Pressable
            accessibilityRole="button"
            key={project.id}
            onPress={() => {
              setProjectKey(projectReference(project));
              setSubmitted('');
            }}
            style={[styles.option, selectedKey === projectReference(project) && styles.active]}
          >
            <Text
              style={[
                styles.optionText,
                selectedKey === projectReference(project) && styles.activeText,
              ]}
            >
              {project.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.search}>
        <TextInput
          accessibilityLabel="Find issue to link"
          placeholder="Search an issue"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          onSubmitEditing={() => setSubmitted(term.trim())}
          value={term}
          onChangeText={setTerm}
          style={styles.input}
        />
        <Pressable accessibilityRole="button" onPress={() => setSubmitted(term.trim())}>
          <Text style={styles.go}>Search</Text>
        </Pressable>
      </View>
      {!submitted ? (
        <EmptyState
          title="Find an issue"
          detail="Choose a project and search by title or number."
        />
      ) : results.isLoading ? (
        <Loading />
      ) : results.isError ? (
        <EmptyState title="Search unavailable" />
      ) : (
        <FlatList
          data={(results.data ?? []).filter((item) => item.id !== issueId && !item.archived)}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<EmptyState title="No matches" />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              disabled={create.isPending}
              onPress={() => create.mutate(item.id)}
              style={styles.result}
            >
              <Text style={styles.resultId}>{item.identifier}</Text>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    eyebrow: {
      color: colors.accent,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.8,
      marginHorizontal: 22,
      marginTop: 20,
      marginBottom: 26,
    },
    label: {
      color: colors.ink,
      fontSize: 13,
      fontWeight: '700',
      marginHorizontal: 22,
      marginBottom: 9,
    },
    scroll: { flexGrow: 0, marginBottom: 22 },
    options: { paddingHorizontal: 22, gap: 7 },
    option: {
      backgroundColor: colors.surface,
      borderRadius: 13,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    active: { backgroundColor: colors.ink },
    optionText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
    activeText: { color: colors.onAccent },
    search: {
      marginHorizontal: 22,
      marginBottom: 16,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: { flex: 1, height: 48, fontSize: 15, color: colors.ink },
    go: { color: colors.accent, fontSize: 13, fontWeight: '700' },
    result: {
      backgroundColor: colors.surface,
      paddingHorizontal: 22,
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    resultId: { color: colors.accent, fontSize: 12, fontWeight: '800' },
    resultTitle: { color: colors.ink, fontSize: 15, marginTop: 5, lineHeight: 20 },
  });
