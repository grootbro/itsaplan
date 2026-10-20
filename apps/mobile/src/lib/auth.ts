import { expoClient } from '@better-auth/expo/client';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

export const API_URL = Constants.expoConfig?.extra?.apiUrl as string;

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    usernameClient(),
    expoClient({
      scheme: 'itsaplan',
      storagePrefix: 'itsaplan',
      storage: SecureStore,
    }),
  ],
});
