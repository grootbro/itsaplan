import { Text, View } from 'react-native';
import type { PlanningEntry, PlanningKind } from '@/lib/planning-model';
import { IssuePriority } from './issue-metadata';
import { useColors } from './theme';

export function PlanningSummary({ entry, kind }: { entry: PlanningEntry; kind: PlanningKind }) {
  const colors = useColors();
  const date = (value: string | null) => value?.slice(0, 10) ?? 'Not set';
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 21 }}>
          {entry.status[0]?.toUpperCase()}
          {entry.status.slice(1)}
        </Text>
        {kind === 'initiatives' ? <IssuePriority value={entry.priority} /> : null}
      </View>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
        Start {date(entry.startDate)} · {kind === 'cycles' ? 'End' : 'Target'}{' '}
        {date(entry.targetDate)}
      </Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21 }}>
        {entry.progress.completed} completed · {entry.progress.canceled} canceled ·{' '}
        {entry.progress.total} total
      </Text>
    </View>
  );
}
