import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import {
  defaultProjectDisplay,
  parseProjectDisplay,
  projectDisplayKey,
  type ProjectDisplay,
} from './project-display';

const writes = new Map<string, Promise<void>>();

export function useProjectDisplay(userId: string, projectKey: string) {
  const client = useQueryClient();
  const queryKey = ['project-display', userId, projectKey];
  const storageKey = projectDisplayKey(userId, projectKey);
  const query = useQuery({
    queryKey,
    enabled: !!userId && !!projectKey,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    queryFn: async () => parseProjectDisplay(await SecureStore.getItemAsync(storageKey)),
  });
  const errorKey = ['project-display-error', userId, projectKey];
  const error = useQuery({
    queryKey: errorKey,
    queryFn: () => null as string | null,
    initialData: null as string | null,
    staleTime: Infinity,
  });
  const change = (patch: Partial<ProjectDisplay>) => {
    if (query.isPending) return;
    const current = client.getQueryData<ProjectDisplay>(queryKey) ?? defaultProjectDisplay();
    const next = { ...current, ...patch };
    client.setQueryData(queryKey, next);
    const previous = writes.get(storageKey) ?? Promise.resolve();
    const operation = previous.then(async () => {
      try {
        await SecureStore.setItemAsync(storageKey, JSON.stringify(next));
        client.setQueryData(errorKey, null);
      } catch {
        client.setQueryData(errorKey, 'Changes apply now, but could not be saved on this device.');
      }
    });
    writes.set(storageKey, operation);
    void operation.finally(() => {
      if (writes.get(storageKey) === operation) writes.delete(storageKey);
    });
  };
  return {
    state: query.data ?? defaultProjectDisplay(),
    change,
    isPending: query.isPending,
    error:
      error.data ??
      (query.isError
        ? 'Saved display settings could not be loaded. Choose your settings again to retry.'
        : null),
  };
}
