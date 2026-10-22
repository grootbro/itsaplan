import { describe, expect, test } from 'bun:test';
import {
  filterSavedView,
  readViewConditions,
  savedViewDisplay,
  savedViewRows,
  sortSavedView,
  viewSnapshot,
  type SavedView,
} from '../saved-views';
import { defaultProjectDisplay } from '../project-display';
import type { Issue, ProjectBoard } from '../types';

const board = {
  project: { id: 1, subtasksEnabled: true },
  columns: [
    { id: 1, stateType: 'backlog' },
    { id: 2, stateType: 'started' },
  ],
  assignees: [{ userId: 'u', name: 'Ada' }],
  issueTypes: [{ id: 1, name: 'Task' }],
} as ProjectBoard;
const issue = (patch: Partial<Issue> = {}): Issue => ({
  id: 1,
  projectId: 1,
  sequenceNumber: 1,
  identifier: 'PLAN-1',
  title: 'Alpha',
  description: '',
  columnId: 1,
  typeId: 1,
  initiative: null,
  cycle: null,
  labelIds: [],
  assigneeUserId: 'u',
  delegateUserId: null,
  priority: 'high',
  startDate: null,
  dueDate: null,
  estimatePoints: null,
  estimateMinutes: null,
  loggedMinutes: 0,
  createdAt: '2026-10-22T23:30:00Z',
  updatedAt: '2026-10-22T23:30:00Z',
  archivedAt: null,
  fieldValues: [],
  position: 1,
  ...patch,
});
const view = (conditions: unknown[], display: unknown = {}): SavedView => ({
  id: 1,
  projectId: 1,
  name: 'Shared',
  icon: null,
  position: 1,
  favorite: false,
  filters: { conditions },
  display,
});
const cond = (field: string, op: string, values: unknown[] = []) => ({ field, op, values });

