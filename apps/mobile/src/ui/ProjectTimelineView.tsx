import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { Issue, ProjectBoard } from '@/lib/types';
import type { IssueGrouping } from '@/lib/issue-list';
import {
  dayOrdinal,
  ordinalDate,
  spanRect,
  timelineAxis,
  timelineOffset,
  timelineRows,
  timelineTrack,
  type TimelineRow,
  type TimelineScale,
  type TimelineSpan,
} from '@/lib/timeline';
import type { CollectionScroll } from './ProjectCollections';
import { DateField } from './DateField';
import { NativeSheet } from './work-controls';
import { Action, EmptyState } from './primitives';
import { useColors, useThemedStyles, type Palette } from './theme';

export function ProjectTimelineView({
  issues,
  board,
  selectedId,
  onOpen,
  onActions,
  scroll,
  scale,
  onScale,
  grouping,
  showEmpty,
  collapsed,
  onCollapsed,
}: {
  issues: Issue[];
  board: ProjectBoard;
  selectedId: number | null;
  onOpen: (id: number) => void;
  onActions?: (id: number) => void;
  scroll: MutableRefObject<CollectionScroll>;
  scale: TimelineScale;
  onScale: (scale: TimelineScale) => void;
  grouping: IssueGrouping;
  showEmpty: boolean;
  collapsed: string[];
  onCollapsed: (groups: string[]) => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { fontScale } = useWindowDimensions();
  const [viewport, setViewport] = useState(360);
  const [offset, setOffset] = useState(scroll.current.timelineX ?? 0);
  const [jump, setJump] = useState(false);
  const [date, setDate] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const horizontal = useRef<ScrollView>(null);
  const labelWidth = Math.min(
    viewport - 80,
    Math.max(140, Math.min(256, viewport * 0.42), fontScale >= 1.6 ? 220 : 0),
  );
  const track = useMemo(
    () => timelineTrack(issues, scale, viewport, labelWidth),
    [issues, scale, viewport, labelWidth],
  );
  const rows = useMemo(
    () => timelineRows(issues, grouping, board, showEmpty, collapsed),
    [issues, grouping, board, showEmpty, collapsed],
  );
  const visibleWidth = Math.max(80, viewport - labelWidth);
  const axis = timelineAxis(track, offset, visibleWidth);
  const textScale = Math.max(1, fontScale);
  const rowHeight = Math.ceil(84 * textScale);
  const groupHeight = Math.ceil(64 * textScale);
  const hasInferredStart = rows.some((row) => row.kind === 'issue' && row.span?.inferred);
  const headerHeight = Math.ceil(64 * textScale);
  useEffect(() => {
    const x = Math.max(0, Math.min(offset, track.width - visibleWidth));
    if (x === offset) return;
    scroll.current.timelineX = x;
    setOffset(x);
    horizontal.current?.scrollTo({ x, animated: false });
  }, [offset, track.width, visibleWidth, scroll]);
  const go = (day: number) => {
    setNotice(
      day < track.start || day > track.end
        ? 'This date is outside loaded task dates. Showing the nearest edge.'
        : null,
    );
    const x = timelineOffset(day, track, visibleWidth);
    scroll.current.timelineX = x;
    setOffset(x);
    horizontal.current?.scrollTo({ x, animated: false });
  };
  const zoom = (value: TimelineScale) => {
    const day = track.start + offset / track.dayWidth;
    const next = timelineTrack(issues, value, viewport, labelWidth);
    const x = timelineOffset(day, next, visibleWidth);
    scroll.current.timelineX = x;
    setOffset(x);
    onScale(value);
    requestAnimationFrame(() => horizontal.current?.scrollTo({ x, animated: false }));
  };
  const grid = () => (
    <>
      {axis.days
        .filter((day) => day.line)
        .map((day) => (
          <View
            key={day.index}
            pointerEvents="none"
            style={[styles.gridLine, { left: day.index * track.dayWidth }]}
          />
        ))}
      {track.today >= track.start && track.today <= track.end ? (
        <View
          pointerEvents="none"
          style={[styles.todayLine, { left: (track.today - track.start) * track.dayWidth }]}
        />
      ) : null}
    </>
  );
  const bar = (span: TimelineSpan, label: string, onPress: () => void, aggregate = false) => {
    const rect = spanRect(span, track);
    const visualWidth = Math.max(4, rect.width);
    const touchWidth = Math.max(48, visualWidth);
    const touchLeft = Math.max(0, rect.left - (touchWidth - visualWidth) / 2);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={[
          styles.barTouch,
          { left: touchLeft, width: touchWidth, height: aggregate ? groupHeight : rowHeight },
        ]}
      >
        <View
          style={[
            styles.bar,
            aggregate && styles.aggregate,
            span.inferred && styles.inferred,
            { marginLeft: rect.left - touchLeft, width: visualWidth },
          ]}
        />
      </Pressable>
    );
  };
  const renderRow = ({ item }: { item: TimelineRow }) => {
    if (item.kind === 'group') {
      const toggle = () =>
        onCollapsed(
          item.collapsed
            ? collapsed.filter((key) => key !== item.key.slice(6))
            : [...collapsed, item.key.slice(6)],
        );
      return (
        <View style={[styles.row, { height: groupHeight }]}>
          <View
            style={{
              position: 'absolute',
              left: labelWidth,
              width: track.width,
              height: groupHeight,
            }}
          >
            {grid()}
            {item.collapsed && item.span
              ? bar(item.span, `${item.title}, ${item.count} issues, expand group`, toggle, true)
              : null}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.collapsed ? 'Expand' : 'Collapse'} ${item.title}, ${item.count} issues`}
            accessibilityState={{ expanded: !item.collapsed }}
            onPress={toggle}
            style={[
              styles.label,
              { width: labelWidth, height: groupHeight, transform: [{ translateX: offset }] },
            ]}
          >
            <View style={styles.groupTitle}>
              <Ionicons
                name={item.collapsed ? 'chevron-forward' : 'chevron-down'}
                size={16}
                color={colors.muted}
              />
              <Text numberOfLines={2} style={styles.group}>
                {item.title}
              </Text>
            </View>
            <Text style={styles.meta}>{item.count} issues</Text>
          </Pressable>
        </View>
      );
    }
    const { issue, span } = item;
    let dates = 'No valid dates';
    if (span) dates = ordinalDate(span.start);
    if (span && span.end !== span.start) dates += ` – ${ordinalDate(span.end)}`;
    const open = () => onOpen(issue.id);
    return (
      <View style={[styles.row, { height: rowHeight }, selectedId === issue.id && styles.selected]}>
        <View
          style={{ position: 'absolute', left: labelWidth, width: track.width, height: rowHeight }}
        >
          {grid()}
          {span
            ? bar(
                span,
                `Open interval for ${issue.identifier}, ${dates}${span.inferred ? ', start inferred from creation' : ''}`,
                open,
              )
            : null}
        </View>
        <View
          style={[
            styles.label,
            { width: labelWidth, height: rowHeight, transform: [{ translateX: offset }] },
            selectedId === issue.id && styles.selected,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open ${issue.identifier}, ${issue.title}, ${dates}${span?.inferred ? ', start inferred from creation' : ''}`}
            onPress={open}
            style={styles.issue}
          >
            <Text style={styles.meta}>
              {issue.identifier}
              {span?.inferred ? ' · Created' : ''}
            </Text>
            <Text numberOfLines={2} style={styles.title}>
              {issue.title}
            </Text>
            <Text numberOfLines={1} style={styles.meta}>
              {dates}
            </Text>
          </Pressable>
          {onActions ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Actions for ${issue.identifier}`}
              onPress={() => onActions(issue.id)}
              style={styles.actions}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  };
  return (
    <View
      style={styles.fill}
      onLayout={(event) => setViewport(Math.max(240, event.nativeEvent.layout.width))}
    >
      <View style={styles.controls}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tools}>
            {(['week', 'month', 'quarter'] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityLabel={`Timeline scale: ${value}`}
                accessibilityState={{ selected: value === scale }}
                onPress={() => zoom(value)}
                style={[styles.control, value === scale && styles.selected]}
              >
                <Text style={styles.controlText}>{value[0].toUpperCase() + value.slice(1)}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go to today in timeline"
              onPress={() => go(track.today)}
              style={styles.control}
            >
              <Text style={styles.controlText}>Today</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDate(ordinalDate(track.start + Math.floor(offset / track.dayWidth)));
                setJump(true);
              }}
              style={styles.control}
            >
              <Text style={styles.controlText}>Go to date</Text>
            </Pressable>
          </View>
        </ScrollView>
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={styles.hint}>
            {notice}
          </Text>
        ) : null}
        {hasInferredStart ? (
          <Text style={styles.hint}>Dashed intervals start from the task’s creation date.</Text>
        ) : null}
      </View>
      <ScrollView
        ref={horizontal}
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        style={styles.fill}
        contentContainerStyle={{ minWidth: '100%' }}
        contentOffset={{ x: scroll.current.timelineX ?? 0, y: 0 }}
        onScroll={(event) => {
          const x = event.nativeEvent.contentOffset.x;
          scroll.current.timelineX = x;
          setOffset(x);
        }}
        scrollEventThrottle={32}
      >
        <FlatList<TimelineRow>
          nestedScrollEnabled
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          style={{ width: labelWidth + track.width }}
          data={rows}
          keyExtractor={(item) => item.key}
          extraData={{ offset, selectedId, scale, collapsed }}
          stickyHeaderIndices={[0]}
          initialNumToRender={12}
          windowSize={5}
          contentContainerStyle={{ paddingBottom: 110 }}
          contentOffset={{ x: 0, y: scroll.current.timelineY ?? 0 }}
          onScroll={(event) => {
            scroll.current.timelineY = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={100}
          ListHeaderComponent={
            <View style={[styles.axis, { height: headerHeight }]}>
              <View
                style={{
                  position: 'absolute',
                  left: labelWidth,
                  width: track.width,
                  height: headerHeight,
                }}
              >
                {grid()}
                {axis.months.map((month) => (
                  <Text
                    key={month.label}
                    numberOfLines={1}
                    style={[
                      styles.month,
                      { left: month.left, top: 7 * textScale, width: month.width },
                    ]}
                  >
                    {month.label}
                  </Text>
                ))}
                {axis.days
                  .filter((day) => day.number)
                  .map((day) => (
                    <Text
                      key={day.index}
                      style={[
                        styles.day,
                        {
                          left: day.index * track.dayWidth,
                          top: 34 * textScale,
                          width: Math.max(28, track.dayWidth),
                        },
                      ]}
                    >
                      {day.number}
                    </Text>
                  ))}
              </View>
              <View
                style={[
                  styles.label,
                  { width: labelWidth, height: headerHeight, transform: [{ translateX: offset }] },
                ]}
              >
                <Text accessibilityRole="header" style={styles.group}>
                  Issue
                </Text>
                <Text style={styles.meta}>Interval</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={{ width: viewport }}>
              <EmptyState
                title="No matching issues"
                detail="Clear a filter or choose another status."
              />
            </View>
          }
          ListFooterComponent={
            !issues.length && rows.length ? (
              <View style={{ width: viewport }}>
                <EmptyState
                  title="No matching issues"
                  detail="Clear a filter or choose another status."
                />
              </View>
            ) : null
          }
          renderItem={renderRow}
        />
      </ScrollView>
      {jump ? (
        <NativeSheet title="Go to date" visible onClose={() => setJump(false)}>
          <DateField label="Timeline date" value={date} onChange={setDate} />
          <Text style={styles.hint}>
            Dates outside the loaded task range move to the nearest edge.
          </Text>
          <Action
            label="Show date"
            disabled={dayOrdinal(date) === null}
            onPress={() => {
              const day = dayOrdinal(date);
              if (day !== null) {
                go(day);
                setJump(false);
              }
            }}
          />
        </NativeSheet>
      ) : null}
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    fill: { flex: 1 },
    controls: { paddingHorizontal: 16, paddingVertical: 8, gap: 6 },
    tools: { flexDirection: 'row', gap: 4 },
    control: {
      minWidth: 48,
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    controlText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
    hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginVertical: 6 },
    row: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
    selected: { backgroundColor: colors.accentSoft },
    label: {
      position: 'absolute',
      left: 0,
      top: 0,
      zIndex: 2,
      backgroundColor: colors.canvas,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.line,
      padding: 12,
      justifyContent: 'center',
    },
    issue: { minHeight: 48, justifyContent: 'center', gap: 3, paddingRight: 18 },
    title: { color: colors.ink, fontSize: 15, lineHeight: 21 },
    meta: { color: colors.muted, fontSize: 11, lineHeight: 16 },
    group: { color: colors.ink, fontSize: 14, fontWeight: '600', flexShrink: 1 },
    groupTitle: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    actions: {
      position: 'absolute',
      right: 0,
      top: 0,
      minWidth: 48,
      minHeight: 48,
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingRight: 8,
    },
    gridLine: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      width: StyleSheet.hairlineWidth,
      backgroundColor: colors.line,
    },
    todayLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.muted },
    barTouch: { position: 'absolute', top: 0, justifyContent: 'center' },
    bar: { height: 22, borderRadius: 5, backgroundColor: colors.ink },
    inferred: {
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.ink,
      backgroundColor: colors.accentSoft,
    },
    aggregate: { height: 8, borderRadius: 2, backgroundColor: colors.muted },
    axis: {
      backgroundColor: colors.canvas,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    month: { position: 'absolute', top: 7, color: colors.ink, fontSize: 12, paddingHorizontal: 4 },
    day: { position: 'absolute', top: 34, color: colors.muted, fontSize: 11, textAlign: 'center' },
  });
