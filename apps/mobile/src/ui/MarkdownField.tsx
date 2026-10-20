import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Field } from './primitives';
import { MarkdownText } from './MarkdownText';
import { useThemedStyles, type Palette } from './theme';

export function MarkdownField({
  value,
  onChangeText,
  placeholder,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  const styles = useThemedStyles(createStyles);
  const [preview, setPreview] = useState(false);
  return (
    <View style={styles.field}>
      <View style={styles.toolbar}>
        <Text style={styles.hint}>Markdown supported</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={preview ? 'Write description' : 'Preview description'}
          accessibilityState={{ selected: preview }}
          onPress={() => setPreview(!preview)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{preview ? 'Write' : 'Preview'}</Text>
        </Pressable>
      </View>
      {preview ? (
        <View style={styles.preview}>
          <Text style={styles.label}>Description preview</Text>
          {value.trim() ? (
            <MarkdownText>{value}</MarkdownText>
          ) : (
            <Text style={styles.hint}>No description yet.</Text>
          )}
        </View>
      ) : (
        <Field
          label="Description"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline
        />
      )}
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    field: { marginBottom: 12 },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    hint: { color: colors.muted, fontSize: 13, lineHeight: 20, flexShrink: 1 },
    button: { minWidth: 64, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    buttonText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
    label: { color: colors.muted, fontSize: 13, marginBottom: 14 },
    preview: { minHeight: 160, padding: 16, borderRadius: 12, backgroundColor: colors.surface },
  });
