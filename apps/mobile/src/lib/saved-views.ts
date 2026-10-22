import type { Issue, ProjectBoard } from './types';
import { defaultProjectDisplay, type ProjectDisplay } from './project-display';
import { localDay } from './issue-list';

export interface SavedView {
  id: number;
  projectId: number;
  name: string;
  icon: string | null;
  favorite: boolean;
  position: number;
  filters: unknown;
  display: unknown;
}
type Value = string | number | boolean | null;
export interface ViewCondition {
  id: string;
  field: string;
  op: string;
  values: Value[];
}
const fields = [
  'status',
  'statusType',
  'assignee',
  'delegate',
  'priority',
  'type',
  'initiative',
  'cycle',
  'labels',
  'dueDate',
  'startDate',
  'created',
  'updated',
];
const operators = [
  'is',
  'is_not',
  'before',
  'after',
  'is_set',
  'is_not_set',
  'contains',
  'not_contains',
];
const dateFields = ['dueDate', 'startDate', 'created', 'updated'];
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export function readViewConditions(raw: unknown): ViewCondition[] {
  const input = object(raw).conditions;
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) throw new Error('This view has an unsupported filter format.');
  return input.flatMap((value, index) => {
    const condition = object(value);
    const presence = ['is_set', 'is_not_set'].includes(String(condition.op));
    if (!presence && Array.isArray(condition.values) && condition.values.length === 0) return [];
    if (
      typeof condition.field !== 'string' ||
      !(fields.includes(condition.field) || /^cf:\d+$/.test(condition.field)) ||
      !operators.includes(String(condition.op)) ||
      (!presence && !Array.isArray(condition.values))
    )
      throw new Error(
        'This view uses a filter that mobile cannot interpret. Open All issues or use the web app.',
      );
    const values = Array.isArray(condition.values) ? condition.values : [];
    if (
      values.some(
        (value) => value !== null && !['string', 'number', 'boolean'].includes(typeof value),
      )
    )
      throw new Error('This view has unsupported filter values.');
    return [
      {
        id: String(condition.id ?? index),
        field: condition.field,
        op: String(condition.op),
        values: values as Value[],
      },
    ];
  });
}

function valuesFor(issue: Issue, field: string, board: ProjectBoard): Value[] {
  if (field.startsWith('cf:')) {
    const entry = issue.fieldValues?.find((value) => value.fieldId === Number(field.slice(3)));
    return entry?.optionIds.length ? entry.optionIds : [entry?.value ?? null];
  }
  switch (field) {
    case 'status':
      return [issue.columnId];
    case 'statusType':
      return [board.columns.find((column) => column.id === issue.columnId)?.stateType ?? null];
    case 'assignee':
      return [issue.assigneeUserId];
    case 'delegate':
      return [issue.delegateUserId ?? null];
    case 'priority':
      return [issue.priority];
    case 'type':
      return [issue.typeId];
    case 'labels':
      return issue.labelIds.length ? issue.labelIds : [null];
    case 'cycle':
      return issue.cycle ? [issue.cycle.id, 'status:' + issue.cycle.status] : [null];
    case 'initiative':
      return issue.initiative ? [issue.initiative.id, 'status:' + issue.initiative.status] : [null];
    default:
      return [];
  }
}
function scalarFor(issue: Issue, field: string) {
  if (field.startsWith('cf:'))
    return (
      issue.fieldValues?.find((value) => value.fieldId === Number(field.slice(3)))?.value ?? null
    );
  switch (field) {
    case 'dueDate':
      return issue.dueDate;
    case 'startDate':
      return issue.startDate;
    case 'created':
      return issue.createdAt;
    case 'updated':
      return issue.updatedAt;
    default:
      return null;
  }
}
function matches(issue: Issue, condition: ViewCondition, board: ProjectBoard) {
  const { field, op, values } = condition;
  if (op === 'before' || op === 'after') {
    const raw = scalarFor(issue, field);
    const target = values[0];
    if (typeof raw !== 'string' || typeof target !== 'string' || !raw) return false;
    const date = raw.length <= 10 ? raw : localDay(new Date(raw));
    return op === 'before' ? date < target : date > target;
  }
  if (op === 'is_set' || op === 'is_not_set') {
    const present = dateFields.includes(field)
      ? scalarFor(issue, field) !== null
      : valuesFor(issue, field, board).some((value) => value !== null && value !== '');
    return op === 'is_set' ? present : !present;
  }
  if (op === 'contains' || op === 'not_contains') {
    const raw = field.startsWith('cf:') ? scalarFor(issue, field) : null;
    const text = typeof raw === 'string' ? raw.toLowerCase() : '';
    const needle = typeof values[0] === 'string' ? values[0].toLowerCase() : '';
    const includes = needle !== '' && text.includes(needle);
    return op === 'contains' ? includes : !includes;
  }
  const overlaps = valuesFor(issue, field, board).some((value) => values.includes(value));
  return op === 'is' ? overlaps : !overlaps;
}

