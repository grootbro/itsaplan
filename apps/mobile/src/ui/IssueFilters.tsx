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
  return (
    <NativeSheet visible title="Filter & display" onClose={onClose}>
      <Choices
        label="Assignee"
        value={filters.assignee}
        options={[
          { value: 'any', label: 'Anyone' },
          { value: 'mine', label: 'Assigned to me' },
          { value: 'unassigned', label: 'Unassigned' },
          ...board.assignees.map((person) => ({ value: person.userId, label: person.name })),
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
        ]}
        onChange={(value) => set('typeId', value)}
      />
      {board.labels.length ? (
        <Choices<number | null>
          label="Label"
          value={filters.labelId}
          options={[
            { value: null, label: 'Any label' },
            ...board.labels.map((label) => ({ value: label.id, label: label.name })),
          ]}
          onChange={(value) => set('labelId', value)}
        />
      ) : null}
      {optionsError ? (
        <Notice message="Could not load cycles or initiatives." onPress={onRetryOptions} />
      ) : null}
      {board.project.cyclesEnabled ? (
        <Choices<number | null>
          label="Cycle"
          value={filters.cycleId}
          options={[
            { value: null, label: 'Any cycle' },
            ...cycles.map((cycle) => ({ value: cycle.id, label: cycle.name })),
          ]}
          onChange={(value) => set('cycleId', value)}
        />
      ) : null}
      {board.project.initiativesEnabled ? (
        <Choices<number | null>
          label="Initiative"
          value={filters.initiativeId}
          options={[
            { value: null, label: 'Any initiative' },
            ...initiatives.map((initiative) => ({ value: initiative.id, label: initiative.title })),
          ]}
          onChange={(value) => set('initiativeId', value)}
        />
      ) : null}
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
      <Action muted label="Reset filters" onPress={() => onChange({ ...defaultFilters })} />
    </NativeSheet>
  );
}
