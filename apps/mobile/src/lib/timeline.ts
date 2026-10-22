import { boardGroups } from './board-model';
import { localDay, type IssueGrouping } from './issue-list';
import type { Issue, ProjectBoard } from './types';
import { validDate } from './validation';

export type TimelineScale = 'week' | 'month' | 'quarter';
export const timelineDayWidth: Record<TimelineScale, number> = { week: 32, month: 12, quarter: 5 };
const dayMs = 86_400_000;
export function dayOrdinal(value: string) {
  return validDate(value) ? Math.floor(Date.parse(`${value}T12:00:00Z`) / dayMs) : null;
}
export function ordinalDate(value: number) {
  return new Date(value * dayMs).toISOString().split('T')[0];
}
export interface TimelineSpan {
  start: number;
  end: number;
  inferred: boolean;
}
export function timelineSpan(
  issue: Pick<Issue, 'startDate' | 'dueDate' | 'createdAt'>,
): TimelineSpan | null {
  const explicit = issue.startDate ? dayOrdinal(issue.startDate) : null;
  const created = new Date(issue.createdAt);
  const inferred = explicit === null;
  const start =
    explicit ?? (Number.isNaN(created.getTime()) ? null : dayOrdinal(localDay(created)));
  if (start === null) return null;
  const end = (issue.dueDate ? dayOrdinal(issue.dueDate) : null) ?? start;
  return { start: Math.min(start, end), end, inferred };
}
export interface TimelineTrack {
  start: number;
  end: number;
  dayWidth: number;
  width: number;
  today: number;
}
export function timelineTrack(
  issues: Issue[],
  scale: TimelineScale,
  viewport: number,
  labelWidth: number,
  today = localDay(),
): TimelineTrack {
  const now = dayOrdinal(today) ?? dayOrdinal(localDay())!;
  let min: number | null = null;
  let max: number | null = null;
  for (const issue of issues) {
    const span = timelineSpan(issue);
    if (!span) continue;
    min = min === null ? span.start : Math.min(min, span.start);
    max = max === null ? span.end : Math.max(max, span.end);
  }
  const start = (min ?? now) - 3;
  const naturalEnd = (max ?? now + 28) + 7;
  const dayWidth = timelineDayWidth[scale];
  const available = Number.isFinite(viewport) ? Math.max(0, viewport - labelWidth) : 0;
  const days = Math.max(naturalEnd - start + 1, Math.ceil(available / dayWidth));
  return { start, end: start + days - 1, dayWidth, width: days * dayWidth, today: now };
}
export function spanRect(span: TimelineSpan, track: TimelineTrack) {
  return {
    left: (span.start - track.start) * track.dayWidth,
    width: (span.end - span.start + 1) * track.dayWidth,
  };
}
export function timelineOffset(day: number, track: TimelineTrack, visibleWidth: number) {
  return Math.max(
    0,
    Math.min(track.width - Math.max(0, visibleWidth), (day - track.start) * track.dayWidth),
  );
}
export function timelineAxis(track: TimelineTrack, offset: number, visibleWidth: number) {
  const first = Math.max(0, Math.floor(Math.max(0, offset) / track.dayWidth) - 1);
  const last = Math.min(
    track.end - track.start,
    first + Math.ceil(Math.max(0, visibleWidth) / track.dayWidth) + 3,
  );
  const days: { index: number; day: number; number: string; line: boolean }[] = [];
  const months: { left: number; label: string }[] = [];
  let previousMonth = '';
  for (let index = first; index <= last; index++) {
    const day = track.start + index;
    const date = new Date(day * dayMs);
    const month = ordinalDate(day).slice(0, 7);
    if (month !== previousMonth) {
      months.push({
        left: Math.max(offset, index * track.dayWidth),
        label: date.toLocaleDateString(undefined, {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        }),
      });
      previousMonth = month;
    }
    const show = track.dayWidth >= 20 || (track.dayWidth >= 8 && date.getUTCDay() === 1);
    days.push({
      index,
      day,
      number: show ? String(date.getUTCDate()) : '',
      line: index % (track.dayWidth >= 20 ? 1 : 7) === 0,
    });
  }
  return { days, months };
}
export type TimelineRow =
  | {
      kind: 'group';
      key: string;
      title: string;
      count: number;
      collapsed: boolean;
      span: TimelineSpan | null;
    }
  | { kind: 'issue'; key: string; issue: Issue; span: TimelineSpan | null };
export function timelineRows(
  issues: Issue[],
  grouping: IssueGrouping,
  board: ProjectBoard,
  showEmpty: boolean,
  collapsed: readonly string[],
): TimelineRow[] {
  const rows: TimelineRow[] = [];
  for (const group of boardGroups(issues, grouping, board, showEmpty)) {
    const entries = group.data.map((issue) => ({
      kind: 'issue' as const,
      key: `issue:${issue.id}`,
      issue,
      span: timelineSpan(issue),
    }));
    let span: TimelineSpan | null = null;
    for (const entry of entries)
      if (entry.span)
        span = {
          start: Math.min(span?.start ?? entry.span.start, entry.span.start),
          end: Math.max(span?.end ?? entry.span.end, entry.span.end),
          inferred: false,
        };
    const folded = grouping !== 'none' && collapsed.includes(group.key);
    if (grouping !== 'none')
      rows.push({
        kind: 'group',
        key: `group:${group.key}`,
        title: group.title,
        count: entries.length,
        collapsed: folded,
        span,
      });
    if (!folded) rows.push(...entries);
  }
  return rows;
}