export function filterSavedView(issues: Issue[], view: SavedView, board: ProjectBoard) {
  const conditions = readViewConditions(view.filters);
  if (
    conditions.some((condition) => condition.field.startsWith('cf:')) &&
    issues.some((issue) => issue.fieldValues === undefined)
  )
    throw new Error('This server does not supply custom field values for saved views.');
  return issues.filter((issue) =>
    conditions.every((condition) => matches(issue, condition, board)),
  );
}

export function savedViewDisplay(raw: unknown): { state: ProjectDisplay; warnings: string[] } {
  const data = object(raw);
  const state = defaultProjectDisplay();
  const warnings: string[] = [];
  if (['table', 'calendar', 'timeline'].includes(String(data.layout)))
    state.layout = data.layout as ProjectDisplay['layout'];
  else if (data.layout && data.layout !== 'kanban') warnings.push('Layout');
  const groups: Record<string, ProjectDisplay['grouping']> = {
    status: 'state',
    priority: 'priority',
    assignee: 'assignee',
    none: 'none',
  };
  const group = typeof data.group === 'string' ? data.group : 'status';
  if (groups[group])
    state.grouping = state.layout === 'timeline' && group === 'none' ? 'state' : groups[group];
  else warnings.push('Grouping');
  if (typeof data.showEmptyGroups === 'boolean') state.showEmptyGroups = data.showEmptyGroups;
  if (['week', 'month', 'quarter'].includes(String(data.timelineScale)))
    state.timelineScale = data.timelineScale as ProjectDisplay['timelineScale'];
  if (data.calendarDateField === 'startDate') state.calendarDate = 'startDate';
  else if (data.calendarDateField && data.calendarDateField !== 'dueDate')
    warnings.push('Custom calendar date');
  state.weekStart = data.weekStart === 1 ? 1 : 0;
  const properties = ['status', 'priority', 'assignee', 'dueDate', 'type', 'labels'];
  if (Array.isArray(data.properties)) {
    state.properties = data.properties.filter(
      (value): value is ProjectDisplay['properties'][number] =>
        typeof value === 'string' && properties.includes(value),
    );
    if (data.properties.some((value) => value !== 'id' && !properties.includes(String(value))))
      warnings.push('Additional properties');
  }
  if (data.subgroup && data.subgroup !== 'none') warnings.push('Subgroups');
  if (data.showLinks || data.showSubtasks !== false) warnings.push('Nested links/subtasks');
  if (
    (Array.isArray(data.hiddenGroups) && data.hiddenGroups.length) ||
    (Array.isArray(data.collapsedGroups) && data.collapsedGroups.length) ||
    data.pinnedGroup
  )
    warnings.push('Hidden/collapsed/pinned columns');
  return { state, warnings };
}

export function savedViewRows(issues: Issue[], display: unknown, board: ProjectBoard) {
  if (!board.project.subtasksEnabled || object(display).separateSubtasks === true) return issues;
  const shown = new Set(issues.map((issue) => issue.id));
  return issues.filter((issue) => !issue.parentId || !shown.has(issue.parentId));
}

