import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth';
import { useProjectScope } from '@/lib/project-scope';
import { ScreenTitle } from '@/ui/primitives';
import { colors } from '@/ui/theme';
import { Notice } from '@/ui/work-controls';

export default function Account() {
  const queryClient = useQueryClient();
  const { clearProject, storageError } = useProjectScope();
  const { data } = authClient.useSession();

  const [busy, setBusy] = useState(false);

  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        Alert.alert('Could not sign out', result.error.message);
        return;
      }
      queryClient.clear();
      clearProject();
    } catch (error) {
      Alert.alert(
        'Could not sign out',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenTitle title="You" />
      {storageError ? <Notice message={storageError} /> : null}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.initial}>{data?.user.name?.slice(0, 1).toUpperCase() ?? '?'}</Text>
        </View>
        <View>
          <Text style={styles.name}>{data?.user.name}</Text>
          <Text style={styles.email}>{data?.user.email}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        accessibilityState={{ disabled: busy, busy }}
        onPress={() => void signOut()}
        style={styles.row}
      >
        <Text style={styles.signOut}>{busy ? 'Signing out…' : 'Sign out'}</Text>
      </Pressable>
      <Text style={styles.version}>It's a Plan · Preview</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  profile: {
    backgroundColor: colors.surface,
    paddingHorizontal: 22,
    paddingVertical: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: colors.accent, fontSize: 19, fontWeight: '800' },
  name: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  email: { color: colors.muted, fontSize: 13, marginTop: 3 },
  row: {
    backgroundColor: colors.surface,
    padding: 22,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 20,
  },
  signOut: { color: colors.danger, fontSize: 15, fontWeight: '700' },
  version: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 32,
  },
});
