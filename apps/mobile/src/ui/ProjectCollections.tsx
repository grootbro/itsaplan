import { Ionicons } from '@expo/vector-icons';
import { useState, type MutableRefObject } from 'react';
import { FlatList, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import type { Issue, ProjectBoard } from '@/lib/types';
import { localDay, type IssueGrouping } from '@/lib/issue-list';
import {
  boardColumnWidth,
  boardGroups,
  calendarIssues,
  calendarMonth,
  shiftMonth,
} from '@/lib/board-model';
import { issueProperties, type IssueProperty } from '@/lib/project-display';
import { IssueRow } from './IssueRow';
import { IssuePriority, IssueStatus } from './issue-metadata';
import { EmptyState } from './primitives';
import { useColors, useThemedStyles, type Palette } from './theme';

export interface CollectionScroll {
  boardX: number;
  columns: Record<string, number>;
  tableX: number;
  tableY: number;
  listY: number;
  calendarY: number;
  timelineX?: number;
  timelineY?: number;
}

interface CollectionProps {
  issues: Issue[];
  board: ProjectBoard;
  selectedId: number | null;
  onOpen: (id: number) => void;
  onActions?: (id: number) => void;
  properties: IssueProperty[];
  scroll: MutableRefObject<CollectionScroll>;
}

function PropertyValue({
  issue,
  board,
  property,
}: {
  issue: Issue;
  board: ProjectBoard;
  property: IssueProperty;
}) {
  const styles = useThemedStyles(createStyles);
  if (property === 'status') {
    const column = board.columns.find((item) => item.id === issue.columnId);
    return <IssueStatus name={column?.name ?? 'Unknown status'} color={column?.color} />;
  }
  if (property === 'priority') return <IssuePriority value={issue.priority} />;
  let text = 'Not set';
  if (property === 'assignee')
    text =
      board.assignees.find((person) => person.userId === issue.assigneeUserId)?.name ??
      (issue.assigneeUserId ? 'Former member' : 'Unassigned');
  if (property === 'dueDate') {
    const day = issue.dueDate?.slice(0, 10);
    const state = board.columns.find((item) => item.id === issue.columnId);
    const overdue =
      !!day && !!state && !['completed', 'canceled'].includes(state.stateType) && day < localDay();
    return (
      <Text style={[styles.metadata, overdue && styles.overdue]}>
        {overdue ? 'Overdue · ' : ''}
        {day ?? 'No due date'}
      </Text>
    );
  }
  if (property === 'type')
    text = board.issueTypes.find((item) => item.id === issue.typeId)?.name ?? 'No type';
  if (property === 'labels')
    text =
      issue.labelIds
        .map((id) => board.labels.find((label) => label.id === id)?.name ?? 'Unavailable label')
        .join(', ') || 'No labels';
  return <Text style={styles.metadata}>{text}</Text>;
}

export function ProjectBoardView(
  props: CollectionProps & {
    grouping: IssueGrouping;
    showEmpty: boolean;
    allIssues: Issue[];
    archived?: boolean;
    onCreate?: (columnId: number) => void;
  },
) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(360);
  const groups = boardGroups(props.issues, props.grouping, props.board, props.showEmpty);
  const columnWidth = boardColumnWidth(width);
  return (
    <View style={styles.fill} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <FlatList
        horizontal
        data={groups}
        keyExtractor={(group) => group.key}
        contentContainerStyle={styles.board}
        contentOffset={{ x: props.scroll.current.boardX, y: 0 }}
        onScroll={(event) => {
          props.scroll.current.boardX = event.nativeEvent.contentOffset.x;
        }}
        scrollEventThrottle={100}
        snapToInterval={columnWidth + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator
        ListEmptyComponent={
          <EmptyState
            title="No columns to show"
            detail="Change your grouping or show empty columns in Display."
          />
        }
        renderItem={({ item: group }) => {
          const column =
            props.grouping === 'state'
              ? props.board.columns.find((item) => String(item.id) === group.key)
              : undefined;
          const total = column
            ? props.allIssues.filter((issue) => issue.columnId === column.id).length
            : 0;
          return (
            <View style={[styles.column, { width: columnWidth }]}>
              <View style={styles.columnHeading}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text accessibilityRole="header" style={styles.columnTitle}>
                    {group.title || 'All issues'}{' '}
                    <Text style={styles.count}>{group.data.length}</Text>
                  </Text>
                  {column &&
                  !props.archived &&
                  (total !== group.data.length || column.wipLimit != null) ? (
                    <Text style={styles.caption}>
                      {total} total{column.wipLimit != null ? ` · Limit ${column.wipLimit}` : ''}
                    </Text>
                  ) : null}
                </View>
                {column && props.onCreate ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Create issue in ${column.name}`}
                    style={styles.iconButton}
                    onPress={() => props.onCreate?.(column.id)}
                  >
                    <Ionicons name="add" color={colors.ink} size={22} />
                  </Pressable>
                ) : null}
              </View>
              <FlatList
                data={group.data}
                keyExtractor={(issue) => String(issue.id)}
                contentContainerStyle={styles.columnBody}
                contentOffset={{ x: 0, y: props.scroll.current.columns[group.key] ?? 0 }}
                onScroll={(event) => {
                  props.scroll.current.columns[group.key] = event.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={100}
                ListEmptyComponent={
                  <Text style={styles.emptyColumn}>No issues in this column</Text>
                }
                renderItem={({ item: issue }) => (
                  <View
                    style={[
                      styles.card,
                      props.selectedId === issue.id && { backgroundColor: colors.accentSoft },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${issue.identifier}, ${issue.title}`}
                      accessibilityState={{ selected: props.selectedId === issue.id }}
                      onPress={() => props.onOpen(issue.id)}
                      onLongPress={props.onActions ? () => props.onActions?.(issue.id) : undefined}
                      style={({ pressed }) => [styles.cardBody, pressed && { opacity: 0.65 }]}
                    >
                      <Text style={styles.identifier}>{issue.identifier}</Text>
                      <Text style={styles.cardTitle}>{issue.title}</Text>
                      <View style={styles.cardProperties}>
                        {props.properties.map((property) => (
                          <View key={property} style={styles.cardProperty}>
                            <PropertyValue issue={issue} board={props.board} property={property} />
                          </View>
                        ))}
                      </View>
                    </Pressable>
                    {props.onActions ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Actions for ${issue.identifier}`}
                        onPress={() => props.onActions?.(issue.id)}
                        style={styles.cardAction}
                      >
                        <Ionicons name="ellipsis-horizontal" color={colors.muted} size={20} />
                        <Text style={styles.caption}>Actions</Text>
                      </Pressable>
                    ) : null}
                  </View>
                )}
              />
            </View>
          );
        }}
      />
    </View>
  );
}

export function ProjectTableView(props: CollectionProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const width = 250 + props.properties.length * 150 + (props.onActions ? 48 : 0);
  return (
    <ScrollView
      horizontal
      style={styles.fill}
      contentContainerStyle={{ minWidth: '100%' }}
      contentOffset={{ x: props.scroll.current.tableX, y: 0 }}
      onScroll={(event) => {
        props.scroll.current.tableX = event.nativeEvent.contentOffset.x;
      }}
      scrollEventThrottle={100}
    >
      <FlatList
        style={{ width }}
        data={props.issues}
        keyExtractor={(issue) => String(issue.id)}
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingBottom: 110 }}
        contentOffset={{ x: 0, y: props.scroll.current.tableY }}
        onScroll={(event) => {
          props.scroll.current.tableY = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={100}
        ListHeaderComponent={
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text accessibilityRole="header" style={[styles.tableLabel, styles.titleCell]}>
              Issue
            </Text>
            {props.properties.map((property) => (
              <Text
                key={property}
                accessibilityRole="header"
                style={[styles.tableLabel, styles.cell]}
              >
                {issueProperties.find((item) => item.value === property)?.label}
              </Text>
            ))}
            {props.onActions ? <View style={{ width: 48 }} /> : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No matching issues"
            detail="Clear a filter or choose another status."
          />
        }
        renderItem={({ item: issue }) => (
          <View
            style={[
              styles.tableRow,
              props.selectedId === issue.id && { backgroundColor: colors.accentSoft },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open ${issue.identifier}, ${issue.title}`}
              style={styles.titleCell}
              onPress={() => props.onOpen(issue.id)}
            >
              <Text style={styles.identifier}>{issue.identifier}</Text>
              <Text style={styles.tableTitle}>{issue.title}</Text>
            </Pressable>
            {props.properties.map((property) => (
              <View key={property} style={styles.cell}>
                <PropertyValue issue={issue} board={props.board} property={property} />
              </View>
            ))}
            {props.onActions ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Actions for ${issue.identifier}`}
                style={styles.iconButton}
                onPress={() => props.onActions?.(issue.id)}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        )}
      />
    </ScrollView>
  );
}

export function ProjectCalendarView(
  props: CollectionProps & {
    dateField: 'dueDate' | 'startDate';
    weekStart: 0 | 1;
    month: string;
    setMonth: (month: string) => void;
    day: string;
    setDay: (day: string) => void;
    unscheduled: boolean;
    setUnscheduled: (value: boolean) => void;
  },
) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(360);
  const model = calendarIssues(props.issues, props.dateField);
  const days = calendarMonth(props.month, props.weekStart);
  const selected = props.unscheduled ? model.unscheduled : (model.days.get(props.day) ?? []);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayNames = [...weekdays.slice(props.weekStart), ...weekdays.slice(0, props.weekStart)];
  const monthLabel = new Date(`${props.month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const heading = (
    <View style={styles.calendarHeader}>
      <View style={styles.monthControls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={styles.iconButton}
          onPress={() => props.setMonth(shiftMonth(props.month, -1))}
        >
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" style={styles.monthLabel}>
          {monthLabel}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={styles.iconButton}
          onPress={() => props.setMonth(shiftMonth(props.month, 1))}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.ink} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.iconButton}
          onPress={() => {
            props.setMonth(localDay().slice(0, 7));
            props.setDay(localDay());
            props.setUnscheduled(false);
          }}
        >
          <Text style={styles.today}>Today</Text>
        </Pressable>
      </View>
      <ScrollView horizontal contentContainerStyle={{ width: Math.max(308, width - 32) }}>
        <View style={styles.calendarGrid}>
          {weekdayNames.map((day) => (
            <View key={day} style={styles.dayCell}>
              <Text style={styles.caption}>{day}</Text>
            </View>
          ))}
          {days.map((day) => {
            const count = model.days.get(day)?.length ?? 0;
            const current = props.day === day && !props.unscheduled;
            return (
              <Pressable
                key={day}
                accessibilityRole="button"
                accessibilityLabel={`${day}, ${count} issues`}
                accessibilityState={{ selected: current }}
                onPress={() => {
                  props.setDay(day);
                  props.setUnscheduled(false);
                }}
                style={[
                  styles.dayCell,
                  styles.dayButton,
                  current && { backgroundColor: colors.ink },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    day.slice(0, 7) !== props.month && { color: colors.muted },
                    current && { color: colors.onAccent },
                  ]}
                >
                  {Number(day.slice(-2))}
                </Text>
                <Text style={[styles.dayCount, current && { color: colors.onAccent }]}>
                  {count || ' '}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.agendaHeading}>
        <Text accessibilityRole="header" style={styles.columnTitle}>
          {props.unscheduled ? 'Unscheduled' : props.day}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: props.unscheduled }}
          style={styles.unscheduled}
          onPress={() => props.setUnscheduled(!props.unscheduled)}
        >
          <Text style={styles.metadata}>
            {props.unscheduled ? 'Selected day' : `Unscheduled · ${model.unscheduled.length}`}
          </Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>
        {props.dateField === 'dueDate' ? 'By due date' : 'By start date'} · {selected.length} issues
      </Text>
    </View>
  );
  return (
    <View style={styles.fill} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <SectionList
        sections={[{ key: 'agenda', data: selected }]}
        ListHeaderComponent={heading}
        keyExtractor={(issue) => String(issue.id)}
        contentOffset={{ x: 0, y: props.scroll.current.calendarY }}
        onScroll={(event) => {
          props.scroll.current.calendarY = event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={100}
        contentContainerStyle={{ paddingBottom: 110 }}
        ListEmptyComponent={
          <EmptyState
            title={props.unscheduled ? 'No unscheduled issues' : 'No issues on this day'}
            detail="Choose another date, month, or the unscheduled list."
          />
        }
        renderItem={({ item: issue }) => (
          <IssueRow
            issue={issue}
            selected={props.selectedId === issue.id}
            state={props.board.columns.find((item) => item.id === issue.columnId)?.name}
            stateColor={props.board.columns.find((item) => item.id === issue.columnId)?.color}
            stateType={props.board.columns.find((item) => item.id === issue.columnId)?.stateType}
            onPress={() => props.onOpen(issue.id)}
            onActions={props.onActions ? () => props.onActions?.(issue.id) : undefined}
          />
        )}
      />
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    fill: { flex: 1, minWidth: 0 },
    board: { paddingHorizontal: 16, gap: 12 },
    column: { flex: 1, minHeight: 0 },
    columnHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      minHeight: 64,
      paddingHorizontal: 4,
      paddingVertical: 8,
    },
    columnTitle: { color: colors.ink, fontSize: 16, fontWeight: '600', lineHeight: 23 },
    count: { color: colors.muted, fontSize: 14 },
    overdue: { color: colors.danger },
    caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
    metadata: { color: colors.muted, fontSize: 14, lineHeight: 21, flexShrink: 1 },
    columnBody: { gap: 10, paddingBottom: 110 },
    emptyColumn: { color: colors.muted, fontSize: 14, lineHeight: 21, padding: 16 },
    card: { backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' },
    cardBody: { padding: 16, gap: 9, minHeight: 80 },
    cardTitle: { color: colors.ink, fontSize: 17, fontWeight: '500', lineHeight: 25 },
    identifier: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '600' },
    cardProperties: { gap: 8, flexDirection: 'row', flexWrap: 'wrap', marginTop: 3 },
    cardProperty: { maxWidth: '100%' },
    cardAction: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      minHeight: 44,
      paddingHorizontal: 16,
    },
    iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    tableRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      minHeight: 64,
    },
    tableHeader: { backgroundColor: colors.accentSoft },
    tableLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' },
    titleCell: { width: 250, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
    cell: { width: 150, paddingHorizontal: 12, paddingVertical: 14 },
    tableTitle: { color: colors.ink, fontSize: 15, lineHeight: 23 },
    calendarHeader: { paddingHorizontal: 16, paddingBottom: 16 },
    monthControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    monthLabel: { flex: 1, color: colors.ink, fontSize: 19, fontWeight: '600', lineHeight: 27 },
    today: { color: colors.ink, fontSize: 14, fontWeight: '600' },
    calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', flex: 1 },
    dayCell: {
      width: `${100 / 7}%`,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 28,
    },
    dayButton: { minHeight: 52, borderRadius: 10, paddingVertical: 5 },
    dayNumber: { color: colors.ink, fontSize: 16, lineHeight: 23 },
    dayCount: { color: colors.muted, fontSize: 11, lineHeight: 16 },
    agendaHeading: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    unscheduled: { minHeight: 48, justifyContent: 'center' },
  });
