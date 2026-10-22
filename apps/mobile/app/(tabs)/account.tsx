import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth';
import { useProjectScope } from '@/lib/project-scope';
import { usePreferences } from '@/lib/preferences-context';
import type { StartScreen, ThemePreference } from '@/lib/preferences';
import { ScreenTitle } from '@/ui/primitives';
import { useColors, useThemedStyles, type Palette } from '@/ui/theme';
import { Choices, NativeSheet, Notice } from '@/ui/work-controls';

const themes = { system: 'System', light: 'Light', dark: 'Dark' };
const screens = { projects: 'Projects', 'my-work': 'My work', inbox: 'Inbox' };

function SettingRow({
  title,
  value,
  onPress,
}: {
  title: string;
  value?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}: ${value}` : title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.accentSoft }]}
    >
      <Text style={styles.rowTitle}>{title}</Text>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function Account() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const { clearProject, storageError } = useProjectScope();
  const { preferences, update, error } = usePreferences();
  const { data } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'theme' | 'start' | null>(null);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message ?? 'Please try again.');
      queryClient.clear();
      clearProject();
    } catch (err) {
      Alert.alert(
        'Could not sign out',
        err instanceof Error ? err.message : 'Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { width: '100%', maxWidth: 820, alignSelf: 'center' },
      ]}
    >
      <ScreenTitle title="You" />
      {storageError ? <Notice message={storageError} /> : null}
      {error ? <Notice message={error} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        onPress={() => router.push('/profile')}
        style={styles.profile}
      >
        <View style={styles.avatar}>
          <Text style={styles.initial}>{data?.user.name?.slice(0, 1).toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{data?.user.name}</Text>
          <Text style={styles.email}>{data?.user.email}</Text>
          <Text style={styles.edit}>Edit profile</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>

      <Text accessibilityRole="header" style={styles.section}>
        Your app
      </Text>
      <SettingRow
        title="Appearance"
        value={themes[preferences.theme]}
        onPress={() => setSheet('theme')}
      />
      <SettingRow
        title="Open app to"
        value={screens[preferences.startScreen]}
        onPress={() => setSheet('start')}
      />
      <View style={styles.row}>
        <View style={styles.identity}>
          <Text style={styles.rowTitle}>Haptic feedback</Text>
          <Text style={styles.hint}>A subtle response when work is saved</Text>
        </View>
        <Switch
          accessibilityLabel="Haptic feedback"
          value={preferences.haptics}
          onValueChange={(haptics) => update({ haptics })}
          trackColor={{ false: colors.line, true: colors.accent }}
          thumbColor={preferences.haptics ? colors.onAccent : colors.muted}
        />
      </View>
      <Text style={styles.note}>
        Appearance, start screen and haptics are saved on this device.
      </Text>

      <Text accessibilityRole="header" style={styles.section}>
        Account
      </Text>
      <SettingRow title="Change password" onPress={() => router.push('/change-password')} />
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        accessibilityState={{ disabled: busy, busy }}
        style={styles.row}
        onPress={() =>
          Alert.alert('Sign out?', 'You will need to sign in again to access your workspace.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
          ])
        }
      >
        <Text style={styles.signOut}>{busy ? 'Signing out…' : 'Sign out'}</Text>
      </Pressable>
      <Text style={styles.version}>
        It's a Plan · {Constants.expoConfig?.version ?? '1.0.0'} (
        {Constants.expoConfig?.ios?.buildNumber ?? 'Preview'})
      </Text>
      <NativeSheet
        title={sheet === 'theme' ? 'Appearance' : 'Start screen'}
        visible={sheet !== null}
        onClose={() => setSheet(null)}
      >
        {sheet === 'theme' ? (
          <>
            <Text style={styles.sheetHint}>Choose a theme or follow your device appearance.</Text>
            <Choices<ThemePreference>
              label="Theme"
              value={preferences.theme}
              options={[
                { value: 'system', label: 'System' },
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
              ]}
              onChange={(theme) => update({ theme })}
            />
          </>
        ) : (
          <>
            <Text style={styles.sheetHint}>Choose the screen you see when you launch the app.</Text>
            <Choices<StartScreen>
              label="Start screen"
              value={preferences.startScreen}
              options={[
                { value: 'projects', label: 'Projects' },
                { value: 'my-work', label: 'My work' },
                { value: 'inbox', label: 'Inbox' },
              ]}
              onChange={(startScreen) => update({ startScreen })}
            />
          </>
        )}
      </NativeSheet>
    </ScrollView>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    content: { paddingBottom: 40 },
    profile: {
      backgroundColor: colors.surface,
      paddingHorizontal: 22,
      paddingVertical: 20,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    identity: { flex: 1 },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    initial: { color: colors.ink, fontSize: 23, fontWeight: '700' },
    name: { color: colors.ink, fontSize: 19, fontWeight: '600' },
    email: { color: colors.muted, fontSize: 14, marginTop: 4 },
    edit: { color: colors.ink, fontSize: 14, marginTop: 8 },
    section: {
      color: colors.ink,
      fontSize: 18,
      fontWeight: '600',
      marginTop: 32,
      marginBottom: 12,
      marginHorizontal: 22,
    },
    row: {
      backgroundColor: colors.surface,
      paddingHorizontal: 22,
      paddingVertical: 15,
      minHeight: 56,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    rowTitle: { color: colors.ink, fontSize: 16, flexShrink: 1 },
    value: { color: colors.muted, fontSize: 15, marginLeft: 'auto', flexShrink: 1 },
    hint: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
    note: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 12,
      marginHorizontal: 22,
    },
    sheetHint: { color: colors.muted, fontSize: 16, lineHeight: 24, marginBottom: 24 },
    signOut: { color: colors.danger, fontSize: 16 },
    version: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 32 },
  });
