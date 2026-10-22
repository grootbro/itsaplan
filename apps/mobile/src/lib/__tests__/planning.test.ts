import { describe, expect, test } from 'bun:test';
import {
  canReadPlanning,
  nextPlanningPage,
  planningDraft,
  planningPayload,
  planningValidation,
  type PlanningPage,
} from '../planning-model';
import type { ProjectBoard } from '../types';

describe('project planning contracts', () => {
  test('requires effective server feature flags and section read permission', () => {
    const board: ProjectBoard = {
      project: {
        id: 1,
        teamId: 1,
        teamName: 'Fixture',
        key: 'QA',
        name: 'Fixture',
        description: '',
        cyclesEnabled: true,
        initiativesEnabled: true,
      },
      columns: [],
      assignees: [],
      labels: [],
      issueTypes: [],
      customFields: [],
      permissions: { cycles: { read: true }, initiatives: { read: false } },
    };
    expect(canReadPlanning(board, 'cycles')).toBe(true);
    expect(canReadPlanning(board, 'initiatives')).toBe(false);
    expect(canReadPlanning(undefined, 'cycles')).toBe(false);
    board.project.cyclesEnabled = false;
    expect(canReadPlanning(board, 'cycles')).toBe(false);
  });
  test('pages completed cycles and initiatives without repeating the last page', () => {
    const page: PlanningPage = {
      items: [
        {
          ...planningDraft(),
          id: 1,
          projectId: 1,
          labelIds: [],
          progress: { completed: 0, canceled: 0, total: 0 },
        },
      ],
      total: 26,
      page: 1,
      pageSize: 25,
    };
    expect(nextPlanningPage(page)).toBe(2);
    expect(nextPlanningPage({ ...page, page: 2 })).toBeUndefined();
    expect(nextPlanningPage({ ...page, items: [] })).toBeUndefined();
  });
  test('validates required cycle dates and optional initiative dates', () => {
    const draft = { ...planningDraft(), title: 'Delivery' };
    expect(planningValidation('cycles', draft)).toBe('Choose a start date and end date.');
    expect(planningValidation('initiatives', draft)).toBeNull();
    expect(planningValidation('initiatives', { ...draft, startDate: '2026-02-30' })).toBe(
      'Choose valid calendar dates.',
    );
    expect(
      planningValidation('cycles', { ...draft, startDate: '2026-10-22', targetDate: '2026-11-01' }),
    ).toBeNull();
  });
  test('patches only changed fields and preserves server-owned cycle status', () => {
    const initial = {
      ...planningDraft(),
      title: 'Initial',
      status: 'active',
      startDate: '2026-10-22',
      targetDate: '2026-11-01',
    };
    expect(planningPayload('cycles', { ...initial, title: ' Renamed ' }, initial)).toEqual({
      name: 'Renamed',
    });
    expect(planningPayload('initiatives', { ...initial, description: 'Changed' }, initial)).toEqual(
      { description: 'Changed' },
    );
    expect(planningPayload('cycles', initial)).not.toHaveProperty('status');
    expect(planningPayload('initiatives', initial, initial)).toEqual({});
  });
});
