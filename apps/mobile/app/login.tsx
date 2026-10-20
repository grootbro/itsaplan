import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { authClient } from '@/lib/auth';
import { Action, Field } from '@/ui/primitives';
import { useThemedStyles, type Palette } from '@/ui/theme';

export default function Login() {
  const styles = useThemedStyles(createStyles);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!identifier.trim() || !password) return;
    setBusy(true);
    try {
      const value = identifier.trim();
      const result = value.includes('@')
        ? await authClient.signIn.email({ email: value, password })
        : await authClient.signIn.username({ username: value, password });
      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      Alert.alert(
        'Could not sign in',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.mark}>
          <Text style={styles.markText}>✓</Text>
        </View>
        <Text style={styles.brand}>It’s a Plan</Text>
        <Text style={styles.subtitle}>Your work, wherever you are.</Text>
        <View style={styles.form}>
          <Field
            label="Email or username"
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="you@company.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry />
          <Action
            label={busy ? 'Signing in…' : 'Sign in'}
            onPress={submit}
            disabled={busy || !identifier.trim() || !password}
          />
        </View>
        <Text style={styles.foot}>Use the same account as your workspace.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.canvas },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 30,
      width: '100%',
      maxWidth: 480,
      alignSelf: 'center',
    },
    mark: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor: colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 26,
    },
    markText: { color: colors.onAccent, fontSize: 34, fontWeight: '800' },
    brand: { color: colors.ink, fontSize: 40, letterSpacing: -2, fontWeight: '800' },
    subtitle: { color: colors.muted, fontSize: 16, marginTop: 8 },
    form: { marginTop: 48 },
    foot: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 30 },
  });
