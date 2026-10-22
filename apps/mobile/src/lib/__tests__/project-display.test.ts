import { describe, expect, test } from 'bun:test';
import {
  defaultProjectDisplay,
  parseProjectDisplay,
  projectDisplayKey,
  type ProjectDisplay,
} from '../project-display';
import { findProject, projectReference } from '../project-reference';

describe('project display state', () => {
  test('recovers invalid storage without hiding tasks', () => {
    for (const input of [null, '', '{', 'null', '[]', 'false', '"board"'])
      expect(parseProjectDisplay(input)).toEqual(defaultProjectDisplay());
    const value = parseProjectDisplay(
      JSON.stringify({
        layout: 'unknown',
        scope: -1,
        filters: { priority: 'critical', cycleId: 1.5 },
        properties: ['status', 'unknown', 'status'],
        weekStart: 4,
      }),
    );
    expect(value.layout).toBe('board');
    expect(value.scope).toBe('all');
    expect(value.filters.priority).toBe('any');
    expect(value.filters.cycleId).toBeNull();
    expect(value.properties).toEqual(['status']);
    expect(value.weekStart).toBe(0);
  });
  test('restores every supported layout and intersecting filters', () => {
    for (const layout of ['board', 'list', 'table', 'calendar', 'timeline'] as const) {
      const state: ProjectDisplay = {
        ...defaultProjectDisplay(),
        layout,
        scope: 12,
        filters: {
          ...defaultProjectDisplay().filters,
          query: 'keep my query',
          assignee: 'person-2',
          labelId: 8,
          priority: null,
        },
        calendarDate: 'startDate',
        weekStart: 1,
      };
      expect(parseProjectDisplay(JSON.stringify(state))).toEqual(state);
    }
    expect(parseProjectDisplay('{"scope":"archive","properties":[]}').scope).toBe('archive');
    expect(parseProjectDisplay('{"properties":[]}').properties).toEqual([]);
  });
  test('restores the timeline scale and safely migrates older or corrupt values', () => {
    expect(
      parseProjectDisplay('{"layout":"timeline","timelineScale":"quarter"}').timelineScale,
    ).toBe('quarter');
    for (const raw of ['{}', '{"timelineScale":"year"}', '{"timelineScale":["week"]}'])
      expect(parseProjectDisplay(raw).timelineScale).toBe('week');
  });
  test('does not share mutable defaults between projects', () => {
    const first = defaultProjectDisplay();
    const second = defaultProjectDisplay();
    first.filters.query = 'private search';
    first.properties.length = 0;
    expect(second.filters.query).toBe('');
    expect(second.properties.length).toBeGreaterThan(0);
  });
  test('rejects stored arrays that stringify to valid enum values', () => {
    const state = parseProjectDisplay(
      JSON.stringify({
        layout: ['table'],
        sort: ['title'],
        grouping: ['assignee'],
        filters: { priority: ['high'], due: ['overdue'] },
      }),
    );
    expect(state).toEqual(defaultProjectDisplay());
  });
  test('names device storage by account and canonical project reference', () => {
    const one = projectDisplayKey('user/a', 'team.PLAN');
    expect(one).toMatch(/^[a-zA-Z0-9._-]+$/);
    expect(one).not.toBe(projectDisplayKey('user_a', 'team.PLAN'));
    expect(one).not.toBe(projectDisplayKey('user/a', 'other.PLAN'));
    expect(one).not.toBe(projectDisplayKey('other', 'team.PLAN'));
  });
});

describe('team-qualified project identity', () => {
  const projects = [
    { id: 1, key: 'PLAN', ref: 'alpha.PLAN' },
    { id: 2, key: 'PLAN', ref: 'beta.PLAN' },
    { id: 3, key: 'OTHER', ref: 'alpha.OTHER' },
  ];
  test('uses canonical references for equal keys in different teams', () => {
    expect(projects.map(projectReference)).toEqual(['alpha.PLAN', 'beta.PLAN', 'alpha.OTHER']);
    expect(findProject(projects, 'alpha.PLAN')?.id).toBe(1);
    expect(findProject(projects, 'beta.PLAN')?.id).toBe(2);
    expect(findProject(projects, 'PLAN')).toBeUndefined();
  });
  test('keeps unambiguous legacy references compatible', () => {
    expect(findProject(projects, 'OTHER')?.id).toBe(3);
    expect(findProject(undefined, 'PLAN')).toBeUndefined();
    expect(findProject(projects, null)).toBeUndefined();
    expect(projectReference({ key: 'OLD' })).toBe('OLD');
  });
});
