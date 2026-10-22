import { describe, expect, test } from 'bun:test';
import type { Issue, ProjectBoard } from '../types';
import {
  boardColumnWidth,
  boardGroups,
  calendarIssues,
  calendarMonth,
  shiftMonth,
} from '../board-model';
import { defaultFilters, visibleIssues } from '../issue-list';

const board: ProjectBoard = {
  project: {
    id: 1,
    teamId: 1,
    teamName: 'Synthetic team',
    key: 'QA',
    name: 'Fixture',
    description: '',
  },
  columns: [
    { id: 2, name: 'Doing', stateType: 'started', color: '#222222', position: 2 },
    { id: 1, name: 'Backlog', stateType: 'backlog', color: '#777777', position: 1 },
  ],
  assignees: [{ userId: 'person-1', name: 'Member', kind: 'member', canReadWorkItems: true }],
  labels: [],
  issueTypes: [],
  customFields: [],
  permissions: { work_items: { read: true } },
};
const issue = (id: number, patch: Partial<Issue> = {}): Issue => ({
  id,
  projectId: 1,
  sequenceNumber: id,
  identifier: `QA-${id}`,
  title: `Task ${id}`,
  description: '',
  columnId: 1,
  typeId: null,
  initiative: null,
  cycle: null,
  labelIds: [],
  assigneeUserId: null,
  priority: null,
  startDate: null,
  dueDate: null,
  estimatePoints: null,
  estimateMinutes: null,
  loggedMinutes: 0,
  createdAt: '',
  updatedAt: '',
  archivedAt: null,
  ...patch,
});

describe('native board groups', () => {
  test('keeps empty columns visible in server order', () => {
    const groups = boardGroups([], 'state', board, true);
    expect(groups.map((group) => group.key)).toEqual(['1', '2']);
    expect(groups.every((group) => group.data.length === 0)).toBe(true);
    expect(boardGroups([], 'state', board, false)).toEqual([]);
  });
  test('never drops work whose status or member was removed', () => {
    const source = [issue(1), issue(2, { columnId: 99 }), issue(3, { assigneeUserId: 'former' })];
    for (const grouping of ['state', 'priority', 'assignee', 'none'] as const) {
      const groups = boardGroups(source, grouping, board, true);
      expect(
        groups
          .flatMap((group) => group.data)
          .map((row) => row.id)
          .sort(),
      ).toEqual([1, 2, 3]);
    }
    expect(boardGroups(source, 'state', board, true).at(-1)?.title).toBe('Unknown status');
  });
  test('offers empty assignee and priority columns only when requested', () => {
    expect(boardGroups([], 'assignee', board, true).map((group) => group.title)).toEqual([
      'Member',
      'Unassigned',
    ]);
    expect(boardGroups([], 'priority', board, true)).toHaveLength(5);
    expect(boardGroups([], 'none', board, true)).toHaveLength(1);
  });
  test('applies the same intersecting filters before any layout', () => {
    const source = [issue(1, { priority: 'high' }), issue(2, { columnId: 2, priority: 'low' })];
    const rows = visibleIssues(source, { ...defaultFilters, priority: 'high' }, 'priority');
    expect(
      boardGroups(rows, 'state', board, true)
        .flatMap((group) => group.data)
        .map((row) => row.id),
    ).toEqual([1]);
    expect(source).toHaveLength(2);
  });
  test('keeps phone cards readable and bounds expanded columns', () => {
    expect(boardColumnWidth(390)).toBe(340);
    expect(boardColumnWidth(320)).toBe(272);
    expect(boardColumnWidth(1400)).toBe(340);
    expect(boardColumnWidth(NaN)).toBe(300);
  });
});

describe('calendar layout', () => {
  test('builds six complete weeks with the chosen week start', () => {
    const sunday = calendarMonth('2024-02', 0),
      monday = calendarMonth('2024-02', 1);
    expect(sunday).toHaveLength(42);
    expect(new Set(sunday).size).toBe(42);
    expect(sunday[0]).toBe('2024-01-28');
    expect(monday[0]).toBe('2024-01-29');
    expect(sunday).toContain('2024-02-29');
    expect(calendarMonth('2026-03', 1)).toHaveLength(42);
  });
  test('moves across year boundaries without overflowing the current day', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2024-01', 1)).toBe('2024-02');
  });
  test('keeps unscheduled and invalid dates accessible, and switches date fields', () => {
    const rows = [
      issue(1, { dueDate: '2026-10-22', startDate: '2026-10-20' }),
      issue(2),
      issue(3, { dueDate: '2026-02-30' }),
    ];
    const due = calendarIssues(rows, 'dueDate'),
      start = calendarIssues(rows, 'startDate');
    expect(due.days.get('2026-10-22')?.map((row) => row.id)).toEqual([1]);
    expect(due.unscheduled.map((row) => row.id)).toEqual([2, 3]);
    expect(start.days.get('2026-10-20')?.map((row) => row.id)).toEqual([1]);
    expect([...due.days.values()].flat().length + due.unscheduled.length).toBe(rows.length);
  });
});
