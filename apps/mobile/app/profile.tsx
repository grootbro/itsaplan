import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text } from 'react-native';
import { authClient } from '@/lib/auth';
import { Action, Field } from '@/ui/primitives';
import { useColors } from '@/ui/theme';

export default function Profile() {
  const colors = useColors();
  const { data } = authClient.useSession();
  const [name, setName] = useState(data?.user.name ?? '');
  const [busy, setBusy] = useState(false);
  async function save() {
    if (busy || !name.trim()) return;
    setBusy(true);
    try {
      const result = await authClient.updateUser({ name: name.trim() });
      if (result.error) throw new Error(result.error.message ?? 'Please try again.');
      router.back();
    } catch (error) {
      Alert.alert(
        'Could not update profile',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ padding: 22 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Field label="Name" value={name} onChangeText={setName} editable={!busy} />
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 24 }}>
        Your name is shared across the workspace. Your email is {data?.user.email}.
      </Text>
      <Action
        label={busy ? 'Saving…' : 'Save profile'}
        disabled={busy || !name.trim() || name.trim() === data?.user.name}
        onPress={() => void save()}
      />
    </ScrollView>
  );
}
