import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { worklistLayout } from '@/lib/adaptive-layout';
import { useColors } from './theme';
import { IssueDetailPanel } from './IssueDetailPanel';

export function useIssueWorkspace() {
  const router = useRouter();
  const window = useWindowDimensions();
  const [width, setWidth] = useState(window.width);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const layout = worklistLayout(width, window.fontScale);
  return {
    ...layout,
    selectedId,
    measure: (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width),
    open: (id: number) => {
      if (layout.split || selectedId !== null) setSelectedId(id);
      else router.push(`/issue/${id}`);
    },
    close: () => setSelectedId(null),
  };
}

export function IssueWorkspace({
  workspace,
  children,
}: {
  workspace: ReturnType<typeof useIssueWorkspace>;
  children: ReactNode;
}) {
  const colors = useColors();
  const router = useRouter();
  const { split, listWidth, selectedId } = workspace;
  return (
    <View
      onLayout={workspace.measure}
      style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.canvas }}
    >
      <View
        style={{
          width: split ? listWidth : '100%',
          flex: split ? undefined : 1,
          display: !split && selectedId !== null ? 'none' : 'flex',
          minWidth: 0,
        }}
      >
        {children}
      </View>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          display: split || selectedId !== null ? 'flex' : 'none',
          borderLeftWidth: split ? 1 : 0,
          borderLeftColor: colors.line,
        }}
      >
        {selectedId !== null ? (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.line,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={split ? 'Close issue' : 'Back to list'}
                onPress={workspace.close}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={split ? 'close-outline' : 'chevron-back'}
                  size={24}
                  color={colors.ink}
                />
              </Pressable>
              <Text style={{ flex: 1, color: colors.muted, fontSize: 15 }}>
                {split ? 'Issue' : 'Back to list'}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open issue in full screen"
                onPress={() => router.push(`/issue/${selectedId}`)}
                style={{
                  minWidth: 48,
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="expand-outline" size={21} color={colors.ink} />
              </Pressable>
            </View>
            <IssueDetailPanel
              key={selectedId}
              issueId={selectedId}
              embedded
              onOpenIssue={workspace.open}
            />
          </>
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 40,
              gap: 12,
            }}
          >
            <Ionicons name="document-text-outline" size={40} color={colors.muted} />
            <Text
              style={{ color: colors.ink, fontSize: 22, fontWeight: '600', textAlign: 'center' }}
            >
              Select an issue
            </Text>
            <Text
              style={{
                color: colors.muted,
                fontSize: 16,
                lineHeight: 24,
                maxWidth: 280,
                textAlign: 'center',
              }}
            >
              Keep your list in view while you review details and work on an issue.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
