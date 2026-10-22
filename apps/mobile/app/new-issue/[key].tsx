import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { authClient } from '@/lib/auth';
import { api } from '@/lib/api';
import { issueDraft, issueValues } from '@/lib/issue-editor';
import { useSuccessHaptic } from '@/lib/preferences-context';
import { IssueEditor } from '@/ui/IssueEditor';
import { EmptyState, Loading } from '@/ui/primitives';
import { Notice } from '@/ui/work-controls';

export default function NewIssue() {
  const { key, parentId, columnId } = useLocalSearchParams<{
    key: string;
    parentId?: string;
    columnId?: string;
  }>();
  const parent = parentId ? Number(parentId) : null;
  const { data: session } = authClient.useSession();
  const router = useRouter();
  const client = useQueryClient();
  const successHaptic = useSuccessHaptic();
  const board = useQuery({
    queryKey: ['board', key],
    queryFn: () => api.board(key),
    enabled: !!key,
  });
  if (parentId && (!Number.isSafeInteger(parent) || Number(parent) <= 0))
    return <EmptyState title="Invalid parent issue" />;
  if (board.isPending) return <Loading />;
  if (!board.data)
    return (
      <View style={{ flex: 1 }}>
        <Notice message="Could not load the project." onPress={() => void board.refetch()} />
      </View>
    );
  const context = board.data;
  const initial = issueDraft(undefined, context, Number(columnId));
  if (
    context.assignees.some(
      (member) => member.kind === 'member' && member.userId === session?.user.id,
    )
  )
    initial.assigneeUserId = session!.user.id;
  return (
    <IssueEditor
      key={`${key}:${parentId ?? ''}`}
      creatingSubtask={!!parent}
      initial={initial}
      board={context}
      projectRef={key}
      canSave={!!context.permissions.work_items?.create}
      onSubmit={async (draft) => {
        const { estimatePoints, estimateMinutes, cycleId, initiativeId, ...values } =
          issueValues(draft);
        const result = await api.createIssue(key, {
          ...values,
          ...(parent ? { parentId: parent } : {}),
          ...(context.project.pointsEstimateEnabled ? { estimatePoints } : {}),
          ...(context.project.timeEstimateEnabled ? { estimateMinutes } : {}),
          ...(context.project.cyclesEnabled && cycleId ? { cycleId } : {}),
          ...(context.project.initiativesEnabled && initiativeId ? { initiativeId } : {}),
        });
        await Promise.all(
          ['issues', 'assigned', 'planning', 'search', 'issue'].map((key) =>
            client.invalidateQueries({ queryKey: [key] }),
          ),
        );
        return result;
      }}
      onComplete={(result) => {
        successHaptic();
        router.replace(`/issue/${result.id}`);
      }}
    />
  );
}
