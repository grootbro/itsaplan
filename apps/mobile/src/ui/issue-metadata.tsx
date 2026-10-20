import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Priority } from '@/lib/types';
import { useColors, useThemedStyles, type Palette } from './theme';

export function IssueStatus({ name, color }: { name: string; color?: string }) {
  const colors = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 }}>
      <View
        style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color || colors.muted }}
      />
      <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 21, flexShrink: 1 }}>{name}</Text>
    </View>
  );
}

export function IssuePriority({ value }: { value: Priority }) {
  const colors = useColors();
  const color = value ? colors[value] : colors.muted;
  const label = value ? value[0].toUpperCase() + value.slice(1) : 'No priority';
  const bars = { high: 3, medium: 2, low: 1 };
  let icon: ReactNode = <Ionicons name="remove-outline" size={16} color={color} />;
  if (value === 'urgent') icon = <Ionicons name="warning-outline" size={16} color={color} />;
  else if (value)
    icon = (
      <View
        accessibilityElementsHidden
        style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, width: 16, height: 15 }}
      >
        {[0, 1, 2].map((bar) => (
          <View
            key={bar}
            style={{
              width: 4,
              height: 5 + bar * 4,
              borderRadius: 1,
              backgroundColor: bar < bars[value] ? color : colors.line,
            }}
          />
        ))}
      </View>
    );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 }}>
      {icon}
      <Text style={{ color: colors.ink, fontSize: 14, lineHeight: 21, flexShrink: 1 }}>
        {label}
      </Text>
    </View>
  );
}

export function IssueProperty({
  label,
  children,
  onPress,
}: {
  label: string;
  children: ReactNode;
  onPress?: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityHint={onPress ? `Change ${label.toLowerCase()}` : undefined}
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.value, pressed && { backgroundColor: colors.accentSoft }]}
      >
        <View style={{ flex: 1, minWidth: 0 }}>{children}</View>
        {onPress ? <Ionicons name="chevron-down" size={14} color={colors.muted} /> : null}
      </Pressable>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
    label: { width: '30%', color: colors.muted, fontSize: 14, lineHeight: 21 },
    value: {
      flex: 1,
      minWidth: 0,
      minHeight: 48,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 9,
    },
  });
