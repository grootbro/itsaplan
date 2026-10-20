import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { authClient } from '@/lib/auth';
import { Action, Field } from '@/ui/primitives';
import { useColors } from '@/ui/theme';

export default function ChangePassword() {
  const colors = useColors();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = password === confirmation;
  async function save() {
    if (busy || !current || password.length < 8 || !matches) return;
    setBusy(true);
    try {
      const result = await authClient.changePassword({
        currentPassword: current,
        newPassword: password,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message ?? 'Please try again.');
      setCurrent('');
      setPassword('');
      setConfirmation('');
      Alert.alert('Password changed', 'Your other sessions have been signed out.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert(
        'Could not change password',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ padding: 22, width: '100%', maxWidth: 640, alignSelf: 'center' }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 23, marginBottom: 24 }}>
        Use at least 8 characters. Changing your password also signs out your other sessions.
      </Text>
      <Field
        label="Current password"
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        editable={!busy}
        autoCapitalize="none"
      />
      <Field
        label="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!busy}
        autoCapitalize="none"
      />
      <Field
        label="Confirm new password"
        value={confirmation}
        onChangeText={setConfirmation}
        secureTextEntry
        editable={!busy}
        autoCapitalize="none"
      />
      {confirmation && !matches ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.danger, marginBottom: 18 }}>
          Passwords do not match.
        </Text>
      ) : null}
      <Action
        label={busy ? 'Changing…' : 'Change password'}
        disabled={busy || !current || password.length < 8 || !confirmation || !matches}
        onPress={() => void save()}
      />
    </ScrollView>
  );
}
