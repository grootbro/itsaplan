import type { TimelineScale } from './timeline';
import {
  defaultFilters,
  type IssueFilters,
  type IssueGrouping,
  type IssueSort,
} from './issue-list';

export type ProjectLayout = 'board' | 'list' | 'table' | 'calendar' | 'timeline';
export type IssueProperty = 'status' | 'priority' | 'assignee' | 'dueDate' | 'type' | 'labels';
export type ProjectScope = 'all' | 'archive' | number;
export interface ProjectDisplay {
  layout: ProjectLayout;
  scope: ProjectScope;
  filters: IssueFilters;
  sort: IssueSort;
  grouping: IssueGrouping;
  showEmptyGroups: boolean;
  properties: IssueProperty[];
  calendarDate: 'dueDate' | 'startDate';
  weekStart: 0 | 1;
  timelineScale: TimelineScale;
}

export function defaultProjectDisplay(): ProjectDisplay {
  return {
    layout: 'board',
    scope: 'all',
    filters: { ...defaultFilters },
    sort: 'updated',
    grouping: 'state',
    showEmptyGroups: true,
    properties: ['status', 'priority', 'assignee', 'dueDate'],
    calendarDate: 'dueDate',
    weekStart: 0,
    timelineScale: 'week',
  };
}

export const issueProperties: { value: IssueProperty; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'type', label: 'Type' },
  { value: 'labels', label: 'Labels' },
];

export function parseProjectDisplay(raw: string | null): ProjectDisplay {
  const defaults = defaultProjectDisplay();
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
    const data = value as Record<string, unknown>;
    const filters =
      data.filters && typeof data.filters === 'object' && !Array.isArray(data.filters)
        ? (data.filters as Record<string, unknown>)
        : {};
    const id = (value: unknown) =>
      typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
    const choice = (value: unknown, choices: readonly string[]) =>
      typeof value === 'string' && choices.includes(value);
    return {
      layout: choice(data.layout, ['board', 'list', 'table', 'calendar', 'timeline'])
        ? (data.layout as ProjectLayout)
        : defaults.layout,
      scope: data.scope === 'archive' ? 'archive' : (id(data.scope) ?? 'all'),
      filters: {
        query: typeof filters.query === 'string' ? filters.query : '',
        assignee: typeof filters.assignee === 'string' ? filters.assignee : 'any',
        priority:
          filters.priority === null ||
          choice(filters.priority, ['urgent', 'high', 'medium', 'low', 'any'])
            ? (filters.priority as IssueFilters['priority'])
            : 'any',
        due: choice(filters.due, ['any', 'overdue', 'today', 'week', 'none'])
          ? (filters.due as IssueFilters['due'])
          : 'any',
        labelId: id(filters.labelId),
        typeId: id(filters.typeId),
        cycleId: id(filters.cycleId),
        initiativeId: id(filters.initiativeId),
      },
      sort: choice(data.sort, ['updated', 'due', 'priority', 'title'])
        ? (data.sort as IssueSort)
        : defaults.sort,
      grouping: choice(data.grouping, ['none', 'state', 'priority', 'assignee'])
        ? (data.grouping as IssueGrouping)
        : defaults.grouping,
      showEmptyGroups: typeof data.showEmptyGroups === 'boolean' ? data.showEmptyGroups : true,
      properties: Array.isArray(data.properties)
        ? issueProperties
            .map((item) => item.value)
            .filter((property) => (data.properties as unknown[]).includes(property))
        : defaults.properties,
      calendarDate: data.calendarDate === 'startDate' ? 'startDate' : 'dueDate',
      weekStart: data.weekStart === 1 ? 1 : 0,
      timelineScale: choice(data.timelineScale, ['week', 'month', 'quarter'])
        ? (data.timelineScale as TimelineScale)
        : 'week',
    };
  } catch {
    return defaults;
  }
}

export function projectDisplayKey(userId: string, projectKey: string): string {
  const encode = (value: string) =>
    Array.from(value, (character) => character.codePointAt(0)!.toString(16)).join('_');
  return `project-display.${encode(userId)}.${encode(projectKey)}`;
}
