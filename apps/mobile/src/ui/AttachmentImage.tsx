import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { attachmentUrl } from '@/lib/attachments';
import { API_URL } from '@/lib/auth';
import { useColors, useThemedStyles, type Palette } from './theme';

export function AttachmentImage({ source, label }: { source: string; label: string }) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const url = attachmentUrl(source, API_URL);
  const open = async () => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open image', 'Please try again.');
    }
  };
  if (!url) return <Text style={styles.label}>{label}</Text>;
  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Open image: ${label}`}
        onPress={() => void open()}
      >
        {state !== 'error' ? (
          <Image
            accessibilityLabel={label}
            source={{ uri: url }}
            resizeMode="contain"
            style={styles.image}
            onLoad={() => setState('ready')}
            onError={() => setState('error')}
          />
        ) : null}
        {state === 'loading' ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.muted} />
          </View>
        ) : null}
        {state === 'error' ? (
          <Text style={styles.fallback}>Preview unavailable · Open {label}</Text>
        ) : null}
      </Pressable>
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: {
      marginVertical: 12,
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: 'hidden',
    },
    image: { width: '100%', height: 240 },
    loading: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallback: { color: colors.ink, fontSize: 15, lineHeight: 22, padding: 16, minHeight: 48 },
    label: { color: colors.muted, fontSize: 14 },
  });
