import { projectReference } from '@/lib/project-reference';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
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
import { IssueProperties } from './IssueProperties';
import { MarkdownText } from './MarkdownText';

export function IssueDetailPanel({
  issueId,
  embedded = false,
  onOpenIssue,
}: {
  issueId: number;
  embedded?: boolean;
  onOpenIssue?: (id: number) => void;
}) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const navigation = useNavigation();
  const openIssue = (id: number) => {
    if (onOpenIssue) onOpenIssue(id);
    else router.push(`/issue/${id}`);
  };
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
  const projectRef = project ? projectReference(project) : undefined;
  const board = useQuery({
    queryKey: ['board', projectRef],
    queryFn: () => api.board(projectReference(project!)),
    enabled: !!projectRef,
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
        queryClient.invalidateQueries({
          queryKey: ['issues'],
        }),
        queryClient.invalidateQueries({ queryKey: ['assigned'] }),
        queryClient.invalidateQueries({ queryKey: ['planning'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
        queryClient.invalidateQueries({
          queryKey: ['archived-issues'],
        }),
      ]),
    onError: (error) => Alert.alert('Could not archive issue', error.message),
  });
  const restore = useMutation({
    mutationFn: () => api.restoreIssue(issueId),
    onSuccess: () =>
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['issue', issueId] }),
        queryClient.invalidateQueries({
          queryKey: ['issues'],
        }),
        queryClient.invalidateQueries({ queryKey: ['assigned'] }),
        queryClient.invalidateQueries({ queryKey: ['planning'] }),
        queryClient.invalidateQueries({ queryKey: ['search'] }),
        queryClient.invalidateQueries({
          queryKey: ['archived-issues'],
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
    if (!embedded) navigation.setOptions({ title: issue.data?.identifier ?? 'Issue' });
  }, [embedded, issue.data?.identifier, navigation]);

  if (!Number.isSafeInteger(issueId) || issueId <= 0) return <EmptyState title="Invalid issue" />;
  if (issue.isPending) return <Loading />;
  if (!issue.data && issue.isError)
    return (
      <View style={styles.screen}>
        <Notice message="Could not load issue." onPress={() => void issue.refetch()} />
      </View>
    );
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
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32, maxWidth: 880, width: '100%', alignSelf: 'center' },
        ]}
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
        <View
          onLayout={(event) => {
            positions.current.details = event.nativeEvent.layout.y;
          }}
        />
        <Text style={styles.identifier}>
          {issue.data.identifier} · {project?.name ?? 'Project'}
        </Text>
        <Text accessibilityRole="header" style={styles.title}>
          {issue.data.title}
        </Text>
        {issue.data.archivedAt ? <Text style={styles.archivedNotice}>Archived issue</Text> : null}
        <View style={styles.actions}>
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
        {issue.data.description ? (
          <View style={styles.description}>
            <MarkdownText>{issue.data.description}</MarkdownText>
          </View>
        ) : canEdit ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/edit-issue/${issueId}`)}
          >
            <Text style={styles.descriptionPrompt}>Add a description</Text>
          </Pressable>
        ) : null}
        <IssueProperties
          key={issueId}
          issue={issue.data}
          board={board.data}
          canEdit={!!canEdit}
          onEdit={() => router.push(`/edit-issue/${issueId}`)}
        />
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
              if (field.fieldType === 'markdown')
                return (
                  <View key={field.fieldId} style={{ marginTop: 18 }}>
                    <View style={styles.sectionHeading}>
                      <Text style={styles.fieldName}>{field.name}</Text>
                      {editable ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${field.name}`}
                          style={styles.iconButton}
                          onPress={() =>
                            router.push({
                              pathname: '/edit-field/[issueId]/[fieldId]',
                              params: { issueId: String(issueId), fieldId: String(field.fieldId) },
                            })
                          }
                        >
                          <Ionicons name="create-outline" size={18} color={colors.muted} />
                        </Pressable>
                      ) : null}
                    </View>
                    {value ? (
                      <MarkdownText>{value}</MarkdownText>
                    ) : (
                      <Text style={styles.emptyField}>Not set</Text>
                    )}
                  </View>
                );
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
                      onPress={() => openIssue(link.issue.id)}
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
          <Pressable style={styles.related} onPress={() => openIssue(issue.data.parent!.id)}>
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
                      params: { key: projectReference(project), parentId: String(issueId) },
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
                onPress={() => openIssue(subtask.id)}
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
      fontSize: 26,
      fontWeight: '600',
      lineHeight: 34,
      letterSpacing: -0.5,
      marginTop: 14,
    },
    archivedNotice: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 8,
    },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 8 },
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
    },
    editLabel: { color: colors.accent, fontSize: 13, fontWeight: '700' },
    fieldRow: {
      paddingVertical: 9,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
      flexDirection: 'row',
      alignItems: 'center',
    },
    fieldName: { color: colors.muted, fontSize: 12, fontWeight: '600' },
    fieldValue: { color: colors.ink, fontSize: 14, marginTop: 4, lineHeight: 20 },
    emptyField: { color: colors.muted },
    date: { color: colors.muted, fontSize: 12 },
    description: { marginTop: 24 },
    descriptionPrompt: {
      color: colors.muted,
      fontSize: 14,
      marginTop: 30,
    },
    section: {
      marginTop: 36,
      paddingTop: 19,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
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
    related: {
      backgroundColor: colors.canvas,
      minHeight: 48,
      paddingVertical: 13,
      paddingHorizontal: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
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
  });
