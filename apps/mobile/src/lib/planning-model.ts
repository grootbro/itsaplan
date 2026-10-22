import type { ProjectBoard, Priority } from './types';
import { validDate } from './validation';

export type PlanningKind = 'cycles' | 'initiatives';
export interface PlanningEntry {
  id: number;
  projectId: number;
  title: string;
  description: string;
  status: string;
  startDate: string | null;
  targetDate: string | null;
  priority: Priority;
  ownerUserId: string | null;
  labelIds: number[];
  progress: { completed: number; canceled: number; total: number };
}
export interface PlanningPage {
  items: PlanningEntry[];
  total: number;
  page: number;
  pageSize: number;
}
export type PlanningDraft = Pick<
  PlanningEntry,
  'title' | 'description' | 'startDate' | 'targetDate' | 'status' | 'priority' | 'ownerUserId'
>;
export const initiativeStatuses = [
  'proposed',
  'planned',
  'active',
  'completed',
  'canceled',
] as const;

export function canReadPlanning(board: ProjectBoard | undefined, kind: PlanningKind) {
  const enabled =
    kind === 'cycles' ? board?.project.cyclesEnabled : board?.project.initiativesEnabled;
  return !!enabled && !!board?.permissions[kind]?.read;
}
export function nextPlanningPage(page: PlanningPage) {
  return page.items.length && page.page * page.pageSize < page.total ? page.page + 1 : undefined;
}
export function planningDraft(entry?: PlanningEntry): PlanningDraft {
  return {
    title: entry?.title ?? '',
    description: entry?.description ?? '',
    startDate: entry?.startDate ?? null,
    targetDate: entry?.targetDate ?? null,
    status: entry?.status ?? 'proposed',
    priority: entry?.priority ?? null,
    ownerUserId: entry?.ownerUserId ?? null,
  };
}
export function planningValidation(kind: PlanningKind, draft: PlanningDraft) {
  if (!draft.title.trim()) return 'Enter a name.';
  if (kind === 'cycles' && (!draft.startDate || !draft.targetDate))
    return 'Choose a start date and end date.';
  if ([draft.startDate, draft.targetDate].some((date) => date !== null && !validDate(date)))
    return 'Choose valid calendar dates.';
  return null;
}
export function planningPayload(
  kind: PlanningKind,
  draft: PlanningDraft,
  initial?: PlanningDraft,
): Record<string, unknown> {
  const fields =
    kind === 'cycles'
      ? {
          name: draft.title.trim(),
          goal: draft.description,
          startDate: draft.startDate,
          endDate: draft.targetDate,
        }
      : {
          title: draft.title.trim(),
          description: draft.description,
          status: draft.status,
          startDate: draft.startDate,
          targetDate: draft.targetDate,
          priority: draft.priority,
          ownerUserId: draft.ownerUserId,
        };
  if (!initial) return fields;
  const previous = planningPayload(kind, initial);
  return Object.fromEntries(
    Object.entries(fields).filter(([key, value]) => value !== previous[key]),
  );
}
