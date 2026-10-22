import type { Issue, Priority, ProjectBoard } from './types';
import { validDate } from './validation';

export interface IssueDraft {
  title: string;
  description: string;
  columnId: number;
  typeId: number | null;
  priority: Priority;
  assigneeUserId: string | null;
  delegateUserId: string | null;
  labelIds: number[];
  startDate: string;
  dueDate: string;
  estimatePoints: string;
  estimateMinutes: string;
  cycleId: number | null;
  initiativeId: number | null;
}

export function issueDraft(issue?: Issue, board?: ProjectBoard, columnId?: number): IssueDraft {
  return {
    title: issue?.title ?? '',
    description: issue?.description ?? '',
    columnId:
      issue?.columnId ??
      board?.columns.find((column) => column.id === columnId)?.id ??
      board?.columns.find((column) => column.stateType === 'backlog')?.id ??
      board?.columns[0]?.id ??
      0,
    typeId:
      issue?.typeId ??
      (issue
        ? null
        : (board?.issueTypes.find((type) => type.isDefault)?.id ??
          board?.issueTypes[0]?.id ??
          null)),
    priority: issue?.priority ?? null,
    assigneeUserId: issue?.assigneeUserId ?? null,
    delegateUserId: issue?.delegateUserId ?? null,
    labelIds: [...(issue?.labelIds ?? [])],
    startDate: issue?.startDate ?? '',
    dueDate: issue?.dueDate ?? '',
    estimatePoints: issue?.estimatePoints?.toString() ?? '',
    estimateMinutes: issue?.estimateMinutes?.toString() ?? '',
    cycleId: issue?.cycle?.id ?? null,
    initiativeId: issue?.initiative?.id ?? null,
  };
}

export function issueValues(draft: IssueDraft) {
  return {
    ...draft,
    title: draft.title.trim(),
    labelIds: [...new Set(draft.labelIds)].sort((a, b) => a - b),
    startDate: draft.startDate || null,
    dueDate: draft.dueDate || null,
    estimatePoints: draft.estimatePoints.trim() ? Number(draft.estimatePoints) : null,
    estimateMinutes: draft.estimateMinutes.trim() ? Number(draft.estimateMinutes) : null,
  };
}

export function issuePatch(draft: IssueDraft, initial: IssueDraft) {
  const previous = issueValues(initial);
  return Object.fromEntries(
    Object.entries(issueValues(draft)).filter(
      ([key, value]) =>
        JSON.stringify(value) !== JSON.stringify(previous[key as keyof typeof previous]),
    ),
  ) as Partial<ReturnType<typeof issueValues>>;
}

export function issueValidation(draft: IssueDraft) {
  if (!draft.title.trim()) return 'Enter a title.';
  if (!Number.isSafeInteger(draft.columnId) || draft.columnId <= 0) return 'Choose a state.';
  if (draft.description.length > 50_000) return 'Descriptions can contain up to 50,000 characters.';
  if (draft.startDate && !validDate(draft.startDate)) return 'Choose a valid start date.';
  if (draft.dueDate && !validDate(draft.dueDate)) return 'Choose a valid due date.';
  if (draft.startDate && draft.dueDate && draft.startDate > draft.dueDate)
    return 'The due date must be on or after the start date.';
  if (
    draft.estimatePoints.trim() &&
    (!Number.isFinite(Number(draft.estimatePoints)) || Number(draft.estimatePoints) < 0)
  )
    return 'Points must be a number greater than or equal to zero.';
  if (
    draft.estimateMinutes.trim() &&
    (!Number.isSafeInteger(Number(draft.estimateMinutes)) || Number(draft.estimateMinutes) < 0)
  )
    return 'Time estimates must be a whole number of minutes greater than or equal to zero.';
  return null;
}