describe('Web saved-view contracts', () => {
  test('intersects conditions and ORs values with strict membership', () => {
    const rows = [issue(), issue({ id: 2, columnId: 2 }), issue({ id: 3, priority: 'low' })];
    expect(
      filterSavedView(
        rows,
        view([cond('status', 'is', [1, 2]), cond('priority', 'is', ['high'])]),
        board,
      ).map((row) => row.id),
    ).toEqual([1, 2]);
    expect(filterSavedView(rows, view([cond('status', 'is', ['1'])]), board)).toEqual([]);
  });
  test('fails closed for unknown active fields, operators and values', () => {
    for (const value of [
      cond('future', 'is', [1]),
      cond('status', 'future', [1]),
      cond('status', 'is', [{}]),
      { field: 'status', op: 'is', values: 'bad' },
    ])
      expect(() => readViewConditions({ conditions: [value] })).toThrow();
    expect(readViewConditions({ conditions: [cond('status', 'is', [])] })).toEqual([]);
  });
  test('keeps false and zero present and null/empty absent', () => {
    const rows = [false, 0, '', null].map((value, i) =>
      issue({ id: i + 1, fieldValues: [{ fieldId: 4, value, valueEnd: null, optionIds: [] }] }),
    );
    expect(
      filterSavedView(rows, view([cond('cf:4', 'is_set')]), board).map((row) => row.id),
    ).toEqual([1, 2]);
  });
  test('uses custom option IDs before scalar values and rejects missing board metadata', () => {
    const row = issue({
      fieldValues: [{ fieldId: 4, value: 'ignored', valueEnd: null, optionIds: [7] }],
    });
    expect(filterSavedView([row], view([cond('cf:4', 'is', [7])]), board)).toEqual([row]);
    expect(filterSavedView([row], view([cond('cf:4', 'is', ['ignored'])]), board)).toEqual([]);
    expect(() =>
      filterSavedView([issue({ fieldValues: undefined })], view([cond('cf:4', 'is_set')]), board),
    ).toThrow();
  });
  test('matches cycle and initiative statuses as well as IDs', () => {
    const row = issue({
      cycle: { id: 3, name: 'Current', status: 'active' },
      initiative: { id: 4, title: 'Release', status: 'planned' },
    });
    expect(
      filterSavedView(
        [row],
        view([cond('cycle', 'is', ['status:active']), cond('initiative', 'is', [4])]),
        board,
      ),
    ).toEqual([row]);
  });
  test('uses exclusive date boundaries', () => {
    const row = issue({ dueDate: '2026-10-22' });
    expect(
      filterSavedView([row], view([cond('dueDate', 'before', ['2026-10-22'])]), board),
    ).toEqual([]);
    expect(filterSavedView([row], view([cond('dueDate', 'after', ['2026-10-21'])]), board)).toEqual(
      [row],
    );
  });
  test('compares datetime filters by local calendar day', () => {
    const row = issue();
    const local = new Date(row.createdAt);
    const tomorrow = new Date(local);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const day = (d: Date) =>
      d.getFullYear() +
      '-' +
      String(d.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getDate()).padStart(2, '0');
    expect(
      filterSavedView([row], view([cond('created', 'before', [day(tomorrow)])]), board),
    ).toEqual([row]);
    expect(filterSavedView([row], view([cond('created', 'before', [day(local)])]), board)).toEqual(
      [],
    );
  });
  test('retains matching children when their parent is filtered out', () => {
    const parent = issue(),
      child = issue({ id: 2, parentId: 1 });
    expect(savedViewRows([child], {}, board)).toEqual([child]);
    expect(savedViewRows([parent, child], {}, board)).toEqual([parent]);
    expect(savedViewRows([parent, child], { separateSubtasks: true }, board)).toEqual([
      parent,
      child,
    ]);
  });
  test('keeps manual API order, null-last descending and position tie breaks', () => {
    const first = issue({ id: 1, position: 2, dueDate: '2026-10-23' });
    const second = issue({ id: 2, position: 1, dueDate: '2026-10-23' });
    const missing = issue({ id: 3, dueDate: null });
    expect(sortSavedView([first, second], {}, board)).toEqual([first, second]);
    expect(
      sortSavedView([missing, first, second], { sort: { field: 'dueDate', dir: 'desc' } }, board),
    ).toEqual([second, first, missing]);
  });
  test('maps native display without mutating web metadata or property order', () => {
    const raw = {
      layout: 'timeline',
      group: 'status',
      properties: ['labels', 'status'],
      subgroup: 'type',
      unknown: { preserve: true },
    };
    const before = JSON.stringify(raw),
      mapped = savedViewDisplay(raw);
    expect(mapped.state.layout).toBe('timeline');
    expect(mapped.state.properties).toEqual(['labels', 'status']);
    expect(mapped.warnings).toContain('Subgroups');
    expect(JSON.stringify(raw)).toBe(before);
  });
  test('snapshot retains base conditions and resolves mine to actual user', () => {
    const state = defaultProjectDisplay();
    state.filters.assignee = 'mine';
    state.scope = 2;
    const result = viewSnapshot(state, 'u', { conditions: [cond('priority', 'is_not', ['low'])] });
    expect(result.filters.conditions.map((c) => c.field)).toEqual([
      'priority',
      'status',
      'assignee',
    ]);
    expect(result.filters.conditions[2].values).toEqual(['u']);
    expect(result.display.layout).toBe('kanban');
    expect(() => viewSnapshot(state, '')).toThrow();
  });
  test('copy keeps effective subtask separation independently of saved ordering', () => {
    const state = defaultProjectDisplay();
    state.sort = 'title';
    const original = { sort: { field: 'identifier', dir: 'desc' }, separateSubtasks: false };
    const copy = viewSnapshot(state, 'u', null, undefined, original, false);
    expect(copy.display.separateSubtasks).toBe(false);
    expect(copy.display.sort).toEqual({ field: 'title', dir: 'asc' });
    expect(viewSnapshot(state, 'u', null, undefined, original).display.sort).toEqual(original.sort);
    expect(viewSnapshot(state, 'u', null, undefined, {}).display.separateSubtasks).toBe(false);
    expect(viewSnapshot(state, 'u').display.separateSubtasks).toBe(true);
    const nullableView = view([], null);
    expect(
      viewSnapshot(state, 'u', nullableView.filters, undefined, nullableView.display ?? {}, false)
        .display.separateSubtasks,
    ).toBe(false);
  });
  test('snapshots relative dates as fixed exclusive ranges', () => {
    const state = defaultProjectDisplay();
    state.filters.due = 'today';
    const snapshot = viewSnapshot(state, 'u', null, new Date(2026, 9, 22, 12));
    expect(snapshot.filters.conditions.map((c) => [c.op, c.values])).toEqual([
      ['after', ['2026-10-21']],
      ['before', ['2026-10-23']],
    ]);
    state.filters.due = 'week';
    expect(
      viewSnapshot(state, 'u', null, new Date(2026, 9, 22, 12)).filters.conditions[1].values,
    ).toEqual(['2026-10-30']);
  });
  test('does not silently omit text search, archive scope or mobile-only layouts', () => {
    const state = defaultProjectDisplay();
    state.filters.query = 'important';
    expect(() => viewSnapshot(state, 'u')).toThrow('search');
    state.filters.query = '';
    state.scope = 'archive';
    expect(() => viewSnapshot(state, 'u')).toThrow('Archived');
    state.scope = 'all';
    state.layout = 'list';
    expect(() => viewSnapshot(state, 'u')).toThrow('Choose');
  });
});
