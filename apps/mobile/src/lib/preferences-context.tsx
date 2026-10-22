import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Haptics from 'expo-haptics';
import { defaultPreferences, parsePreferences, type Preferences } from './preferences';

const Context = createContext<{
  preferences: Preferences;
  ready: boolean;
  error: string | null;
  update: (patch: Partial<Preferences>) => void;
} | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(defaultPreferences);
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void SecureStore.getItemAsync('device-preferences')
      .then((raw) => {
        if (!active) return;
        latest.current = parsePreferences(raw);
        setPreferences(latest.current);
      })
      .catch(() => {
        if (active) setError('Saved settings could not be loaded. You can choose them again.');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  function update(patch: Partial<Preferences>) {
    if (!ready) return;
    const next = { ...latest.current, ...patch };
    latest.current = next;
    setPreferences(next);
    writes.current = writes.current.then(async () => {
      try {
        await SecureStore.setItemAsync('device-preferences', JSON.stringify(next));
        setError(null);
      } catch {
        setError('Settings apply now, but could not be saved. Choose them again to retry.');
      }
    });
  }
  return (
    <Context.Provider value={{ preferences, ready, error, update }}>{children}</Context.Provider>
  );
}

export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error('PreferencesProvider is missing');
  return context;
}

export function useSuccessHaptic() {
  const { preferences } = usePreferences();
  return () => {
    if (preferences.haptics)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };
}
