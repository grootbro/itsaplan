import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { useThemedStyles, useColors, useTheme, type Palette } from './theme';

export function ScreenTitle({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.heading}>
      <View style={{ flex: 1 }}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function EmptyState({ title, detail }: { title: string; detail?: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

export function Loading() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.empty}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function Action({
  label,
  onPress,
  muted = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  muted?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.action, muted && styles.mutedAction, disabled && { opacity: 0.5 }]}
    >
      <Text style={[styles.actionText, muted && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  autoCapitalize = 'sentences',
  keyboardType = 'default',
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
}) {
  const colors = useColors();
  const { dark } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardAppearance={dark ? 'dark' : 'light'}
        selectionColor={colors.accent}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        editable={editable}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        style={[styles.input, multiline && { minHeight: 120, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 22,
      paddingTop: 30,
      paddingBottom: 24,
      gap: 12,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: '500',
      marginTop: 6,
    },
    title: { color: colors.ink, fontSize: 34, fontWeight: '700', letterSpacing: -0.8 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36, minHeight: 220 },
    emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    detail: {
      color: colors.muted,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 8,
      textAlign: 'center',
    },
    action: {
      backgroundColor: colors.accent,
      borderRadius: 14,
      minHeight: 48,
      paddingHorizontal: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mutedAction: { backgroundColor: colors.accentSoft },
    actionText: { color: colors.onAccent, fontSize: 15, fontWeight: '700' },
    field: { gap: 8, marginBottom: 18 },
    label: { color: colors.ink, fontSize: 13, fontWeight: '700' },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 13,
      fontSize: 16,
      color: colors.ink,
    },
  });
