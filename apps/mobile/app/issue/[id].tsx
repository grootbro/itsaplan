import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useMemo, useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '@/lib/api';
import { API_URL, authClient } from '@/lib/auth';
import { EmptyState, Loading } from '@/ui/primitives';
import { useColors, useThemedStyles, type Palette } from '@/ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IssueDiscussion } from '@/ui/IssueDiscussion';
import { IssueChecklists } from '@/ui/IssueChecklists';
import { IssueWorklogs } from '@/ui/IssueWorklogs';
import { Notice } from '@/ui/work-controls';

export default function IssueDetail() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const issueId = Number(id);
  const router = useRouter();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: session } = authClient.useSession();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const positions = useRef<Record<string, number>>({});
  const issue = useQuery({
    queryKey: ['issue', issueId],
    queryFn: () => api.issue(issueId),
    enabled: Number.isSafeInteger(issueId) && issueId > 0,
  });
  const projects = useQuery({ queryKey: ['projects'], queryFn: api.projects });
  const project = projects.data?.find((project) => project.id === issue.data?.projectId);
  const board = useQuery({
    queryKey: ['board', project?.key],
    queryFn: () => api.board(project!.key),
    enabled: !!project?.key,
  });
  const attachments = useQuery({
    queryKey: ['attachments', issueId],
    queryFn: () => api.attachments(issueId),
    enabled: Number.isSafeInteger(issueId) && issueId > 0,
  });
  const upload = useMutation({
    mutationFn: (uri: string) => api.uploadAttachment(issueId, uri),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['attachments', issueId],
      }),
    onError: (error) => Alert.alert('Could not upload file', error.message),
  });
  const removeAttachment = useMutation({
    mutationFn: api.deleteAttachment,
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: ['attachments', issueId],
      }),
    onError: (error) => Alert.alert('Could not delete file', error.message),
  });
  const pickAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) upload.mutate(result.assets[0].uri);
    } catch (error) {
      Alert.alert('Could not select file', error instanceof Error ? error.message : 'Try again.');
    }
  };
  const openAttachment = async (url: string) => {
    try {
      await Linking.openURL(`${API_URL}${url}`);
    } catch (error) {
      Alert.alert('Could not open file', error instanceof Error ? error.message : 'Try again.');
    }
  };
  const currentState = board.data?.columns.find((column) => column.id === issue.data?.columnId);
  const states = useMemo(
    () => [...(board.data?.columns ?? [])].sort((a, b) => a.position - b.position),
    [board.data],
  );
  const update = useMutation({
    mutationFn: (patch: Parameters<typeof api.updateIssue>[1]) => api.updateIssue(issueId, patch),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
        queryClient.invalidateQueries({ queryKey: ['issues', project?.key] }),
        queryClient.invalidateQueries({ queryKey: ['assigned'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
      ]);
    },
    onError: (error) => Alert.alert('Could not update issue', error.message),
  });
  const watch = useMutation({
    mutationFn: (enabled: boolean) => api.watchIssue(issueId, enabled),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
    onError: (error) => Alert.alert('Could not update subscription', error.message),
  });
  const archive = useMutation({
    mutationFn: (subtasks?: 'cascade' | 'detach') => api.archiveIssue(issueId, subtasks),
    onSuccess: () =>
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
        queryClient.invalidateQueries({ queryKey: ['issues', project?.key] }),
        queryClient.invalidateQueries({ queryKey: ['assigned'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
        queryClient.invalidateQueries({
          queryKey: ['archived-issues', project?.key],
        }),
      ]),
    onError: (error) => Alert.alert('Could not archive issue', error.message),
  });
  const restore = useMutation({
    mutationFn: () => api.restoreIssue(issueId),
    onSuccess: () =>
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
        queryClient.invalidateQueries({ queryKey: ['issues', project?.key] }),
        queryClient.invalidateQueries({ queryKey: ['assigned'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
        queryClient.invalidateQueries({
          queryKey: ['archived-issues', project?.key],
        }),
      ]),
    onError: (error) => Alert.alert('Could not restore issue', error.message),
  });

  const unlink = useMutation({
    mutationFn: (linkId: number) => api.unlinkIssue(issueId, linkId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issue'] }),
        queryClient.invalidateQueries({ queryKey: ['issues'] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]),
    onError: (error) => Alert.alert('Could not remove link', error.message),
  });

  useEffect(() => {
    navigation.setOptions({ title: issue.data?.identifier ?? 'Issue' });
  }, [issue.data?.identifier, navigation]);

  if (!Number.isSafeInteger(issueId) || issueId <= 0) return <EmptyState title="Invalid issue" />;
  if (issue.isPending) return <Loading />;
  if (!issue.data)
    return (
      <EmptyState
        title="Issue unavailable"
        detail="It may have been removed or you may not have access."
      />
    );

  const canManage = board.data?.permissions?.work_items?.edit;
  const canEdit = canManage && !issue.data.archivedAt;
  const watching = issue.data.watchers.some((member) => member.userId === session?.user?.id);
  const confirmArchive = () => {
    if (issue.data.subtasks.length) {
      Alert.alert('Archive issue', 'What should happen to its subtasks?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Keep subtasks active',
          onPress: () => archive.mutate('detach'),
        },
        {
          text: 'Archive all',
          style: 'destructive',
          onPress: () => archive.mutate('cascade'),
        },
      ]);
    } else {
      Alert.alert('Archive issue?', issue.data.identifier, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => archive.mutate(undefined),
        },
      ]);
    }
  };
  const canReadChecklists =
    board.data?.project.checklistsEnabled && board.data?.permissions?.work_items?.read;
  const canEditChecklists =
    canReadChecklists && board.data?.permissions?.work_items?.edit && !issue.data.archivedAt;

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
      >
        {issue.isError ? (
          <Notice message="Could not refresh issue." onPress={() => void issue.refetch()} />
        ) : null}
        {board.isError || projects.isError ? (
          <Notice
            message="Project settings could not be loaded. Editing controls are unavailable until permissions load."
            onPress={() => void Promise.all([projects.refetch(), board.refetch()])}
          />
        ) : null}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 16 }}
        >
          {[
            ['details', 'Details'],
            ...(canReadChecklists ? [['checklists', 'Checklists']] : []),
            ...(board.data?.project.timeLoggingEnabled ? [['time', 'Time']] : []),
            ['discussion', 'Discussion'],
          ].map(([section, label]) => (
            <Pressable
              key={section}
              accessibilityRole="button"
              style={styles.sectionButton}
              onPress={() => {
                const y = positions.current[section];
                if (y !== undefined)
                  scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: false });
              }}
            >
              <Text style={styles.editLabel}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View
          onLayout={(event) => {
            positions.current.details = event.nativeEvent.layout.y;
          }}
        />
        <Text style={styles.identifier}>
          {issue.data.identifier} · {project?.name ?? 'Project'}
        </Text>
        <Text style={styles.title}>{issue.data.title}</Text>
        {issue.data.archivedAt ? <Text style={styles.archivedNotice}>Archived issue</Text> : null}
        <View style={styles.actions}>
          {session?.user ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: watching }}
              disabled={watch.isPending}
              onPress={() => watch.mutate(!watching)}
              style={styles.editButton}
            >
              <Ionicons
                name={watching ? 'notifications' : 'notifications-outline'}
                size={17}
                color={colors.accent}
              />
              <Text style={styles.editLabel}>{watching ? 'Following' : 'Follow'}</Text>
            </Pressable>
          ) : null}
          {canManage ? (
            issue.data.archivedAt ? (
              <Pressable
                accessibilityRole="button"
                disabled={restore.isPending}
                onPress={() => restore.mutate()}
                style={styles.editButton}
              >
                <Ionicons name="arrow-undo-outline" size={17} color={colors.accent} />
                <Text style={styles.editLabel}>Restore</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={archive.isPending}
                onPress={confirmArchive}
                style={styles.editButton}
              >
                <Ionicons name="archive-outline" size={17} color={colors.accent} />
                <Text style={styles.editLabel}>Archive</Text>
              </Pressable>
            )
          ) : null}
        </View>
        {canEdit ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/edit-issue/${issueId}`)}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={17} color={colors.accent} />
            <Text style={styles.editLabel}>Edit issue</Text>
          </Pressable>
        ) : null}
        <View style={styles.metaLine}>
          <Text style={styles.stateName}>{currentState?.name ?? 'State'}</Text>
          {issue.data.typeId ? (
            <Text style={styles.date}>
              {board.data?.issueTypes.find((type) => type.id === issue.data.typeId)?.name}
            </Text>
          ) : null}
          {issue.data.priority ? <Text style={styles.priority}>{issue.data.priority}</Text> : null}
          {issue.data.startDate ? (
            <Text style={styles.date}>Starts {issue.data.startDate}</Text>
          ) : null}
          {issue.data.dueDate ? <Text style={styles.date}>Due {issue.data.dueDate}</Text> : null}
          {issue.data.estimatePoints != null ? (
            <Text style={styles.date}>{issue.data.estimatePoints} pt</Text>
          ) : null}
          {issue.data.cycle ? (
            <Text style={styles.date}>Cycle · {issue.data.cycle.name}</Text>
          ) : null}
          {issue.data.initiative ? (
            <Text style={styles.date}>Initiative · {issue.data.initiative.title}</Text>
          ) : null}
        </View>
        {issue.data.labelIds.length ? (
          <View style={styles.labels}>
            {issue.data.labelIds.map((id) => {
              const label = board.data?.labels.find((item) => item.id === id);
              return label ? (
                <Text key={id} style={styles.labelPill}>
                  {label.name}
                </Text>
              ) : null;
            })}
          </View>
        ) : null}
        {issue.data.description ? (
          <Text style={styles.description}>{issue.data.description}</Text>
        ) : canEdit ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/edit-issue/${issueId}`)}
          >
            <Text style={styles.descriptionPrompt}>Add a description</Text>
          </Pressable>
        ) : null}
        {issue.data.fields.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details</Text>
            {issue.data.fields.map((field) => {
              const definition = board.data?.customFields.find((item) => item.id === field.fieldId);
              const selectedOptions = field.optionIds
                .map((id) => definition?.options.find((option) => option.id === id)?.value)
                .filter(Boolean)
                .join(', ');
              const memberName =
                field.fieldType === 'member'
                  ? board.data?.assignees.find((person) => person.userId === field.value)?.name
                  : null;
              const value =
                selectedOptions ||
                memberName ||
                (typeof field.value === 'boolean'
                  ? field.value
                    ? 'Yes'
                    : 'No'
                  : field.value == null
                    ? ''
                    : String(field.value));
              const editable =
                canEdit &&
                [
                  'text',
                  'markdown',
                  'url',
                  'number',
                  'boolean',
                  'date',
                  'select',
                  'multi_select',
                  'member',
                ].includes(field.fieldType);
              if (!value && !editable) return null;
              return (
                <Pressable
                  key={field.fieldId}
                  accessibilityRole={editable ? 'button' : undefined}
                  disabled={!editable}
                  onPress={() =>
                    router.push({
                      pathname: '/edit-field/[issueId]/[fieldId]',
                      params: {
                        issueId: String(issueId),
                        fieldId: String(field.fieldId),
                      },
                    })
                  }
                  style={styles.fieldRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldName}>{field.name}</Text>
                    <Text style={[styles.fieldValue, !value && styles.emptyField]}>
                      {value || 'Not set'}
                      {field.valueEnd ? ` – ${field.valueEnd}` : ''}
                    </Text>
                  </View>
                  {editable ? (
                    <Ionicons name="chevron-forward" size={17} color={colors.muted} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
        {canEdit ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Move to</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {states.map((state) => (
                <Pressable
                  key={state.id}
                  disabled={update.isPending}
                  onPress={() => update.mutate({ columnId: state.id })}
                  style={[styles.pill, state.id === issue.data?.columnId && styles.pillActive]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      state.id === issue.data?.columnId && styles.pillTextActive,
                    ]}
                  >
                    {state.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        {issue.data.links.length || canEdit ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Linked issues</Text>
              {canEdit ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push(`/link-issue/${issueId}`)}
                >
                  <Text style={styles.linkAction}>Add link</Text>
                </Pressable>
              ) : null}
            </View>
            {issue.data.links.length
              ? issue.data.links.map((link) => (
                  <View key={link.id} style={styles.related}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${link.kind.replaceAll('_', ' ')}, ${link.issue.identifier}, ${link.issue.title}`}
                      style={styles.attachmentLink}
                      onPress={() => router.push(`/issue/${link.issue.id}`)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.relatedId}>
                          {link.kind.replaceAll('_', ' ')} · {link.issue.identifier}
                        </Text>
                        <Text style={styles.relatedTitle}>{link.issue.title}</Text>
                      </View>
                    </Pressable>
                    {canEdit ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove link to ${link.issue.identifier}`}
                        style={styles.iconButton}
                        disabled={unlink.isPending}
                        onPress={() =>
                          Alert.alert(
                            'Remove this link?',
                            'The related issue will remain unchanged.',
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Remove link',
                                style: 'destructive',
                                onPress: () => unlink.mutate(link.id),
                              },
                            ],
                          )
                        }
                      >
                        <Ionicons name="close-outline" size={22} color={colors.muted} />
                      </Pressable>
                    ) : null}
                  </View>
                ))
              : null}
          </View>
        ) : null}
        {issue.data.parent ? (
          <Pressable
            style={styles.related}
            onPress={() => router.push(`/issue/${issue.data.parent!.id}`)}
          >
            <Text style={styles.relatedId}>Parent · {issue.data.parent.identifier}</Text>
            <Text numberOfLines={1} style={styles.relatedTitle}>
              {issue.data.parent.title}
            </Text>
          </Pressable>
        ) : null}
        {issue.data.subtasks.length ||
        (board.data?.permissions?.work_items?.create &&
          !issue.data.parent &&
          !issue.data.archivedAt) ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Subtasks</Text>
              {board.data?.permissions?.work_items?.create &&
              !issue.data.parent &&
              !issue.data.archivedAt &&
              project ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: '/new-issue/[key]',
                      params: { key: project.key, parentId: String(issueId) },
                    })
                  }
                >
                  <Text style={styles.linkAction}>Add subtask</Text>
                </Pressable>
              ) : null}
            </View>
            {issue.data.subtasks.map((subtask) => (
              <Pressable
                key={subtask.id}
                style={styles.related}
                onPress={() => router.push(`/issue/${subtask.id}`)}
              >
                <Text style={styles.relatedId}>{subtask.identifier}</Text>
                <Text numberOfLines={1} style={styles.relatedTitle}>
                  {subtask.title}
                </Text>
                <Ionicons name="chevron-forward" color={colors.muted} size={17} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {attachments.isPending ? <Loading /> : null}
        {attachments.isError ? (
          <Notice message="Attachments unavailable." onPress={() => void attachments.refetch()} />
        ) : null}
        {attachments.data?.length || canEdit ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Attachments</Text>
              {canEdit ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={upload.isPending}
                  onPress={() => void pickAttachment()}
                >
                  <Text style={styles.linkAction}>
                    {upload.isPending ? 'Uploading…' : 'Add file'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {attachments.data?.length
              ? attachments.data.map((attachment) => (
                  <View key={attachment.id} style={styles.related}>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${attachment.filename}`}
                      onPress={() => void openAttachment(attachment.url)}
                      style={styles.attachmentLink}
                    >
                      <Ionicons name="document-outline" size={18} color={colors.accent} />
                      <Text numberOfLines={1} style={styles.relatedTitle}>
                        {attachment.filename}
                      </Text>
                    </Pressable>
                    <Text style={styles.date}>{Math.ceil(attachment.sizeBytes / 1024)} KB</Text>
                    {board.data?.permissions?.work_items?.delete && !issue.data.archivedAt ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${attachment.filename}`}
                        style={styles.iconButton}
                        disabled={removeAttachment.isPending}
                        onPress={() =>
                          Alert.alert('Delete attachment?', attachment.filename, [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => removeAttachment.mutate(attachment.id),
                            },
                          ])
                        }
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.muted} />
                      </Pressable>
                    ) : null}
                  </View>
                ))
              : null}
          </View>
        ) : null}
        {canReadChecklists ? (
          <View
            onLayout={(event) => {
              positions.current.checklists = event.nativeEvent.layout.y;
            }}
          >
            <IssueChecklists
              key={issueId}
              issueId={issueId}
              lists={issue.data.checklists}
              canEdit={!!canEditChecklists}
            />
          </View>
        ) : null}
        {board.data?.project.timeLoggingEnabled ? (
          <View
            onLayout={(event) => {
              positions.current.time = event.nativeEvent.layout.y;
            }}
          >
            <IssueWorklogs
              key={issueId}
              issueId={issueId}
              loggedMinutes={issue.data.loggedMinutes}
              canEdit={!!canEdit}
              owner={project?.role === 'owner'}
              userId={session?.user.id}
            />
          </View>
        ) : null}
        <View
          onLayout={(event) => {
            positions.current.discussion = event.nativeEvent.layout.y;
          }}
        >
          <IssueDiscussion
            key={issueId}
            issueId={issueId}
            canEdit={!!canEdit}
            owner={project?.role === 'owner'}
            userId={session?.user.id}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.canvas },
    content: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 64 },
    identifier: {
      color: colors.muted,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    title: {
      color: colors.ink,
      fontSize: 31,
      fontWeight: '700',
      lineHeight: 38,
      letterSpacing: -0.9,
      marginTop: 14,
    },
    archivedNotice: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 8,
    },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, marginTop: 12 },
    iconButton: { minWidth: 48, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
    sectionButton: {
      minHeight: 48,
      paddingHorizontal: 14,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      justifyContent: 'center',
    },
    editButton: {
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 14,
    },
    editLabel: { color: colors.accent, fontSize: 13, fontWeight: '700' },
    metaLine: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 18,
      alignItems: 'center',
    },
    labels: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
    labelPill: {
      color: colors.accent,
      backgroundColor: colors.accentSoft,
      overflow: 'hidden',
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 12,
      fontWeight: '700',
    },
    fieldRow: {
      paddingVertical: 9,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      flexDirection: 'row',
      alignItems: 'center',
    },
    fieldName: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    fieldValue: { color: colors.ink, fontSize: 14, marginTop: 4, lineHeight: 20 },
    emptyField: { color: colors.muted },
    stateName: {
      color: colors.ink,
      backgroundColor: colors.accentSoft,
      overflow: 'hidden',
      borderRadius: 9,
      paddingHorizontal: 10,
      paddingVertical: 6,
      fontSize: 12,
      fontWeight: '700',
    },
    priority: { color: colors.muted, textTransform: 'capitalize', fontSize: 12 },
    date: { color: colors.muted, fontSize: 12 },
    description: {
      color: colors.ink,
      fontSize: 16,
      lineHeight: 26,
      marginTop: 30,
    },
    descriptionPrompt: {
      color: colors.muted,
      fontSize: 14,
      marginTop: 30,
    },
    placeholder: { color: colors.muted, fontSize: 14, marginTop: 18 },
    section: { marginTop: 36, paddingTop: 19, borderTopWidth: 1, borderTopColor: colors.line },
    sectionHeading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      color: colors.ink,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 14,
    },
    linkAction: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '700',
      marginBottom: 14,
    },
    pill: {
      minHeight: 48,
      backgroundColor: colors.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    pillActive: { backgroundColor: colors.ink },
    pillText: { color: colors.ink, fontSize: 13, fontWeight: '600' },
    pillTextActive: { color: colors.onAccent },
    related: {
      backgroundColor: colors.canvas,
      minHeight: 48,
      paddingVertical: 13,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
      flexDirection: 'row',
      gap: 9,
      alignItems: 'center',
    },
    relatedId: { color: colors.muted, fontSize: 12, fontWeight: '700' },
    relatedTitle: { color: colors.ink, flex: 1, fontSize: 14 },
    attachmentLink: {
      minHeight: 48,
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
    },
    checklist: {
      backgroundColor: colors.canvas,
      borderRadius: 0,
      paddingHorizontal: 0,
      paddingVertical: 15,
      marginBottom: 9,
    },
    checklistTitle: {
      color: colors.ink,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
    },
    checklistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingVertical: 8,
    },
    checklistText: { color: colors.ink, fontSize: 14, flex: 1 },
    completedText: { color: colors.muted, textDecorationLine: 'line-through' },
    inlineForm: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingTop: 8,
    },
    inlineInput: {
      flex: 1,
      color: colors.ink,
      fontSize: 14,
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    feedItem: {
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    feedAuthor: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    feedBody: { color: colors.ink, fontSize: 14, lineHeight: 21, marginTop: 5 },
    composer: {
      backgroundColor: colors.surface,
      borderTopColor: colors.line,
      borderTopWidth: 1,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
    },
    commentInput: {
      flex: 1,
      color: colors.ink,
      fontSize: 15,
      maxHeight: 110,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
  });
