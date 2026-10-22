import { Redirect } from 'expo-router';
import { authClient } from '@/lib/auth';
import { usePreferences } from '@/lib/preferences-context';
import { Loading } from '@/ui/primitives';

export default function Index() {
  const { preferences, ready } = usePreferences();
  const { data, isPending } = authClient.useSession();
  if (!ready || isPending) return <Loading />;
  return <Redirect href={data?.user ? `/(tabs)/${preferences.startScreen}` : '/login'} />;
}
