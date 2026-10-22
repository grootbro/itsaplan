import { useLocalSearchParams } from 'expo-router';
import { IssueDetailPanel } from '@/ui/IssueDetailPanel';

export default function IssueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <IssueDetailPanel key={id} issueId={Number(id)} />;
}
