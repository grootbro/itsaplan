import { Ionicons } from '@expo/vector-icons';
import { useMemo, type ReactNode } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import type { MarkedToken, Token, Tokens } from 'marked';
import { API_URL } from '@/lib/auth';
import { markdownTokens, markdownUrl, markdownTextValue } from '@/lib/markdown';
import { useThemedStyles, type Palette } from './theme';

export function MarkdownText({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  const tokens = useMemo(() => markdownTokens(children), [children]);
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open link', 'Please try again.');
    }
  };
  const inline = (items: Token[], depth = 0): ReactNode =>
    items.map((item, index) => {
      const token = item as MarkedToken;
      if (depth > 24) return <Text key={index}>{token.raw}</Text>;
      switch (token.type) {
        case 'strong':
          return (
            <Text key={index} style={styles.strong}>
              {inline(token.tokens, depth + 1)}
            </Text>
          );
        case 'em':
          return (
            <Text key={index} style={styles.em}>
              {inline(token.tokens, depth + 1)}
            </Text>
          );
        case 'del':
          return (
            <Text key={index} style={styles.deleted}>
              {inline(token.tokens, depth + 1)}
            </Text>
          );
        case 'codespan':
          return (
            <Text key={index} style={styles.inlineCode}>
              {token.text}
            </Text>
          );
        case 'br':
          return '\n';
        case 'link':
        case 'image': {
          const url = markdownUrl(token.href, API_URL);
          const label =
            token.type === 'image'
              ? markdownTextValue(token.text) || 'Image attachment'
              : inline(token.tokens, depth + 1);
          return (
            <Text
              key={index}
              accessibilityRole={url ? 'link' : undefined}
              onPress={url ? () => void open(url) : undefined}
              style={url ? styles.link : undefined}
            >
              {label}
            </Text>
          );
        }
        case 'text':
          return token.tokens ? (
            <Text key={index}>{inline(token.tokens, depth + 1)}</Text>
          ) : (
            markdownTextValue(token.text)
          );
        case 'escape':
          return token.text;
        case 'html':
          return token.text;
        default:
          return token.raw;
      }
    });
  const blocks = (items: Token[], depth = 0): ReactNode =>
    items.map((item, index) => {
      const token = item as MarkedToken;
      if (depth > 24)
        return (
          <Text key={index} selectable style={styles.body}>
            {token.raw}
          </Text>
        );
      switch (token.type) {
        case 'space':
        case 'def':
          return null;
        case 'heading':
          return (
            <Text
              key={index}
              accessibilityRole="header"
              selectable
              style={[styles.heading, token.depth <= 2 ? styles.largeHeading : styles.smallHeading]}
            >
              {inline(token.tokens)}
            </Text>
          );
        case 'paragraph':
        case 'text':
          return (
            <Text key={index} selectable style={styles.body}>
              {token.tokens ? inline(token.tokens) : markdownTextValue(token.text)}
            </Text>
          );
        case 'code':
          return (
            <View key={index} style={styles.codeBlock}>
              {token.lang ? <Text style={styles.codeLanguage}>{token.lang}</Text> : null}
              <ScrollView horizontal>
                <Text selectable style={styles.code}>
                  {token.text}
                </Text>
              </ScrollView>
            </View>
          );
        case 'blockquote':
          return (
            <View key={index} style={styles.quote}>
              {blocks(token.tokens, depth + 1)}
            </View>
          );
        case 'list':
          return (
            <View key={index} style={styles.list}>
              {token.items.map((row, rowIndex) => {
                let marker: ReactNode = <Text style={styles.marker}>•</Text>;
                if (token.ordered)
                  marker = <Text style={styles.marker}>{Number(token.start) + rowIndex}.</Text>;
                if (row.task)
                  marker = (
                    <Ionicons
                      accessibilityLabel={row.checked ? 'Completed' : 'Not completed'}
                      name={row.checked ? 'checkbox-outline' : 'square-outline'}
                      size={18}
                      style={styles.taskMarker}
                    />
                  );
                return (
                  <View key={rowIndex} style={styles.listRow}>
                    {marker}
                    <View style={styles.listContent}>{blocks(row.tokens, depth + 1)}</View>
                  </View>
                );
              })}
            </View>
          );
        case 'hr':
          return <View key={index} style={styles.rule} />;
        case 'table': {
          const cells = (row: Tokens.TableCell[], header: boolean) =>
            row.map((cell, cellIndex) => (
              <View key={cellIndex} style={[styles.cell, header && styles.tableHeader]}>
                <Text
                  selectable
                  style={[
                    styles.tableText,
                    header && styles.strong,
                    { textAlign: cell.align ?? 'left' },
                  ]}
                >
                  {inline(cell.tokens)}
                </Text>
              </View>
            ));
          return (
            <ScrollView key={index} horizontal style={styles.table}>
              <View>
                <View style={styles.tableRow}>{cells(token.header, true)}</View>
                {token.rows.map((row, rowIndex) => (
                  <View key={rowIndex} style={styles.tableRow}>
                    {cells(row, false)}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }
        default:
          return (
            <Text key={index} selectable style={styles.body}>
              {inline([token])}
            </Text>
          );
      }
    });
  return <View style={styles.document}>{blocks(tokens)}</View>;
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    document: { gap: 12, minWidth: 0 },
    body: { color: colors.ink, fontSize: 16, lineHeight: 26 },
    strong: { fontWeight: '600' },
    em: { fontStyle: 'italic' },
    deleted: { textDecorationLine: 'line-through' },
    link: { color: colors.ink, textDecorationLine: 'underline' },
    heading: { color: colors.ink, fontWeight: '600', marginTop: 8 },
    largeHeading: { fontSize: 22, lineHeight: 29 },
    smallHeading: { fontSize: 18, lineHeight: 25 },
    inlineCode: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      backgroundColor: colors.accentSoft,
      fontSize: 14,
    },
    codeBlock: { backgroundColor: colors.accentSoft, borderRadius: 10, padding: 16, gap: 8 },
    code: {
      color: colors.ink,
      fontSize: 13,
      lineHeight: 21,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    codeLanguage: { color: colors.muted, fontSize: 12 },
    quote: { backgroundColor: colors.accentSoft, borderRadius: 10, padding: 16, gap: 10 },
    list: { gap: 6 },
    listRow: { flexDirection: 'row', gap: 8 },
    marker: { color: colors.muted, fontSize: 16, lineHeight: 26, minWidth: 22, textAlign: 'right' },
    taskMarker: { color: colors.muted, width: 22, marginTop: 4 },
    listContent: { flex: 1, minWidth: 0, gap: 6 },
    rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 10 },
    table: { flexGrow: 0 },
    tableRow: { flexDirection: 'row' },
    cell: {
      width: 180,
      padding: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    tableHeader: { backgroundColor: colors.accentSoft },
    tableText: { color: colors.ink, fontSize: 14, lineHeight: 22 },
  });
