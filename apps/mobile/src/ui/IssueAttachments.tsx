import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '@/lib/api';
import { API_URL } from '@/lib/auth';
import { attachmentMarkdown, attachmentUrl, fileSize, imageAttachment } from '@/lib/attachments';
import type { Attachment } from '@/lib/types';
import { AttachmentImage } from './AttachmentImage';
import { Action, Loading } from './primitives';
import { Notice } from './work-controls';
import { useThemedStyles, type Palette } from './theme';

type UploadRow = {
  name: string;
  status: 'Waiting' | 'Uploading' | 'Uploaded' | 'Failed' | 'Unconfirmed';
  error?: string;
};
export function IssueAttachments({
  issueId,
  canUpload,
  canDelete,
  onInsert,
  onBusyChange,
}: {
  issueId: number;
  canUpload: boolean;
  canDelete: boolean;
  onInsert?: (markdown: string) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const styles = useThemedStyles(createStyles);
  const client = useQueryClient();
  const busy = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [queue, setQueue] = useState<UploadRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const files = useQuery({
    queryKey: ['attachments', issueId],
    queryFn: () => api.attachments(issueId),
  });
  const settings = useQuery({
    queryKey: ['storage-settings'],
    queryFn: api.storageSettings,
    enabled: canUpload,
  });
  const refresh = async (deleted = false) => {
    const keys = [
      ['attachments', issueId],
      ['feed', issueId],
    ];
    if (deleted) keys.push(['issue', issueId], ['issues'], ['assigned'], ['search'], ['planning']);
    await Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
  };
  const remove = useMutation({
    mutationFn: api.deleteAttachment,
    onSuccess: () => refresh(true),
    onError: (failure) => setError(failure.message),
  });
  const pick = async () => {
    if (busy.current || !canUpload) return;
    busy.current = true;
    setUploading(true);
    onBusyChange?.(true);
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: true,
      });
      if (result.canceled) return;
      const assets = result.assets;
      setQueue(assets.map((asset) => ({ name: asset.name, status: 'Waiting' })));
      for (const [index, asset] of assets.entries()) {
        const update = (status: UploadRow['status'], message?: string) =>
          setQueue((rows) =>
            rows.map((row, rowIndex) =>
              rowIndex === index ? { ...row, status, error: message } : row,
            ),
          );
        update('Uploading');
        try {
          await api.uploadAttachment(issueId, asset);
          update('Uploaded');
        } catch (failure) {
          const known =
            failure instanceof ApiError && failure.status >= 400 && failure.status < 500;
          update(
            known ? 'Failed' : 'Unconfirmed',
            failure instanceof Error ? failure.message : 'Upload not confirmed.',
          );
        }
      }
      await refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not select files.');
    } finally {
      busy.current = false;
      setUploading(false);
      onBusyChange?.(false);
    }
  };
  const open = async (file: Attachment) => {
    const url = attachmentUrl(file.url, API_URL);
    if (!url) {
      setError('This file has an invalid address.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setError('Could not open the file. Please try again.');
    }
  };
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>
          Attachments
        </Text>
        {canUpload ? (
          <Action
            muted
            label={uploading ? 'Uploading…' : 'Add files'}
            disabled={uploading || remove.isPending}
            onPress={() => void pick()}
          />
        ) : null}
      </View>
      {settings.data && canUpload ? (
        <Text style={styles.meta}>
          Up to {settings.data.maxAttachmentMb} MB per file.{' '}
          {settings.data.attachmentMimeTypes.length
            ? `Accepted types: ${settings.data.attachmentMimeTypes.join(', ')}`
            : 'The server checks file types.'}
        </Text>
      ) : null}
      {error ? <Notice message={error} /> : null}
      {files.isPending ? <Loading /> : null}
      {files.isError ? (
        <Notice
          message="Could not load attachments. Loaded files remain below."
          onPress={() => void files.refetch()}
        />
      ) : null}
      {!files.isPending && !files.isError && !files.data?.length ? (
        <Text style={styles.meta}>No attachments yet.</Text>
      ) : null}
      {queue.map((row, index) => (
        <View key={index} style={styles.upload}>
          <Text accessibilityLiveRegion="polite" style={styles.meta}>
            {row.name} · {row.status}
          </Text>
          {row.error ? <Text style={styles.meta}>{row.error}</Text> : null}
          {row.status === 'Unconfirmed' ? (
            <Notice
              message="Check the refreshed attachment list before adding this file again. A lost response can still mean the upload succeeded."
              action="Refresh files"
              onPress={() => void files.refetch()}
            />
          ) : null}
        </View>
      ))}
      {files.data?.map((file) => (
        <View key={file.id} style={styles.row}>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${file.filename}`}
            onPress={() => void open(file)}
            style={styles.file}
          >
            <Text style={styles.name}>{file.filename}</Text>
            <Text style={styles.meta}>
              {fileSize(file.sizeBytes)} · {file.contentType}
            </Text>
          </Pressable>
          {imageAttachment(file.contentType) ? (
            <AttachmentImage source={file.url} label={file.filename} />
          ) : null}
          <View style={styles.actions}>
            {onInsert ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Insert ${file.filename}`}
                disabled={uploading}
                onPress={() => onInsert(attachmentMarkdown(file))}
                style={styles.button}
              >
                <Text style={styles.action}>Insert</Text>
              </Pressable>
            ) : null}
            {canDelete ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${file.filename}`}
                disabled={remove.isPending || uploading}
                style={styles.button}
                onPress={() =>
                  Alert.alert(
                    'Delete attachment?',
                    'The file and its embeds in this issue will be removed.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          if (!remove.isPending) remove.mutate(file.id);
                        },
                      },
                    ],
                  )
                }
              >
                <Text style={styles.danger}>Delete</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}
const createStyles = (colors: Palette) =>
  StyleSheet.create({
    section: {
      marginTop: 32,
      paddingTop: 20,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    heading: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 10,
    },
    title: { color: colors.ink, fontSize: 18, fontWeight: '600' },
    row: {
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.line,
    },
    file: { minHeight: 48, justifyContent: 'center', gap: 6 },
    name: { color: colors.ink, fontSize: 16, lineHeight: 24 },
    meta: { color: colors.muted, fontSize: 13, lineHeight: 20 },
    actions: { flexDirection: 'row', gap: 12 },
    button: { minHeight: 48, minWidth: 48, justifyContent: 'center' },
    action: { color: colors.ink, fontSize: 15, fontWeight: '600' },
    danger: { color: colors.danger, fontSize: 15 },
    upload: { marginVertical: 8 },
  });
