import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { api } from '@/lib/api';
import { issueDraft, issuePatch } from '@/lib/issue-editor';
import { projectReference } from '@/lib/project-reference';
import { useSuccessHaptic } from '@/lib/preferences-context';
import { IssueEditor } from '@/ui/IssueEditor';
import { EmptyState, Loading } from '@/ui/primitives';
import { Notice } from '@/ui/work-controls';

export default function EditIssue() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const issueId = Number(id);
  const router = useRouter();
  const client = useQueryClient();
  const successHaptic = useSuccessHaptic();
  const valid = Number.isSafeInteger(issueId) && issueId > 0;
  const issue = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => api.issue(issueId),
    enabled: valid,
  });
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const project = projects.data?.find((item) => item.id === issue.data?.projectId);
  const ref = project ? projectReference(project) : undefined;
  const board = useQuery({
    queryKey: ['board', ref],
    queryFn: () => api.board(ref!),
    enabled: !!ref,
  });
  if (!valid) return <EmptyState title="Invalid issue" />;
  if (issue.isPending || projects.isPending || (!!ref && board.isPending)) return <Loading />;
  if (!issue.data || !board.data || !ref)
    return (
      <View style={{ flex: 1 }}>
        <Notice
          message="Could not load the issue editor."
          onPress={() =>
            void Promise.all([
              issue.refetch(),
              projects.refetch(),
              ...(ref ? [board.refetch()] : []),
            ])
          }
        />
      </View>
    );
  return (
    <IssueEditor
      key={issueId}
      issueId={issueId}
      initial={issueDraft(issue.data)}
      board={board.data}
      projectRef={ref}
      canSave={!!board.data.permissions.work_items?.edit && !issue.data.archivedAt}
      onSubmit={async (draft, initial) => {
        const result = await api.updateIssue(issueId, issuePatch(draft, initial));
        await Promise.all(
          ['issue', 'issues', 'assigned', 'planning', 'search', 'archived-issues', 'feed'].map(
            (key) => client.invalidateQueries({ queryKey: [key] }),
          ),
        );
        return result;
      }}
      onComplete={() => {
        successHaptic();
        router.back();
      }}
    />
  );
}
