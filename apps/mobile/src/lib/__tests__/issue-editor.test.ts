import { describe, expect, test } from 'bun:test';
import { issueDraft, issuePatch, issueValidation, issueValues } from '../issue-editor';
import type { Issue, ProjectBoard } from '../types';

const board = {
  columns: [
    { id: 2, stateType: 'started' },
    { id: 1, stateType: 'backlog' },
  ],
  issueTypes: [{ id: 3, isDefault: true }],
} as ProjectBoard;
const fresh = () => ({ ...issueDraft(undefined, board), title: 'A useful task' });
describe('Issue editing contracts', () => {
  test('uses a valid requested column and the project default type', () => {
    expect(issueDraft(undefined, board, 2)).toMatchObject({ columnId: 2, typeId: 3 });
    expect(issueDraft(undefined, board, 99).columnId).toBe(1);
  });
  test('retains a deliberately empty type on existing issues', () => {
    expect(issueDraft({ typeId: null } as Issue, board).typeId).toBeNull();
  });
  test('does not overwrite unrelated server fields while saving one edit', () => {
    const initial = fresh();
    expect(issuePatch({ ...initial, title: 'Renamed' }, initial)).toEqual({ title: 'Renamed' });
  });
  test('sends explicit clears and preserves a valid zero estimate', () => {
    const initial = {
      ...fresh(),
      startDate: '2026-10-01',
      estimatePoints: '5',
      assigneeUserId: 'member',
    };
    expect(
      issuePatch({ ...initial, startDate: '', estimatePoints: '0', assigneeUserId: null }, initial),
    ).toEqual({ startDate: null, estimatePoints: 0, assigneeUserId: null });
  });
  test('does not treat label order or duplicate ids as edits', () => {
    expect(
      issuePatch({ ...fresh(), labelIds: [2, 1, 2] }, { ...fresh(), labelIds: [1, 2] }),
    ).toEqual({});
  });
  test('normalizes numeric estimates without changing the draft', () => {
    const draft = { ...fresh(), estimateMinutes: ' 60 ', labelIds: [2, 1] };
    expect(issueValues(draft)).toMatchObject({ estimateMinutes: 60, labelIds: [1, 2] });
    expect(draft.labelIds).toEqual([2, 1]);
  });
  test('validates the effective date pair including an unchanged date', () => {
    expect(
      issueValidation({ ...fresh(), startDate: '2026-10-02', dueDate: '2026-10-01' }),
    ).toContain('on or after');
    expect(
      issueValidation({ ...fresh(), startDate: '2026-10-01', dueDate: '2026-10-01' }),
    ).toBeNull();
    expect(issueValidation({ ...fresh(), dueDate: '2026-02-30' })).toContain('valid due');
  });
  test('rejects invalid estimates and allows fractional points only', () => {
    for (const value of ['-1', 'Infinity', 'not a number'])
      expect(issueValidation({ ...fresh(), estimatePoints: value })).not.toBeNull();
    expect(issueValidation({ ...fresh(), estimatePoints: '0.5' })).toBeNull();
    expect(issueValidation({ ...fresh(), estimateMinutes: '0.5' })).toContain('whole number');
    expect(issueValidation({ ...fresh(), estimateMinutes: '0' })).toBeNull();
  });
  test('enforces title, state and the server description limit', () => {
    expect(issueValidation({ ...fresh(), title: '  ' })).toContain('title');
    expect(issueValidation({ ...fresh(), columnId: 0 })).toContain('state');
    expect(issueValidation({ ...fresh(), description: 'a'.repeat(50_001) })).toContain('50,000');
    expect(issueValidation({ ...fresh(), description: 'a'.repeat(50_000) })).toBeNull();
  });
});
