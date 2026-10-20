import { describe, expect, it } from 'bun:test';
import { QueryClient } from '@tanstack/react-query';
import { inboxProjectId, resolveInboxScope } from '../inbox-scope';

const projects = [
  { key: 'ONE', id: 1 },
  { key: 'TWO', id: 2 },
];

describe('Inbox scope', () => {
  it('requires an explicit all-project choice', () => {
    expect(inboxProjectId(resolveInboxScope(true, null, undefined))).toBeUndefined();
    expect(inboxProjectId(resolveInboxScope(true, 'ONE', projects))).toBeUndefined();
  });

  it('preserves a saved project choice while projects load', () => {
    const scope = resolveInboxScope(false, 'ONE', undefined);
    expect(scope).toBeNull();
    expect(() => inboxProjectId(scope)).toThrow('Choose a project');
    expect(inboxProjectId(resolveInboxScope(false, 'ONE', projects))).toBe(1);
  });

  it('refuses to broaden an absent or removed project to all projects', () => {
    for (const key of [null, 'REMOVED']) {
      const scope = resolveInboxScope(false, key, projects);
      expect(scope).toBeNull();
      expect(() => inboxProjectId(scope)).toThrow('Choose a project');
    }
    expect(resolveInboxScope(false, 'ONE', [])).toBeNull();
  });

  it('changes the request project when another project is selected', () => {
    expect(inboxProjectId(resolveInboxScope(false, 'ONE', projects))).toBe(1);
    expect(inboxProjectId(resolveInboxScope(false, 'TWO', projects))).toBe(2);
  });

  it('rejects invalid project ids before an API request can be sent', () => {
    for (const id of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => inboxProjectId(id)).toThrow('Choose a project');
    }
  });

  it('keeps cached all-project data out of unresolved project queries', () => {
    const client = new QueryClient();
    const all = resolveInboxScope(true, null, projects);
    const pending = resolveInboxScope(false, 'ONE', undefined);
    const one = resolveInboxScope(false, 'ONE', projects);
    for (const key of ['inbox', 'unread']) {
      client.setQueryData([key, all], { unread: 12 });
      client.setQueryData([key, one], { unread: 3 });
      expect(client.getQueryData([key, pending])).toBeUndefined();
      expect(client.getQueryData([key, one])).toEqual({ unread: 3 });
      expect(client.getQueryData([key, all])).toEqual({ unread: 12 });
    }
    client.clear();
  });
});
