import { describe, expect, it } from 'bun:test';
import {
  activeFilterCount,
  defaultFilters,
  dueGroup,
  projectIssueSections,
  matchesDue,
  visibleIssues,
  type ListIssue,
} from '../issue-list';

const now = new Date(2026, 9, 20, 23, 30);
const issues: ListIssue[] = [
  {
    id: 1,
    identifier: 'ONE-1',
    title: 'Offline login',
    description: 'Expired session recovery',
    columnId: 1,
    assigneeUserId: 'me',
    priority: 'urgent',
    dueDate: '2026-10-19',
    labelIds: [4, 5],
    typeId: 2,
    cycle: { id: 8, name: 'October', status: 'active' },
    initiative: null,
    updatedAt: '2026-10-18T12:00:00Z',
  },
  {
    id: 2,
    identifier: 'ONE-2',
    title: 'Improve navigation',
    columnId: 2,
    assigneeUserId: null,
    priority: 'low',
    dueDate: '2026-10-20',
    labelIds: [5],
    typeId: 3,
    cycleId: 9,
    initiativeId: 11,
    updatedAt: '2026-10-20T12:00:00Z',
  },
  {
    id: 3,
    identifier: 'TWO-1',
    title: 'Attachment retry',
    columnId: 3,
    assigneeUserId: 'other',
    priority: null,
    dueDate: null,
    labelIds: [],
    typeId: null,
    cycleId: null,
    initiativeId: null,
    updatedAt: '2026-10-19T12:00:00Z',
  },
];
const ids = (items: ListIssue[]) => items.map((item) => item.id);

describe('Mobile work-item views', () => {
  it('finds titles, identifiers and descriptions without case or whitespace surprises', () => {
    expect(
      ids(visibleIssues(issues, { ...defaultFilters, query: '  SESSION  ' }, 'updated')),
    ).toEqual([1]);
    expect(ids(visibleIssues(issues, { ...defaultFilters, query: 'two-1' }, 'updated'))).toEqual([
      3,
    ]);
  });
  it('intersects independent filters instead of broadening them', () => {
    const filters = { ...defaultFilters, assignee: 'mine', labelId: 5, typeId: 2, cycleId: 8 };
    expect(ids(visibleIssues(issues, filters, 'due', 'me', now))).toEqual([1]);
    expect(visibleIssues(issues, { ...filters, initiativeId: 11 }, 'due', 'me', now)).toEqual([]);
  });
  it('never treats a missing user as an unassigned or mine match', () => {
    expect(visibleIssues(issues, { ...defaultFilters, assignee: 'mine' }, 'due')).toEqual([]);
    expect(
      ids(visibleIssues(issues, { ...defaultFilters, assignee: 'unassigned' }, 'due')),
    ).toEqual([2]);
    expect(ids(visibleIssues(issues, { ...defaultFilters, assignee: 'other' }, 'due'))).toEqual([
      3,
    ]);
  });
  it('distinguishes no-priority from any-priority', () => {
    expect(ids(visibleIssues(issues, { ...defaultFilters, priority: null }, 'priority'))).toEqual([
      3,
    ]);
    expect(ids(visibleIssues(issues, defaultFilters, 'priority'))).toEqual([1, 2, 3]);
  });
  it('sorts updated timestamps and leaves undated work last', () => {
    expect(ids(visibleIssues(issues, defaultFilters, 'updated'))).toEqual([2, 3, 1]);
    expect(ids(visibleIssues(issues, defaultFilters, 'due'))).toEqual([1, 2, 3]);
    expect(ids(visibleIssues(issues, defaultFilters, 'title'))).toEqual([3, 2, 1]);
  });
  it('does not reorder or mutate the source cache', () => {
    const before = JSON.stringify(issues);
    visibleIssues(issues, defaultFilters, 'updated');
    expect(JSON.stringify(issues)).toBe(before);
  });
  it('counts cleared and active filters, including an explicit null priority', () => {
    expect(activeFilterCount(defaultFilters)).toBe(0);
    expect(
      activeFilterCount({ ...defaultFilters, priority: null, assignee: 'mine', due: 'today' }),
    ).toBe(3);
  });
});

describe('Local calendar due dates', () => {
  it('does not label completed or canceled work overdue', () => {
    expect(dueGroup('2026-10-19', now, 'completed')).toBe('Completed & canceled');
    expect(dueGroup(null, now, 'canceled')).toBe('Completed & canceled');
    expect(dueGroup('2026-10-19', now, 'started')).toBe('Overdue');
  });
  it('includes today regardless of the current hour', () => {
    expect(matchesDue('2026-10-20', 'today', now)).toBe(true);
    expect(matchesDue('2026-10-20', 'overdue', now)).toBe(false);
    expect(dueGroup('2026-10-20', now)).toBe('Today');
  });
  it('uses an inclusive seven-calendar-day boundary', () => {
    expect(matchesDue('2026-10-27', 'week', now)).toBe(true);
    expect(matchesDue('2026-10-28', 'week', now)).toBe(false);
    expect(matchesDue('2026-10-19', 'week', now)).toBe(false);
    expect(dueGroup('2026-10-27', now)).toBe('Next 7 days');
    expect(dueGroup('2026-10-28', now)).toBe('Later');
  });
  it('separates undated work and refuses impossible dates', () => {
    expect(matchesDue(null, 'none', now)).toBe(true);
    expect(matchesDue(null, 'overdue', now)).toBe(false);
    expect(matchesDue('2026-02-30', 'overdue', now)).toBe(false);
    expect(dueGroup(null, now)).toBe('No due date');
    expect(dueGroup('2026-10-19', now)).toBe('Overdue');
  });
  it('handles month and year transitions as calendar dates', () => {
    expect(matchesDue('2027-01-03', 'week', new Date(2026, 11, 30))).toBe(true);
    expect(matchesDue('2027-01-07', 'week', new Date(2026, 11, 30))).toBe(false);
  });
});

describe('Project sections', () => {
  it('returns zero sections for zero visible rows so native empty states can render', () => {
    for (const grouping of ['none', 'state', 'priority', 'assignee'] as const) {
      expect(projectIssueSections([], grouping, [], [])).toEqual([]);
    }
  });
  it('keeps all rows when grouping is disabled', () => {
    expect(projectIssueSections(issues, 'none', [], [])).toEqual([
      { key: 'all', title: '', data: issues },
    ]);
  });
  it('uses defined status order while retaining issues in missing statuses', () => {
    const columns = [
      { id: 2, name: 'In progress', position: 0, stateType: 'started', color: '#666666' },
    ];
    const sections = projectIssueSections(issues, 'state', columns, []);
    expect(sections[0].data.map((issue) => issue.id)).toEqual([2]);
    expect(sections.flatMap((section) => section.data).length).toBe(3);
    expect(sections.find((section) => section.key === '1')?.title).toBe('Unknown status');
  });
  it('labels absent priority and unassigned members without dropping either', () => {
    expect(
      projectIssueSections(issues, 'priority', [], []).map((section) => section.title),
    ).toEqual(['Urgent', 'Low', 'No priority']);
    const sections = projectIssueSections(
      issues,
      'assignee',
      [],
      [{ userId: 'me', name: 'Current user' }],
    );
    expect(sections.map((section) => section.title)).toEqual([
      'Current user',
      'Unassigned',
      'Former member',
    ]);
  });
});
