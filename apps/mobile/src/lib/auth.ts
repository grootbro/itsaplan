import { expoClient } from '@better-auth/expo/client';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type { BetterAuthClientPlugin } from 'better-auth/client';
import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

export const API_URL = Constants.expoConfig?.extra?.apiUrl as string;

// Expo 1.6.27 and core expose incompatible generic fetch declarations.
// Preserve native actions while matching core's callback signature; runtime is unchanged.
type ExpoPlugin = ReturnType<typeof expoClient>;
type CompatibleExpoPlugin = Omit<ExpoPlugin, 'getActions'> & {
  getActions: (
    ...args: Parameters<NonNullable<BetterAuthClientPlugin['getActions']>>
  ) => ReturnType<ExpoPlugin['getActions']>;
};

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    usernameClient(),
    expoClient({
      scheme: 'itsaplan',
      storagePrefix: 'itsaplan',
      storage: SecureStore,
    }) as CompatibleExpoPlugin,
  ],
});
