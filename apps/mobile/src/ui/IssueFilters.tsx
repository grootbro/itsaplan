import type {
  IssueFilters as Filters,
  IssueGrouping,
  IssueSort,
  DueFilter,
} from '@/lib/issue-list';
import { defaultFilters } from '@/lib/issue-list';
import type { Priority, ProjectBoard } from '@/lib/types';
import { Choices, NativeSheet, Notice } from './work-controls';
import { Action } from './primitives';

export function IssueFilters({
  board,
  hideDisplay = false,
  filters,
  onChange,
  sort,
  setSort,
  grouping,
  setGrouping,
  onClose,
  cycles,
  initiatives,
  optionsError,
  onRetryOptions,
}: {
  board: ProjectBoard;
  hideDisplay?: boolean;
  filters: Filters;
  onChange: (value: Filters) => void;
  sort: IssueSort;
  setSort: (value: IssueSort) => void;
  cycles: { id: number; name: string }[];
  initiatives: { id: number; title: string }[];
  optionsError: boolean;
  onRetryOptions: () => void;
  grouping: IssueGrouping;
  setGrouping: (value: IssueGrouping) => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });
  const unavailable =
    (!['any', 'mine', 'unassigned'].includes(filters.assignee) &&
      !board.assignees.some((person) => person.userId === filters.assignee)) ||
    (filters.typeId !== null && !board.issueTypes.some((item) => item.id === filters.typeId)) ||
    (filters.labelId !== null && !board.labels.some((item) => item.id === filters.labelId)) ||
    (filters.cycleId !== null && !board.project.cyclesEnabled) ||
    (filters.initiativeId !== null && !board.project.initiativesEnabled);
  return (
    <NativeSheet visible title={hideDisplay ? 'Filters' : 'Filter & display'} onClose={onClose}>
      {unavailable ? (
        <Notice
          message="Some active filters refer to unavailable options. Reset filters if results look incomplete."
          action="Reset filters"
          onPress={() => onChange({ ...defaultFilters })}
        />
      ) : null}
      <Choices
        label="Assignee"
        value={filters.assignee}
        options={[
          { value: 'any', label: 'Anyone' },
          { value: 'mine', label: 'Assigned to me' },
          { value: 'unassigned', label: 'Unassigned' },
          ...board.assignees.map((person) => ({ value: person.userId, label: person.name })),
          ...(!['any', 'mine', 'unassigned'].includes(filters.assignee) &&
          !board.assignees.some((person) => person.userId === filters.assignee)
            ? [{ value: filters.assignee, label: 'Unavailable assignee' }]
            : []),
        ]}
        onChange={(value) => set('assignee', value)}
      />
      <Choices<Priority | 'any'>
        label="Priority"
        value={filters.priority}
        options={[
          { value: 'any', label: 'Any' },
          { value: null, label: 'No priority' },
          { value: 'urgent', label: 'Urgent' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
          { value: 'low', label: 'Low' },
        ]}
        onChange={(value) => set('priority', value)}
      />
      <Choices<DueFilter>
        label="Due date"
        value={filters.due}
        options={[
          { value: 'any', label: 'Any time' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'today', label: 'Today' },
          { value: 'week', label: 'Next 7 days' },
          { value: 'none', label: 'No date' },
        ]}
        onChange={(value) => set('due', value)}
      />
      <Choices<number | null>
        label="Type"
        value={filters.typeId}
        options={[
          { value: null, label: 'Any type' },
          ...board.issueTypes.map((type) => ({ value: type.id, label: type.name })),
          ...(filters.typeId !== null &&
          !board.issueTypes.some((item) => item.id === filters.typeId)
            ? [{ value: filters.typeId, label: 'Unavailable type' }]
            : []),
        ]}
        onChange={(value) => set('typeId', value)}
      />
      {board.labels.length || filters.labelId !== null ? (
        <Choices<number | null>
          label="Label"
          value={filters.labelId}
          options={[
            { value: null, label: 'Any label' },
            ...board.labels.map((label) => ({ value: label.id, label: label.name })),
            ...(filters.labelId !== null &&
            !board.labels.some((item) => item.id === filters.labelId)
              ? [{ value: filters.labelId, label: 'Unavailable label' }]
              : []),
          ]}
          onChange={(value) => set('labelId', value)}
        />
      ) : null}
      {optionsError ? (
        <Notice message="Could not load cycles or initiatives." onPress={onRetryOptions} />
      ) : null}
      {board.project.cyclesEnabled || filters.cycleId !== null ? (
        <Choices<number | null>
          label="Cycle"
          value={filters.cycleId}
          options={[
            { value: null, label: 'Any cycle' },
            ...cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })),
            ...(filters.cycleId !== null && !cycles.some((item) => item.id === filters.cycleId)
              ? [{ value: filters.cycleId, label: 'Unavailable cycle' }]
              : []),
          ]}
          onChange={(value) => set('cycleId', value)}
        />
      ) : null}
      {board.project.initiativesEnabled || filters.initiativeId !== null ? (
        <Choices<number | null>
          label="Initiative"
          value={filters.initiativeId}
          options={[
            { value: null, label: 'Any initiative' },
            ...initiatives.map((initiative) => ({ value: initiative.id, label: initiative.title })),
            ...(filters.initiativeId !== null &&
            !initiatives.some((item) => item.id === filters.initiativeId)
              ? [{ value: filters.initiativeId, label: 'Unavailable initiative' }]
              : []),
          ]}
          onChange={(value) => set('initiativeId', value)}
        />
      ) : null}
      {!hideDisplay ? (
        <>
          <Choices<IssueSort>
            label="Sort by"
            value={sort}
            options={[
              { value: 'updated', label: 'Recently updated' },
              { value: 'due', label: 'Due date' },
              { value: 'priority', label: 'Priority' },
              { value: 'title', label: 'Title' },
            ]}
            onChange={setSort}
          />
          <Choices<IssueGrouping>
            label="Group by"
            value={grouping}
            options={[
              { value: 'none', label: 'No grouping' },
              { value: 'state', label: 'Status' },
              { value: 'priority', label: 'Priority' },
              { value: 'assignee', label: 'Assignee' },
            ]}
            onChange={setGrouping}
          />
        </>
      ) : null}
      <Action muted label="Reset filters" onPress={() => onChange({ ...defaultFilters })} />
    </NativeSheet>
  );
}