export function sortSavedView(issues: Issue[], raw: unknown, board: ProjectBoard): Issue[] {
  const sort = object(object(raw).sort);
  const field = typeof sort.field === 'string' ? sort.field : 'manual';
  if (field === 'manual') return issues;
  const fields = [
    'title',
    'identifier',
    'status',
    'priority',
    'assignee',
    'type',
    'startDate',
    'dueDate',
    'created',
    'updated',
  ];
  if (!fields.includes(field)) throw new Error('This view uses an unsupported sort field.');
  const direction = sort.dir === 'desc' ? -1 : 1;
  const ranks: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const key = (issue: Issue): string | number | null => {
    switch (field) {
      case 'identifier':
        return Number(issue.identifier.split('-').pop()) || 0;
      case 'status': {
        const index = board.columns.findIndex((column) => column.id === issue.columnId);
        return index < 0 ? Infinity : index;
      }
      case 'priority':
        return ranks[issue.priority ?? ''] ?? 4;
      case 'assignee':
        return issue.assigneeUserId === null
          ? null
          : (board.assignees.find((person) => person.userId === issue.assigneeUserId)?.name ?? '');
      case 'type':
        return issue.typeId === null
          ? null
          : (board.issueTypes.find((type) => type.id === issue.typeId)?.name ?? '');
      case 'startDate':
        return issue.startDate;
      case 'dueDate':
        return issue.dueDate;
      case 'created':
        return issue.createdAt;
      case 'updated':
        return issue.updatedAt;
      default:
        return issue.title;
    }
  };
  return [...issues].sort((a, b) => {
    const x = key(a),
      y = key(b);
    if (x === null || x === '')
      return y === null || y === '' ? (a.position ?? 0) - (b.position ?? 0) : 1;
    if (y === null || y === '') return -1;
    const order =
      typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true, sensitivity: 'base' });
    return order * direction || (a.position ?? 0) - (b.position ?? 0);
  });
}

export function viewSnapshot(
  state: ProjectDisplay,
  userId: string,
  base: unknown = null,
  now = new Date(),
  sourceDisplay: unknown = null,
  preserveSavedOrder = true,
) {
  if (state.layout === 'list')
    throw new Error('Choose Board, Table, Calendar or Timeline before saving a web view.');
  if (state.scope === 'archive')
    throw new Error('Archived issues cannot be stored in a web saved view.');
  if (state.filters.query.trim())
    throw new Error(
      'Clear text search before saving. The web saved-view format does not store search text.',
    );
  const conditions = [...readViewConditions(base)];
  const add = (field: string, op: string, values: Value[]) =>
    conditions.push({ id: 'mobile-' + conditions.length, field, op, values });
  const filters = state.filters;
  if (typeof state.scope === 'number') add('status', 'is', [state.scope]);
  if (filters.assignee !== 'any') {
    let assignee: Value = filters.assignee;
    if (assignee === 'unassigned') assignee = null;
    if (assignee === 'mine') {
      if (!userId) throw new Error('Sign in before saving a personal filter.');
      assignee = userId;
    }
    add('assignee', 'is', [assignee]);
  }
  if (filters.priority !== 'any') add('priority', 'is', [filters.priority]);
  for (const [field, value] of [
    ['labels', filters.labelId],
    ['type', filters.typeId],
    ['cycle', filters.cycleId],
    ['initiative', filters.initiativeId],
  ] as const)
    if (value !== null) add(field, 'is', [value]);
  const day = (offset: number) => {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    return localDay(date);
  };
  if (filters.due === 'none') add('dueDate', 'is_not_set', []);
  if (filters.due === 'overdue') add('dueDate', 'before', [day(0)]);
  if (filters.due === 'today' || filters.due === 'week') {
    add('dueDate', 'after', [day(-1)]);
    add('dueDate', 'before', [day(filters.due === 'today' ? 1 : 8)]);
  }
  const sorts = {
    updated: { field: 'updated', dir: 'desc' },
    due: { field: 'dueDate', dir: 'asc' },
    priority: { field: 'priority', dir: 'asc' },
    title: { field: 'title', dir: 'asc' },
  };
  return {
    filters: { conditions },
    display: {
      layout: state.layout === 'board' ? 'kanban' : state.layout,
      sort: (preserveSavedOrder ? object(sourceDisplay).sort : null) ?? sorts[state.sort],
      group: state.grouping === 'state' ? 'status' : state.grouping,
      subgroup: 'none',
      showEmptyGroups: state.showEmptyGroups,
      properties: state.properties,
      timelineScale: state.timelineScale,
      calendarDateField: state.calendarDate,
      weekStart: state.weekStart,
      showLinks: false,
      showSubtasks: false,
      separateSubtasks: sourceDisplay == null || object(sourceDisplay).separateSubtasks === true,
      collapseSubtasks: false,
      timelineCollapseAll: false,
      hiddenGroups: [],
      collapsedGroups: [],
      pinnedGroup: null,
    },
  };
}
