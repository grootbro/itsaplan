import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';

interface Scope {
  projectKey: string | null;
  selectProject: (key: string) => void;
  clearProject: () => void;
  inboxAll: boolean;
  setInboxAll: (all: boolean) => void;
  storageError: string | null;
}
const Context = createContext<Scope | null>(null);

export function ProjectScopeProvider({ children }: { children: ReactNode }) {
  const [projectKey, setProjectKey] = useState<string | null>(null);
  const [inboxAll, setInboxAllState] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const projectRevision = useRef(0);
  const inboxRevision = useRef(0);
  const writes = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let current = true;
    const projectVersion = projectRevision.current;
    const inboxVersion = inboxRevision.current;
    void Promise.all([
      SecureStore.getItemAsync('last-project'),
      SecureStore.getItemAsync('inbox-all'),
    ])
      .then(([key, all]) => {
        if (!current) return;
        if (projectRevision.current === projectVersion) setProjectKey(key);
        if (inboxRevision.current === inboxVersion && all !== null)
          setInboxAllState(all === 'true');
      })
      .catch(() => {
        if (current) setStorageError('Your saved project preferences could not be loaded.');
      });
    return () => {
      current = false;
    };
  }, []);
  const persist = useCallback((operation: () => Promise<void>) => {
    writes.current = writes.current.then(operation).catch(() => {
      setStorageError('Your project preferences could not be saved on this device.');
    });
  }, []);
  const selectProject = useCallback(
    (key: string) => {
      projectRevision.current += 1;
      setProjectKey(key);
      persist(() => SecureStore.setItemAsync('last-project', key));
    },
    [persist],
  );
  const setInboxAll = useCallback(
    (all: boolean) => {
      inboxRevision.current += 1;
      setInboxAllState(all);
      persist(() => SecureStore.setItemAsync('inbox-all', String(all)));
    },
    [persist],
  );
  const clearProject = useCallback(() => {
    projectRevision.current += 1;
    inboxRevision.current += 1;
    setProjectKey(null);
    setInboxAllState(true);
    persist(async () => {
      await Promise.all([
        SecureStore.deleteItemAsync('last-project'),
        SecureStore.deleteItemAsync('inbox-all'),
      ]);
    });
  }, [persist]);
  const value = useMemo<Scope>(
    () => ({ projectKey, selectProject, clearProject, inboxAll, setInboxAll, storageError }),
    [projectKey, selectProject, clearProject, inboxAll, setInboxAll, storageError],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useProjectScope() {
  const value = useContext(Context);
  if (!value) throw new Error('ProjectScopeProvider is missing');
  return value;
}
