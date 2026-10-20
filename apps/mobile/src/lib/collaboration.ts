import type { FeedItem } from './types';
import { validDate } from './validation';

export function canManageEntry(
  canEdit: boolean,
  owner: boolean,
  userId?: string,
  authorId?: string | null,
): boolean {
  return canEdit && (owner || (!!userId && userId === authorId));
}

export function movedIds(
  items: readonly { id: number }[],
  id: number,
  direction: -1 | 1,
): number[] | null {
  const ids = items.map((item) => item.id);
  const from = ids.indexOf(id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= ids.length) return null;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  return ids;
}

export function timeEntry(
  hours: string,
  minutes: string,
  spentOn: string,
  note: string,
  now = new Date(),
) {
  if (!/^\d*$/.test(hours) || !/^\d*$/.test(minutes)) return null;
  const h = Number(hours);
  const m = Number(minutes);
  const total = h * 60 + m;
  if (!Number.isSafeInteger(total) || total <= 0 || m >= 60) return null;
  if (!validDate(spentOn) || spentOn > now.toISOString().slice(0, 10) || note.trim().length > 500)
    return null;
  return { minutes: total, spentOn, note: note.trim() || null };
}

export function activityRows(items: readonly FeedItem[]): { item: FeedItem; depth: number }[] {
  const byId = new Map<number, FeedItem>();
  for (const item of items) if (!byId.has(item.id)) byId.set(item.id, item);
  const entries = [...byId.values()];
  const children = new Map<number, FeedItem[]>();
  for (const item of entries) {
    if (item.replyToId !== null && byId.has(item.replyToId) && item.replyToId !== item.id) {
      const replies = children.get(item.replyToId) ?? [];
      replies.push(item);
      children.set(item.replyToId, replies);
    }
  }
  for (const replies of children.values())
    replies.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id);
  const rows: { item: FeedItem; depth: number }[] = [];
  const seen = new Set<number>();
  const append = (root: FeedItem) => {
    const stack = [{ item: root, depth: 0 }];
    while (stack.length) {
      const row = stack.pop()!;
      if (seen.has(row.item.id)) continue;
      seen.add(row.item.id);
      rows.push(row);
      const replies = children.get(row.item.id) ?? [];
      for (let i = replies.length - 1; i >= 0; i--)
        stack.push({ item: replies[i], depth: row.depth + 1 });
    }
  };
  entries.filter((item) => item.replyToId === null || !byId.has(item.replyToId)).forEach(append);
  entries.filter((item) => !seen.has(item.id)).forEach(append);
  return rows;
}
