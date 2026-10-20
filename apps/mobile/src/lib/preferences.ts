export type ThemePreference = 'system' | 'light' | 'dark';
export type StartScreen = 'projects' | 'my-work' | 'inbox';
export interface Preferences {
  theme: ThemePreference;
  startScreen: StartScreen;
  haptics: boolean;
}
export const defaultPreferences: Preferences = {
  theme: 'system',
  startScreen: 'projects',
  haptics: true,
};

export function parsePreferences(raw: string | null): Preferences {
  if (!raw) return defaultPreferences;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object') return defaultPreferences;
    return {
      theme: ['system', 'light', 'dark'].includes(value.theme) ? value.theme : 'system',
      startScreen: ['projects', 'my-work', 'inbox'].includes(value.startScreen)
        ? value.startScreen
        : 'projects',
      haptics: typeof value.haptics === 'boolean' ? value.haptics : true,
    };
  } catch {
    return defaultPreferences;
  }
}
