import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

// This exercises guarded button navigation only; native gestures require device acceptance.
const guards = new Set<(action: () => void) => void>();
const guarded = (action: () => void) => {
  const guard = [...guards].at(-1);
  if (guard) guard(action);
  else action();
};
export function usePreventRemove(
  enabled: boolean,
  callback: (event: { data: { action: () => void } }) => void,
) {
  useEffect(() => {
    if (!enabled) return;
    const guard = (action: () => void) => callback({ data: { action } });
    guards.add(guard);
    return () => {
      guards.delete(guard);
    };
  }, [enabled, callback]);
}
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
window.addEventListener('popstate', notify);
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const useLocation = () => useSyncExternalStore(subscribe, () => window.location.href);
function navigate(
  target: string | { pathname: string; params: Record<string, string> },
  replace = false,
) {
  const update = (url: string) =>
    replace ? window.history.replaceState(null, '', url) : window.history.pushState(null, '', url);
  if (typeof target === 'string') update(target);
  else {
    const params = { ...target.params };
    const path = target.pathname.replace(/\[(\w+)\]/g, (_, name: string) => {
      const value = params[name];
      delete params[name];
      return encodeURIComponent(value);
    });
    update(`${path}?${new URLSearchParams(params)}`);
  }
  notify();
}
export const router = {
  push: navigate,
  replace: (target: Parameters<typeof navigate>[0]) => navigate(target, true),
  back: () => guarded(() => window.history.back()),
  setParams: (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    window.history.replaceState(null, '', url);
    notify();
  },
};
export const useRouter = () => router;
const navigation = { setOptions: () => {}, dispatch: (action: () => void) => action() };
export const useNavigation = () => navigation;
export function useLocalSearchParams() {
  const url = new URL(useLocation());
  const parts = url.pathname.split('/');
  const route =
    parts[1] === 'planning-detail'
      ? { kind: parts[2], id: parts[3] }
      : { key: decodeURIComponent(parts[2] ?? 'alpha.PLAN'), id: parts[2] };
  return { ...Object.fromEntries(url.searchParams), ...route };
}
export const API_URL = `${window.location.origin}/api`;
const session = { data: { user: { id: 'fixture-user', name: 'Fixture user' } } };
export const authClient = { useSession: () => session, getCookie: async () => '' };
export const getItemAsync = async (key: string) => window.localStorage.getItem(key);
export const setItemAsync = async (key: string, value: string) =>
  window.localStorage.setItem(key, value);
export const deleteItemAsync = async (key: string) => window.localStorage.removeItem(key);
export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
export const SafeAreaView = View;
export const notificationAsync = async () => {};
export const NotificationFeedbackType = { Success: 'success' };
export const openURL = async (url: string) => window.open(url, '_blank', 'noopener');
declare global {
  interface Window {
    fixtureFiles?: { uri: string; name: string; mimeType?: string; size?: number }[];
  }
}
export const getDocumentAsync = async () =>
  window.fixtureFiles?.length
    ? { canceled: false, assets: window.fixtureFiles }
    : { canceled: true };
// Browser fixture adapter for RN's native URI descriptor. This does not validate iOS multipart.
const BrowserFormData = window.FormData;
class FixtureFormData extends BrowserFormData {
  append(
    name: string,
    value: string | Blob | { uri: string; name: string; type: string },
    filename?: string,
  ) {
    if (typeof value === 'object' && 'uri' in value)
      super.append(name, new Blob(['fixture file'], { type: value.type }), value.name);
    else if (value instanceof Blob && filename !== undefined) super.append(name, value, filename);
    else super.append(name, value as string | Blob);
  }
}
window.FormData = FixtureFormData;
export class File {}
export const fetch = window.fetch.bind(window);
export function Ionicons({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <Text aria-hidden style={{ fontFamily: 'Ionicons', fontSize: size, color }}>
      {String.fromCodePoint((glyphs as Record<string, number>)[name] ?? 0)}
    </Text>
  );
}
export default function DateTimePicker() {
  return <View />;
}
export function SafeAreaProvider({ children }: { children: ReactNode }) {
  return children;
}
