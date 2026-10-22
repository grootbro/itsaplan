import { localDay, projectIssueSections, type IssueGrouping } from './issue-list';
import type { Issue, ProjectBoard } from './types';
import { validDate } from './validation';

export function boardGroups(
  issues: Issue[],
  grouping: IssueGrouping,
  board: ProjectBoard,
  showEmpty: boolean,
) {
  const groups = projectIssueSections(issues, grouping, board.columns, board.assignees);
  if (grouping === 'none')
    return groups.length || !showEmpty
      ? groups
      : [{ key: 'all', title: 'All issues', data: [] as Issue[] }];
  if (!showEmpty) return groups;
  let expected: { key: string; title: string }[] = [];
  if (grouping === 'state')
    expected = [...board.columns]
      .sort((a, b) => a.position - b.position)
      .map((column) => ({ key: String(column.id), title: column.name }));
  if (grouping === 'assignee')
    expected = [
      ...board.assignees.map((person) => ({ key: person.userId, title: person.name })),
      { key: 'unassigned', title: 'Unassigned' },
    ];
  if (grouping === 'priority')
    expected = ['urgent', 'high', 'medium', 'low', 'none'].map((key) => ({
      key,
      title: key === 'none' ? 'No priority' : key[0].toUpperCase() + key.slice(1),
    }));
  const byKey = new Map(groups.map((group) => [group.key, group]));
  return [
    ...expected.map((group) => byKey.get(group.key) ?? { ...group, data: [] as Issue[] }),
    ...groups.filter((group) => !expected.some((item) => item.key === group.key)),
  ];
}

export function boardColumnWidth(width: number) {
  if (!Number.isFinite(width) || width <= 0) return 300;
  return Math.min(340, Math.max(260, width - 48));
}

export function calendarMonth(cursor: string, weekStart: 0 | 1) {
  const [year, month] = cursor.split('-').map(Number);
  const first = new Date(year, month - 1, 1, 12);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() - weekStart + 7) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return localDay(day);
  });
}

export function shiftMonth(cursor: string, delta: number) {
  const [year, month] = cursor.split('-').map(Number);
  return localDay(new Date(year, month - 1 + delta, 1, 12)).slice(0, 7);
}

export function calendarIssues(issues: Issue[], field: 'dueDate' | 'startDate') {
  const days = new Map<string, Issue[]>();
  const unscheduled: Issue[] = [];
  for (const issue of issues) {
    const day = issue[field]?.slice(0, 10);
    if (!day || !validDate(day)) unscheduled.push(issue);
    else {
      const group = days.get(day) ?? [];
      group.push(issue);
      days.set(day, group);
    }
  }
  return { days, unscheduled };
}
