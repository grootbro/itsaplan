import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from './theme';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search issues',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.search}>
      <Ionicons name="search-outline" size={20} color={colors.muted} />
      <TextInput
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChange}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        style={styles.input}
      />
      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={() => onChange('')}
          style={styles.iconButton}
        >
          <Ionicons name="close-circle" size={20} color={colors.muted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Choices<T extends string | number | null>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.choices}
      >
        {options.map((option) => (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{ selected: value === option.value }}
            onPress={() => onChange(option.value)}
            style={[styles.choice, value === option.value && styles.selected]}
          >
            <Text style={[styles.choiceText, value === option.value && styles.selectedText]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function NativeSheet({
  title,
  visible,
  onClose,
  children,
}: {
  title: string;
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text accessibilityRole="header" style={styles.sheetTitle}>
            {title}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.sheetContent}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export function Notice({
  message,
  action = 'Retry',
  onPress,
}: {
  message: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.notice}>
      <Text accessibilityLiveRegion="polite" style={styles.noticeText}>
        {message}
      </Text>
      {onPress ? (
        <Pressable accessibilityRole="button" onPress={onPress} style={styles.done}>
          <Text style={styles.doneText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const workStyles = StyleSheet.create({
  section: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 10,
    backgroundColor: colors.canvas,
  },
  sectionTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  toolbar: { paddingHorizontal: 22, paddingBottom: 12, gap: 12 },
  textButton: {
    minHeight: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: colors.ink, fontSize: 15, fontWeight: '600' },
});

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    paddingLeft: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, minHeight: 48, color: colors.ink, fontSize: 17, paddingVertical: 10 },
  iconButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  choiceGroup: { gap: 8, marginBottom: 20 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '600' },
  choices: { gap: 8 },
  choice: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
  },
  selected: { backgroundColor: colors.ink },
  choiceText: { color: colors.ink, fontSize: 15 },
  selectedText: { color: '#FFFFFF', fontWeight: '600' },
  sheet: { flex: 1, backgroundColor: colors.canvas },
  sheetHeader: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    gap: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.ink },
  done: { minHeight: 48, paddingHorizontal: 12, justifyContent: 'center' },
  doneText: { color: colors.ink, fontSize: 16, fontWeight: '600' },
  sheetContent: { padding: 22, paddingBottom: 40 },
  notice: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  noticeText: { flex: 1, color: colors.muted, fontSize: 14, lineHeight: 21 },
});
