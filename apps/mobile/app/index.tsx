import { Redirect } from 'expo-router';
import { authClient } from '@/lib/auth';
import { Loading } from '@/ui/primitives';

export default function Index() {
  const { data, isPending } = authClient.useSession();
  if (isPending) return <Loading />;
  return <Redirect href={data?.user ? '/(tabs)/projects' : '/login'} />;
}
