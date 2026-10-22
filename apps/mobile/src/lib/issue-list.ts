import type { Assignee, Column, Issue, Priority } from './types';
import { validDate } from './validation';

export type DueFilter = 'any' | 'overdue' | 'today' | 'week' | 'none';
export type IssueSort = 'updated' | 'due' | 'priority' | 'title';
export type IssueGrouping = 'none' | 'state' | 'priority' | 'assignee';
export interface IssueFilters {
  query: string;
  assignee: string;
  priority: Priority | 'any';
  labelId: number | null;
  typeId: number | null;
  cycleId: number | null;
  initiativeId: number | null;
  due: DueFilter;
}
export const defaultFilters: IssueFilters = {
  query: '',
  assignee: 'any',
  priority: 'any',
  labelId: null,
  typeId: null,
  cycleId: null,
  initiativeId: null,
  due: 'any',
};
export type ListIssue = Pick<
  Issue,
  'id' | 'identifier' | 'title' | 'priority' | 'dueDate' | 'columnId' | 'assigneeUserId'
> &
  Partial<Pick<Issue, 'description' | 'labelIds' | 'typeId' | 'updatedAt'>> & {
    cycleId?: number | null;
    initiativeId?: number | null;
    cycle?: Issue['cycle'];
    initiative?: Issue['initiative'];
  };

export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function matchesDue(value: string | null, filter: DueFilter, now = new Date()): boolean {
  const date = value?.slice(0, 10) ?? null;
  if (filter === 'any') return true;
  if (filter === 'none') return date === null;
  if (!date || !validDate(date)) return false;
  const today = localDay(now);
  if (filter === 'overdue') return date < today;
  if (filter === 'today') return date === today;
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return date >= today && date <= localDay(end);
}

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
export function visibleIssues<T extends ListIssue>(
  issues: readonly T[],
  filters: IssueFilters,
  sort: IssueSort,
  userId?: string,
  now = new Date(),
): T[] {
  const query = filters.query.trim().toLocaleLowerCase();
  return issues
    .filter((issue) => {
      if (
        query &&
        !`${issue.identifier} ${issue.title} ${issue.description ?? ''}`
          .toLocaleLowerCase()
          .includes(query)
      )
        return false;
      if (filters.assignee === 'mine' && (!userId || issue.assigneeUserId !== userId)) return false;
      if (filters.assignee === 'unassigned' && issue.assigneeUserId !== null) return false;
      if (
        !['any', 'mine', 'unassigned'].includes(filters.assignee) &&
        issue.assigneeUserId !== filters.assignee
      )
        return false;
      if (filters.priority !== 'any' && issue.priority !== filters.priority) return false;
      if (filters.labelId !== null && !issue.labelIds?.includes(filters.labelId)) return false;
      if (filters.typeId !== null && issue.typeId !== filters.typeId) return false;
      if (filters.cycleId !== null && (issue.cycleId ?? issue.cycle?.id) !== filters.cycleId)
        return false;
      if (
        filters.initiativeId !== null &&
        (issue.initiativeId ?? issue.initiative?.id) !== filters.initiativeId
      )
        return false;
      return matchesDue(issue.dueDate, filters.due, now);
    })
    .sort((a, b) => {
      let order = 0;
      if (sort === 'title') order = a.title.localeCompare(b.title);
      if (sort === 'priority')
        order =
          (a.priority ? priorityOrder[a.priority] : 4) -
          (b.priority ? priorityOrder[b.priority] : 4);
      if (sort === 'due') order = (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
      if (sort === 'updated') order = (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
      return order || b.id - a.id;
    });
}

export function activeFilterCount(filters: IssueFilters): number {
  return Object.entries(defaultFilters).filter(
    ([key, value]) => filters[key as keyof IssueFilters] !== value,
  ).length;
}

export function dueGroup(value: string | null, now = new Date(), stateType?: string): string {
  if (stateType === 'completed' || stateType === 'canceled') return 'Completed & canceled';
  if (!value) return 'No due date';
  if (matchesDue(value, 'overdue', now)) return 'Overdue';
  if (matchesDue(value, 'today', now)) return 'Today';
  if (matchesDue(value, 'week', now)) return 'Next 7 days';
  return 'Later';
}

export function projectIssueSections<T extends ListIssue>(
  issues: T[],
  grouping: IssueGrouping,
  columns: readonly Column[],
  assignees: readonly Pick<Assignee, 'userId' | 'name'>[],
): { key: string; title: string; data: T[] }[] {
  if (!issues.length) return [];
  if (grouping === 'none') return [{ key: 'all', title: '', data: issues }];
  const groups = new Map<string, { key: string; title: string; data: T[] }>();
  const stateNames = new Map(columns.map((column) => [column.id, column.name]));
  const memberNames = new Map(assignees.map((member) => [member.userId, member.name]));
  if (grouping === 'state') {
    columns.forEach((column) =>
      groups.set(String(column.id), { key: String(column.id), title: column.name, data: [] }),
    );
  }
  if (grouping === 'priority') {
    for (const priority of ['urgent', 'high', 'medium', 'low', 'none'])
      groups.set(priority, {
        key: priority,
        title: priority === 'none' ? 'No priority' : priority[0].toUpperCase() + priority.slice(1),
        data: [],
      });
  }
  for (const issue of issues) {
    let key = String(issue.columnId);
    let title = stateNames.get(issue.columnId) ?? 'Unknown status';
    if (grouping === 'priority') {
      key = issue.priority ?? 'none';
      title = key;
    }
    if (grouping === 'assignee') {
      key = issue.assigneeUserId ?? 'unassigned';
      title =
        memberNames.get(issue.assigneeUserId ?? '') ??
        (issue.assigneeUserId ? 'Former member' : 'Unassigned');
    }
    if (!groups.has(key)) groups.set(key, { key, title, data: [] });
    groups.get(key)!.data.push(issue);
  }
  return [...groups.values()].filter((group) => group.data.length);
}
