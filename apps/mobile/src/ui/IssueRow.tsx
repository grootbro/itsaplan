import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Issue } from '@/lib/types';
import { localDay } from '@/lib/issue-list';
import { useColors, useThemedStyles, type Palette } from './theme';

export function IssueRow({
  issue,
  onPress,
  selected = false,
  onLongPress,
  onActions,
  state,
  stateType,
  stateColor,
  assignee,
}: {
  issue: Pick<Issue, 'identifier' | 'title' | 'priority' | 'dueDate'>;
  onPress: () => void;
  selected?: boolean;
  onLongPress?: () => void;
  onActions?: () => void;
  state?: string;
  stateType?: string;
  stateColor?: string;
  assignee?: string;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const date = issue.dueDate?.slice(0, 10);
  const overdue =
    date && stateType && !['completed', 'canceled'].includes(stateType) && date < localDay();
  const dueLabel = date === localDay() ? 'Due today' : `Due ${date}`;
  return (
    <View style={[styles.row, selected && { backgroundColor: colors.accentSoft }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={[
          issue.identifier,
          issue.title,
          state,
          issue.priority ? `${issue.priority} priority` : null,
          date ? `${overdue ? 'Overdue, ' : ''}${dueLabel}` : null,
          assignee ? `Assigned to ${assignee}` : null,
        ]
          .filter(Boolean)
          .join(', ')}
        accessibilityHint={onLongPress ? 'Opens issue. Hold for quick actions.' : 'Opens issue'}
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <View style={styles.top}>
          <Text style={styles.identifier}>{issue.identifier}</Text>
          {state ? (
            <View style={styles.status}>
              <View style={[styles.dot, { backgroundColor: stateColor ?? colors.muted }]} />
              <Text numberOfLines={1} style={styles.meta}>
                {state}
              </Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.title} numberOfLines={3}>
          {issue.title}
        </Text>
        {issue.priority || date || assignee ? (
          <View style={styles.bottom}>
            {issue.priority ? (
              <Text style={[styles.priority, { color: colors[issue.priority] }]}>
                {issue.priority[0].toUpperCase() + issue.priority.slice(1)}
              </Text>
            ) : null}
            {date ? <Text style={[styles.meta, overdue && styles.overdue]}>{dueLabel}</Text> : null}
            {assignee ? (
              <Text style={styles.meta} numberOfLines={1}>
                {assignee}
              </Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>
      {onActions ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Actions for ${issue.identifier}`}
          onPress={onActions}
          style={styles.actions}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      backgroundColor: colors.canvas,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    main: { flex: 1, paddingHorizontal: 22, paddingVertical: 17, minHeight: 80 },
    pressed: { backgroundColor: colors.accentSoft },
    top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 7 },
    identifier: { color: colors.muted, fontSize: 13, fontWeight: '600' },
    status: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    dot: { height: 7, width: 7, borderRadius: 4 },
    title: { color: colors.ink, fontSize: 17, fontWeight: '500', lineHeight: 25 },
    bottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 9 },
    priority: { fontSize: 13, fontWeight: '600' },
    meta: { color: colors.muted, fontSize: 13, lineHeight: 19 },
    overdue: { color: colors.danger },
    actions: {
      minWidth: 48,
      minHeight: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
  });
