import type { ConfigContext, ExpoConfig } from 'expo/config';

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  return {
    ...config,
    name: "It's a Plan",
    slug: 'plan',
    owner: 'ravefox',
    scheme: 'itsaplan',
    icon: './assets/icon.png',
    version: '1.0.0',
    orientation: 'default',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
      requireFullScreen: false,
      buildNumber: '7',
      ...(process.env.IOS_BUNDLE_IDENTIFIER
        ? { bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER }
        : {}),
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
    },
    plugins: ['expo-router', 'expo-secure-store'],
    extra: {
      ...config.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://plan-api.sekta.work',
      eas: { projectId: process.env.EAS_PROJECT_ID ?? 'c0ae89bb-ba6e-4400-877f-2970832536e0' },
    },
  };
}
