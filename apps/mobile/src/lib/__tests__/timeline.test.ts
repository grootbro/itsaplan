import { describe, expect, test } from 'bun:test';
import {
  dayOrdinal,
  ordinalDate,
  spanRect,
  timelineAxis,
  timelineOffset,
  timelineRows,
  timelineSpan,
  timelineTrack,
} from '../timeline';
import type { Issue, ProjectBoard } from '../types';
import { localDay } from '../issue-list';
const issue = (patch: Partial<Issue> = {}) =>
  ({
    id: 1,
    title: 'Task',
    columnId: 1,
    startDate: null,
    dueDate: null,
    createdAt: '2026-10-20T23:30:00Z',
    ...patch,
  }) as Issue;
const board = {
  columns: [
    { id: 1, name: 'Backlog', position: 1 },
    { id: 2, name: 'Done', position: 2 },
  ],
  assignees: [],
} as unknown as ProjectBoard;
describe('Native timeline web date contracts', () => {
  test('uses explicit dates and inclusive duration', () => {
    const task = issue({ startDate: '2026-10-01', dueDate: '2026-10-03' });
    const span = timelineSpan(task)!;
    const track = timelineTrack([task], 'week', 390, 160, '2026-10-20');
    expect(span.inferred).toBe(false);
    expect(spanRect(span, track)).toEqual({ left: 3 * 32, width: 3 * 32 });
  });
  test('infers the local creation day and keeps undated tasks on the track', () => {
    const task = issue();
    const span = timelineSpan(task)!;
    expect(ordinalDate(span.start)).toBe(localDay(new Date(task.createdAt)));
    expect(span.end).toBe(span.start);
    expect(span.inferred).toBe(true);
  });
  test('collapses due-before-start to the due day without reversing width', () => {
    const span = timelineSpan(issue({ startDate: '2026-10-20', dueDate: '2026-10-01' }))!;
    expect(ordinalDate(span.start)).toBe('2026-10-01');
    expect(span.end).toBe(span.start);
  });
  test('uses a one-day marker when due date is absent', () => {
    const span = timelineSpan(issue({ startDate: '2026-01-01' }))!;
    expect(span.end).toBe(span.start);
    expect(span.inferred).toBe(false);
  });
  test('keeps calendar ordinals consecutive across DST, leap days and year boundaries', () => {
    for (const pair of [
      ['2026-03-08', '2026-03-09'],
      ['2026-11-01', '2026-11-02'],
      ['2024-02-28', '2024-02-29'],
      ['2026-12-31', '2027-01-01'],
    ])
      expect(dayOrdinal(pair[1])! - dayOrdinal(pair[0])!).toBe(1);
    expect(dayOrdinal('2026-02-29')).toBeNull();
  });
  test('preserves unreadable dates as an unplottable row', () => {
    const task = issue({ startDate: 'invalid', createdAt: 'invalid' });
    expect(timelineSpan(task)).toBeNull();
    expect(timelineRows([task], 'none', board, false, [])).toHaveLength(1);
  });
});
describe('Timeline track and grouping', () => {
  test('pads the complete task range and fills wide viewports', () => {
    const tasks = [issue({ startDate: '2026-10-01', dueDate: '2026-10-03' })];
    const track = timelineTrack(tasks, 'month', 1024, 256);
    expect(ordinalDate(track.start)).toBe('2026-09-28');
    expect(track.width).toBeGreaterThanOrEqual(1024 - 256);
    expect(track.end).toBeGreaterThanOrEqual(dayOrdinal('2026-10-10')!);
  });
  test('matches the empty web range and all three day scales', () => {
    for (const [scale, width] of [
      ['week', 32],
      ['month', 12],
      ['quarter', 5],
    ] as const) {
      const track = timelineTrack([], scale, 0, 0, '2026-10-20');
      expect(track.dayWidth).toBe(width);
      expect(ordinalDate(track.start)).toBe('2026-10-17');
      expect(ordinalDate(track.end)).toBe('2026-11-24');
    }
  });
  test('collapses rows without losing the aggregate span or unknown states', () => {
    const tasks = [
      issue({ startDate: '2026-10-01' }),
      issue({ id: 2, startDate: '2026-11-01' }),
      issue({ id: 3, columnId: 99 }),
    ];
    const rows = timelineRows(tasks, 'state', board, true, ['1']);
    expect(rows.find((row) => row.key === 'group:1')).toMatchObject({
      count: 2,
      collapsed: true,
      span: { start: dayOrdinal('2026-10-01'), end: dayOrdinal('2026-11-01') },
    });
    expect(rows.filter((row) => row.kind === 'issue').map((row) => row.issue.id)).toEqual([3]);
    expect(rows.find((row) => row.key === 'group:2')).toMatchObject({ count: 0 });
    expect(
      timelineRows(tasks, 'state', board, false, []).filter((row) => row.kind === 'issue'),
    ).toHaveLength(3);
  });
  test('renders only viewport axis ticks even for a multi-century task range', () => {
    const track = timelineTrack(
      [issue({ startDate: '1900-01-01', dueDate: '2200-01-01' })],
      'week',
      390,
      160,
    );
    const axis = timelineAxis(track, 1_000_000, 390);
    expect(axis.days.length).toBeLessThan(20);
    expect(track.end - track.start).toBeGreaterThan(100_000);
    expect(axis.months.length).toBeLessThan(3);
  });
  test('bounds partial month labels before the next month', () => {
    const track = timelineTrack([issue({ startDate: '2026-11-01' })], 'quarter', 390, 160);
    const axis = timelineAxis(track, 0, 230);
    expect(axis.months[0].width).toBe(15);
    for (let index = 1; index < axis.months.length; index++)
      expect(axis.months[index - 1].left + axis.months[index - 1].width).toBeLessThanOrEqual(
        axis.months[index].left,
      );
  });
  test('clamps jump targets to the loaded track without negative offsets', () => {
    const track = timelineTrack([], 'week', 390, 160, '2026-10-20');
    expect(timelineOffset(track.start - 100, track, 230)).toBe(0);
    expect(timelineOffset(track.end + 100, track, 230)).toBe(track.width - 230);
    expect(timelineOffset(track.start, track, track.width + 100)).toBe(0);
  });
});
