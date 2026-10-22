import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '@/lib/api';
import type { ProjectBoard } from '@/lib/types';
import { projectReference } from '@/lib/project-reference';
import { canReadPlanning } from '@/lib/planning-model';
import { useProjectScope } from '@/lib/project-scope';
import { NativeSheet, Notice, SearchInput } from './work-controls';
import { Loading, EmptyState } from './primitives';
import { useColors } from './theme';

export function ProjectMenu({ board, onClose }: { board: ProjectBoard; onClose: () => void }) {
  const colors = useColors();
  const router = useRouter();
  const { selectProject } = useProjectScope();
  const [term, setTerm] = useState('');
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const reference = projectReference(board.project);
  const matching = (projects.data ?? []).filter((project) =>
    `${project.teamName} ${project.name} ${project.key}`
      .toLowerCase()
      .includes(term.trim().toLowerCase()),
  );
  return (
    <NativeSheet visible title={board.project.name} onClose={onClose}>
      <Text style={{ color: colors.muted, fontSize: 14, marginBottom: 16 }}>
        {board.project.teamName} · {board.project.key}
      </Text>
      {(['cycles', 'initiatives'] as const)
        .filter((kind) => canReadPlanning(board, kind))
        .map((kind) => (
          <Pressable
            key={kind}
            accessibilityRole="button"
            accessibilityLabel={`Open ${kind}`}
            style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 }}
            onPress={() => {
              onClose();
              router.push(`/planning/${encodeURIComponent(reference)}?kind=${kind}`);
            }}
          >
            <Ionicons
              name={kind === 'cycles' ? 'repeat-outline' : 'flag-outline'}
              size={22}
              color={colors.ink}
            />
            <Text style={{ flex: 1, color: colors.ink, fontSize: 17 }}>
              {kind === 'cycles' ? 'Cycles' : 'Initiatives'}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </Pressable>
        ))}
      <Text
        accessibilityRole="header"
        style={{
          color: colors.ink,
          fontSize: 18,
          fontWeight: '600',
          marginTop: 28,
          marginBottom: 16,
        }}
      >
        Switch project
      </Text>
      <SearchInput placeholder="Find project or team" value={term} onChange={setTerm} />
      {projects.isPending ? <Loading /> : null}
      {projects.isError ? (
        <Notice message="Could not refresh projects." onPress={() => void projects.refetch()} />
      ) : null}
      {!projects.isPending && !matching.length ? <EmptyState title="No matching projects" /> : null}
      {matching.map((project) => (
        <Pressable
          key={project.id}
          accessibilityRole="button"
          accessibilityLabel={`Switch to ${project.teamName}, ${project.name}`}
          accessibilityState={{ selected: projectReference(project) === reference }}
          onPress={() => {
            const next = projectReference(project);
            selectProject(next);
            onClose();
            if (next !== reference) router.replace(`/project/${encodeURIComponent(next)}`);
          }}
          style={{
            minHeight: 64,
            flexDirection: 'row',
            gap: 16,
            alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.line,
          }}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: colors.ink, fontSize: 17 }}>{project.name}</Text>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {project.teamName} · {project.key}
              {project.isHidden ? ' · Hidden' : ''}
              {project.isFavorite ? ' · Favorite' : ''}
            </Text>
          </View>
          {projectReference(project) === reference ? (
            <Ionicons name="checkmark" size={22} color={colors.ink} />
          ) : null}
        </Pressable>
      ))}
    </NativeSheet>
  );
}
