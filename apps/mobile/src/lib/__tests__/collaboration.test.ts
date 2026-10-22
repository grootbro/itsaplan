import { describe, expect, it } from 'bun:test';
import { activityRows, canManageEntry, movedIds, timeEntry } from '../collaboration';
import type { FeedItem } from '../types';

const now = new Date(2026, 9, 20, 16);
const comment = (
  id: number,
  replyToId: number | null = null,
  createdAt = `2026-10-20T10:00:${String(id).padStart(2, '0')}Z`,
): FeedItem => ({
  id,
  replyToId,
  createdAt,
  actorUserId: 'author',
  actorName: 'Member',
  body: `Comment ${id}`,
  kind: 'comment',
  action: null,
  editedAt: null,
});

describe('Entry ownership', () => {
  it('allows authors and project owners only when editing is permitted', () => {
    expect(canManageEntry(true, false, 'author', 'author')).toBe(true);
    expect(canManageEntry(true, false, 'other', 'author')).toBe(false);
    expect(canManageEntry(true, true, 'owner', 'author')).toBe(true);
    expect(canManageEntry(false, true, 'owner', 'author')).toBe(false);
    expect(canManageEntry(true, false, undefined, null)).toBe(false);
  });
});
describe('Checklist ordering', () => {
  it('moves one row without dropping or duplicating siblings', () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
    expect(movedIds(items, 2, -1)).toEqual([2, 1, 3]);
    expect(movedIds(items, 2, 1)).toEqual([1, 3, 2]);
    expect(items).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });
  it('rejects stale ids and boundary movements', () => {
    expect(movedIds([{ id: 1 }], 1, -1)).toBeNull();
    expect(movedIds([{ id: 1 }], 1, 1)).toBeNull();
    expect(movedIds([{ id: 1 }], 2, 1)).toBeNull();
    expect(movedIds([], 1, -1)).toBeNull();
  });
});
describe('Time entries', () => {
  it('matches the server UTC day across local timezone boundaries', () => {
    const boundary = new Date('2026-10-20T23:59:00Z');
    expect(timeEntry('1', '0', '2026-10-20', '', boundary)).not.toBeNull();
    expect(timeEntry('1', '0', '2026-10-21', '', boundary)).toBeNull();
  });
  it('normalizes whole hours, minutes and optional note', () => {
    expect(timeEntry('2', '15', '2026-10-20', '  Review  ', now)).toEqual({
      minutes: 135,
      spentOn: '2026-10-20',
      note: 'Review',
    });
    expect(timeEntry('', '1', '2026-10-19', ' ', now)?.note).toBeNull();
  });
  it('rejects fractional, negative, scientific and overflow input', () => {
    for (const h of ['1.5', '-1', '1e2', 'Infinity', ' 1', '9999999999999999999'])
      expect(timeEntry(h, '0', '2026-10-20', '', now)).toBeNull();
    expect(timeEntry('0', '60', '2026-10-20', '', now)).toBeNull();
    expect(timeEntry('0', '0', '2026-10-20', '', now)).toBeNull();
  });
  it('enforces real nonfuture dates and the server note limit', () => {
    expect(timeEntry('1', '0', '2026-02-30', '', now)).toBeNull();
    expect(timeEntry('1', '0', '2026-10-21', '', now)).toBeNull();
    expect(timeEntry('1', '0', '2026-10-20', 'a'.repeat(501), now)).toBeNull();
    expect(timeEntry('1', '0', '2026-10-20', 'a'.repeat(500), now)).not.toBeNull();
  });
});
describe('Activity threads', () => {
  it('places nested replies after their parent with chronological siblings', () => {
    const rows = activityRows([
      comment(1),
      comment(4),
      comment(3, 1),
      comment(2, 1),
      comment(5, 2),
    ]);
    expect(rows.map(({ item, depth }) => [item.id, depth])).toEqual([
      [1, 0],
      [2, 1],
      [5, 2],
      [3, 1],
      [4, 0],
    ]);
  });
  it('keeps first-page data for duplicate ids and preserves orphan replies', () => {
    const rows = activityRows([
      { ...comment(1), body: 'Fresh' },
      { ...comment(1), body: 'Stale' },
      comment(2, 99),
    ]);
    expect(rows.map((row) => row.item.body)).toEqual(['Fresh', 'Comment 2']);
  });
  it('terminates on cyclic or self-referencing data without losing entries', () => {
    expect(
      activityRows([comment(1, 2), comment(2, 1), comment(3, 3)])
        .map((row) => row.item.id)
        .sort(),
    ).toEqual([1, 2, 3]);
  });
  it('handles deep threads without recursive traversal', () => {
    const items = Array.from({ length: 2000 }, (_, index) =>
      comment(index + 1, index || null, '2026-10-20T10:00:00Z'),
    );
    const rows = activityRows(items);
    expect(rows).toHaveLength(2000);
    expect(rows[1999].depth).toBe(1999);
  });
});
