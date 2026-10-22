import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { timeEntry } from '@/lib/collaboration';
import type { Worklog } from '@/lib/types';
import { Action, Field } from './primitives';
import { DateField } from './DateField';
import { useThemedStyles, type Palette } from './theme';

export function WorklogForm({
  initial,
  pending,
  onSubmit,
}: {
  initial?: Worklog;
  pending: boolean;
  onSubmit: (body: { minutes: number; spentOn: string; note: string | null }) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const [hours, setHours] = useState(initial ? String(Math.floor(initial.minutes / 60)) : '0');
  const [minutes, setMinutes] = useState(initial ? String(initial.minutes % 60) : '');
  const [spentOn, setSpentOn] = useState(initial?.spentOn ?? new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(initial?.note ?? '');
  const body = timeEntry(hours, minutes, spentOn, note);
  return (
    <View>
      <Field
        label="Hours"
        value={hours}
        onChangeText={setHours}
        keyboardType="number-pad"
        editable={!pending}
      />
      <Field
        label="Minutes"
        value={minutes}
        onChangeText={setMinutes}
        placeholder="0–59"
        keyboardType="number-pad"
        editable={!pending}
      />
      <DateField
        disabled={pending}
        label="Date worked (UTC)"
        value={spentOn}
        onChange={setSpentOn}
      />
      <Text style={styles.label}>Note</Text>
      <TextInput
        accessibilityLabel="Time entry note"
        maxLength={500}
        value={note}
        onChangeText={setNote}
        multiline
        editable={!pending}
        style={styles.note}
      />
      {!body ? (
        <Text accessibilityLiveRegion="polite" style={styles.hint}>
          Enter whole hours and 0–59 minutes, with a total above zero and a date up to today in UTC.
        </Text>
      ) : null}
      <Action
        label={pending ? 'Saving…' : initial ? 'Save time entry' : 'Log time'}
        disabled={pending || !body}
        onPress={() => {
          if (body && !pending) onSubmit(body);
        }}
      />
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    label: { color: colors.ink, fontSize: 15, fontWeight: '600', marginBottom: 8 },
    note: {
      color: colors.ink,
      fontSize: 17,
      lineHeight: 25,
      backgroundColor: colors.surface,
      borderRadius: 12,
      minHeight: 96,
      padding: 16,
      marginBottom: 20,
      textAlignVertical: 'top',
    },
    hint: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  });
