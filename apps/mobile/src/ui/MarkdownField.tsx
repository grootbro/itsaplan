import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  editMarkdown,
  insertMarkdown,
  type MarkdownCommand,
  type TextSelection,
} from '@/lib/markdown-edit';
import { IssueAttachments } from './IssueAttachments';
import { NativeSheet } from './work-controls';
import { MarkdownText } from './MarkdownText';
import { useColors, useThemedStyles, type Palette } from './theme';

const commands: { value: MarkdownCommand; label: string; title: string }[] = [
  { value: 'bold', label: 'B', title: 'Bold' },
  { value: 'italic', label: 'I', title: 'Italic' },
  { value: 'heading', label: 'H', title: 'Heading' },
  { value: 'bullet', label: 'List', title: 'Bullet list' },
  { value: 'task', label: 'To-do', title: 'Task list' },
  { value: 'quote', label: 'Quote', title: 'Quote' },
  { value: 'code', label: 'Code', title: 'Inline code' },
];

export function MarkdownField({
  value,
  onChangeText,
  placeholder,
  editable = true,
  label = 'Description',
  issueId,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  editable?: boolean;
  label?: string;
  issueId?: number;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const input = useRef<TextInput>(null);
  const selection = useRef<TextSelection>({ start: 0, end: 0 });
  const [uploading, setUploading] = useState(false);
  const [attachments, setAttachments] = useState(false);
  const [preview, setPreview] = useState(false);
  const format = (command: MarkdownCommand) => {
    if (!editable) return;
    const next = editMarkdown(value, selection.current, command);
    if (next.text.length > 50_000) return;
    onChangeText(next.text);
    selection.current = next.selection;
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setNativeProps({ selection: next.selection });
    });
  };
  return (
    <View style={styles.field}>
      <View style={styles.toolbar}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            preview ? `Write ${label.toLowerCase()}` : `Preview ${label.toLowerCase()}`
          }
          accessibilityState={{ selected: preview }}
          onPress={() => setPreview(!preview)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{preview ? 'Write' : 'Preview'}</Text>
        </Pressable>
      </View>
      {preview ? (
        <View style={styles.preview}>
          {value.trim() ? (
            <MarkdownText>{value}</MarkdownText>
          ) : (
            <Text style={styles.hint}>Nothing to preview yet.</Text>
          )}
        </View>
      ) : (
        <View style={styles.editor}>
          <TextInput
            ref={input}
            accessibilityLabel={label}
            value={value}
            onChangeText={onChangeText}
            onSelectionChange={(event) => {
              selection.current = event.nativeEvent.selection;
            }}
            editable={editable}
            multiline
            maxLength={50_000}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            selectionColor={colors.accent}
            style={styles.input}
          />
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            {commands.map((command) => (
              <Pressable
                key={command.value}
                accessibilityRole="button"
                accessibilityLabel={command.title}
                accessibilityState={{ disabled: !editable }}
                disabled={!editable}
                onPress={() => format(command.value)}
                style={[styles.button, !editable && styles.disabled]}
              >
                <Text style={[styles.buttonText, command.value === 'italic' && styles.italic]}>
                  {command.label}
                </Text>
              </Pressable>
            ))}
            {issueId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Insert attachment"
                disabled={!editable}
                onPress={() => setAttachments(true)}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Attach</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      )}
      {attachments && issueId ? (
        <NativeSheet
          title="Insert attachment"
          visible
          onClose={() => {
            if (!uploading) setAttachments(false);
          }}
        >
          <IssueAttachments
            issueId={issueId}
            canUpload={editable}
            canDelete={false}
            onBusyChange={setUploading}
            onInsert={(markdown) => {
              if (!editable) return;
              const next = insertMarkdown(
                value,
                selection.current,
                `
${markdown}
`,
              );
              if (next.text.length > 50_000) return;
              onChangeText(next.text);
              selection.current = next.selection;
              setAttachments(false);
              setPreview(false);
            }}
          />
        </NativeSheet>
      ) : null}
      <Text style={styles.hint}>Markdown supported · Select text to format it</Text>
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    field: { marginBottom: 20 },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    label: { color: colors.muted, fontSize: 14, flexShrink: 1 },
    hint: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
    button: {
      minWidth: 48,
      minHeight: 48,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
    italic: { fontStyle: 'italic' },
    disabled: { opacity: 0.5 },
    editor: { borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden' },
    input: {
      color: colors.ink,
      padding: 16,
      minHeight: 170,
      fontSize: 17,
      lineHeight: 25,
      textAlignVertical: 'top',
    },
    preview: { minHeight: 170, padding: 16, borderRadius: 12, backgroundColor: colors.surface },
  });
