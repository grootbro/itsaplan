import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function DateField({
  label,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : new Date();

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled}
          accessibilityLabel={`${label}: ${value || 'Not set'}`}
          onPress={() => setOpen((current) => !current)}
          style={styles.choice}
        >
          <Text style={styles.value}>{value || 'Set date'}</Text>
        </Pressable>
        {value ? (
          <Pressable
            accessibilityRole="button"
            style={styles.clearButton}
            disabled={disabled}
            accessibilityLabel={`Clear ${label}`}
            onPress={() => {
              onChange('');
              setOpen(false);
            }}
          >
            <Text style={styles.clear}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      {open && !disabled ? (
        <DateTimePicker
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          value={Number.isNaN(selected.getTime()) ? new Date() : selected}
          onChange={(event, date) => {
            if (event.type === 'set' && date) onChange(localDate(date));
            if (Platform.OS !== 'ios') setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 18, gap: 8 },
  label: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  choice: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  value: { color: colors.ink, fontSize: 16 },
  clearButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  clear: { color: colors.accent, fontSize: 13, fontWeight: '700', padding: 10 },
});
