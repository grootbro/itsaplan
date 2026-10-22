import { useSyncExternalStore, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import glyphs from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
window.addEventListener('popstate', notify);
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const useLocation = () => useSyncExternalStore(subscribe, () => window.location.href);
function navigate(target: string | { pathname: string; params: Record<string, string> }) {
  if (typeof target === 'string') window.history.pushState(null, '', target);
  else {
    const params = { ...target.params };
    const path = target.pathname.replace(/\[(\w+)\]/g, (_, name: string) => {
      const value = params[name];
      delete params[name];
      return encodeURIComponent(value);
    });
    window.history.pushState(null, '', `${path}?${new URLSearchParams(params)}`);
  }
  notify();
}
export const router = {
  push: navigate,
  replace: navigate,
  back: () => window.history.back(),
  setParams: (params: Record<string, string>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    window.history.replaceState(null, '', url);
    notify();
  },
};
export const useRouter = () => router;
const navigation = { setOptions: () => {} };
export const useNavigation = () => navigation;
export function useLocalSearchParams() {
  const url = new URL(useLocation());
  const parts = url.pathname.split('/');
  return {
    ...Object.fromEntries(url.searchParams),
    key: decodeURIComponent(parts[2] ?? 'alpha.PLAN'),
    id: parts[2],
  };
}
export const API_URL = `${window.location.origin}/api`;
const session = { data: { user: { id: 'fixture-user', name: 'Fixture user' } } };
export const authClient = { useSession: () => session, getCookie: async () => '' };
export const getItemAsync = async (key: string) => window.localStorage.getItem(key);
export const setItemAsync = async (key: string, value: string) =>
  window.localStorage.setItem(key, value);
export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });
export const SafeAreaView = View;
export const notificationAsync = async () => {};
export const NotificationFeedbackType = { Success: 'success' };
export const openURL = async (url: string) => window.open(url, '_blank', 'noopener');
export const getDocumentAsync = async () => ({ canceled: true });
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
