import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeSheet, SearchInput } from './work-controls';
import { useColors, useThemedStyles, type Palette } from './theme';

export function SelectionField<T extends string | number | null>({
  label,
  selected,
  options,
  onSelect,
  multiple = false,
  disabled = false,
}: {
  label: string;
  selected: readonly T[];
  options: readonly { value: T; label: string }[];
  onSelect: (value: T) => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const choices = [
    ...options,
    ...selected
      .filter((value) => !options.some((option) => option.value === value))
      .map((value) => ({ value, label: 'Unavailable selection' })),
  ];
  const matches = choices.filter((option) =>
    option.label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const names = selected.map(
    (value) => options.find((option) => option.value === value)?.label ?? 'Unavailable selection',
  );
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${names.join(', ') || 'None'}`}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => {
          setSearch('');
          setOpen(true);
        }}
        style={[styles.field, disabled && styles.disabled]}
      >
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{names.join(', ') || 'None'}</Text>
        <Ionicons name="chevron-forward" size={17} color={colors.muted} />
      </Pressable>
      <NativeSheet visible={open} title={label} onClose={() => setOpen(false)}>
        {options.length > 8 ? (
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Search ${label.toLowerCase()}`}
          />
        ) : null}
        {!matches.length ? <Text style={styles.hint}>No matching options.</Text> : null}
        {matches.slice(0, 100).map((option) => {
          const checked = selected.includes(option.value);
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityLabel={option.label}
              accessibilityState={{ checked, disabled }}
              disabled={disabled}
              onPress={() => {
                onSelect(option.value);
                if (!multiple) setOpen(false);
              }}
              style={styles.option}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              {checked ? <Ionicons name="checkmark" size={21} color={colors.ink} /> : null}
            </Pressable>
          );
        })}
        {matches.length > 100 ? (
          <Text style={styles.hint}>Showing 100 options. Search to narrow the results.</Text>
        ) : null}
      </NativeSheet>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    field: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    label: { color: colors.muted, fontSize: 15, flex: 1 },
    value: { color: colors.ink, fontSize: 16, flex: 2, textAlign: 'right' },
    disabled: { opacity: 0.6 },
    option: {
      minHeight: 52,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    optionText: { color: colors.ink, fontSize: 17, flex: 1 },
    hint: { color: colors.muted, fontSize: 14, lineHeight: 22, marginVertical: 18 },
  });
