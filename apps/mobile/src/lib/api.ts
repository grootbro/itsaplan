import { API_URL, authClient } from './auth';
import { inboxProjectId, type InboxScope } from './inbox-scope';
import { nativeUploadPart, type PickedAttachment } from './attachments';
import type {
  Attachment,
  FeedItem,
  Issue,
  IssueDetail,
  IssueSearchHit,
  Notification,
  Project,
  ProjectBoard,
  Worklog,
} from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookie = await authClient.getCookie();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      payload?.error ?? payload?.message ?? `Request failed (${response.status})`,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

const json = (value: unknown) => JSON.stringify(value);

export const api = {
  projects: () => request<Project[]>('/projects?permissions=true'),
  projectPreferences: (key: string, body: { isFavorite?: boolean; isHidden?: boolean }) =>
    request<{ isFavorite: boolean; isHidden: boolean }>(
      `/projects/${encodeURIComponent(key)}/preferences`,
      { method: 'PATCH', body: JSON.stringify(body) },
    ),
  assignedIssues: (key: string, userId: string, signal?: AbortSignal) => {
    const query = new URLSearchParams({ assigneeUserId: userId, limit: '500' });
    return request<IssueSearchHit[]>(`/projects/${encodeURIComponent(key)}/issues?${query}`, {
      signal,
    });
  },
  board: (key: string, signal?: AbortSignal) =>
    request<ProjectBoard>(`/projects/${encodeURIComponent(key)}`, { signal }),
  issues: (key: string) =>
    request<{ issues: Issue[] }>(`/projects/${encodeURIComponent(key)}/issues/board`),
  archivedIssues: (key: string) =>
    request<Issue[]>(`/projects/${encodeURIComponent(key)}/issues/archived`),
  cycleOptions: (key: string) =>
    request<{ id: number; name: string; status: string }[]>(
      `/projects/${encodeURIComponent(key)}/cycles/options`,
    ),
  initiativeOptions: (key: string, include?: number) =>
    request<{ id: number; title: string; status: string }[]>(
      `/projects/${encodeURIComponent(key)}/initiatives/options${include ? `?include=${include}` : ''}`,
    ),
  issue: (id: number) => request<IssueDetail>(`/issues/${id}`),
  watchIssue: (id: number, watch: boolean) =>
    request<IssueDetail['watchers']>(`/issues/${id}/watch`, {
      method: watch ? 'POST' : 'DELETE',
    }),
  archiveIssue: (id: number, subtasks?: 'cascade' | 'detach') =>
    request<Issue>(`/issues/${id}/archive`, {
      method: 'POST',
      body: json(subtasks ? { subtasks } : {}),
    }),
  restoreIssue: (id: number) => request<Issue>(`/issues/${id}/restore`, { method: 'POST' }),
  setIssueField: (
    issueId: number,
    fieldId: number,
    body: { value?: string | number | boolean | null; optionIds?: number[] },
  ) =>
    request<{ ok: boolean }>(`/issues/${issueId}/fields/${fieldId}`, {
      method: 'PUT',
      body: json(body),
    }),
  createIssue: (
    key: string,
    body: {
      title: string;
      description: string;
      columnId: number;
      typeId?: number | null;
      parentId?: number;
      cycleId?: number | null;
      initiativeId?: number | null;
      assigneeUserId?: string | null;
      delegateUserId?: string | null;
      priority?: string | null;
      dueDate?: string | null;
      startDate?: string | null;
      labelIds?: number[];
      estimatePoints?: number | null;
      estimateMinutes?: number | null;
    },
  ) =>
    request<Issue>(`/projects/${encodeURIComponent(key)}/issues`, {
      method: 'POST',
      body: json(body),
    }),
  updateIssue: (
    id: number,
    body: Partial<
      Pick<
        Issue,
        | 'title'
        | 'description'
        | 'columnId'
        | 'typeId'
        | 'priority'
        | 'assigneeUserId'
        | 'delegateUserId'
        | 'startDate'
        | 'dueDate'
        | 'labelIds'
        | 'estimatePoints'
        | 'estimateMinutes'
      >
    > & { cycleId?: number | null; initiativeId?: number | null },
  ) => request<Issue>(`/issues/${id}`, { method: 'PATCH', body: json(body) }),
  search: (key: string, term: string) =>
    request<IssueSearchHit[]>(
      `/projects/${encodeURIComponent(key)}/issues/search?q=${encodeURIComponent(term)}&limit=50`,
    ),
  feed: (id: number, cursor?: unknown) =>
    request<{ items: FeedItem[]; nextCursor: unknown | null }>(
      `/issues/${id}/feed?limit=50${cursor ? `&cursor=${encodeURIComponent(JSON.stringify(cursor))}` : ''}`,
    ),
  attachments: (id: number) => request<Attachment[]>(`/issues/${id}/attachments`),
  storageSettings: () =>
    request<{ maxAttachmentMb: number; attachmentMimeTypes: string[] }>('/settings/storage'),
  deleteAttachment: (publicId: string) =>
    request<void>(`/attachments/${encodeURIComponent(publicId)}`, {
      method: 'DELETE',
    }),
  uploadAttachment: async (id: number, file: PickedAttachment) => {
    if (!file.uri || !file.name || file.size === 0)
      throw new ApiError(400, 'Choose a non-empty file.');
    const form = new FormData();
    form.append('file', nativeUploadPart(file));
    const cookie = await authClient.getCookie();
    const response = await fetch(`${API_URL}/issues/${id}/attachments`, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        Accept: 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: form,
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new ApiError(response.status, payload?.error ?? payload?.message ?? 'Upload failed');
    }
    return response.json() as Promise<Attachment>;
  },
  comment: (id: number, body: string, replyToId?: number) =>
    request<FeedItem>(`/issues/${id}/comments`, {
      method: 'POST',
      body: json({ body, ...(replyToId !== undefined ? { replyToId } : {}) }),
    }),
  editComment: (id: number, body: string) =>
    request<FeedItem>(`/comments/${id}`, {
      method: 'PATCH',
      body: json({ body }),
    }),
  deleteComment: (id: number) => request<void>(`/comments/${id}`, { method: 'DELETE' }),
  unlinkIssue: (id: number, linkId: number) =>
    request<void>(`/issues/${id}/links/${linkId}`, { method: 'DELETE' }),
  renameChecklist: (id: number, title: string) =>
    request<void>(`/checklists/${id}`, { method: 'PATCH', body: json({ title }) }),
  deleteChecklist: (id: number) => request<void>(`/checklists/${id}`, { method: 'DELETE' }),
  editChecklistItem: (id: number, content: string) =>
    request<void>(`/checklists/items/${id}`, { method: 'PATCH', body: json({ content }) }),
  deleteChecklistItem: (id: number) =>
    request<void>(`/checklists/items/${id}`, { method: 'DELETE' }),
  reorderChecklists: (id: number, orderedIds: number[]) =>
    request<void>(`/issues/${id}/checklists/reorder`, {
      method: 'PUT',
      body: json({ orderedIds }),
    }),
  reorderChecklistItems: (id: number, orderedIds: number[]) =>
    request<void>(`/checklists/${id}/items/reorder`, { method: 'PUT', body: json({ orderedIds }) }),
  updateWorklog: (id: number, body: { minutes: number; spentOn: string; note: string | null }) =>
    request<Worklog>(`/worklogs/${id}`, { method: 'PATCH', body: json(body) }),
  deleteWorklog: (id: number) => request<void>(`/worklogs/${id}`, { method: 'DELETE' }),
  linkIssue: (id: number, targetIssueId: number, kind: string) =>
    request<void>(`/issues/${id}/links`, {
      method: 'POST',
      body: json({ targetIssueId, kind }),
    }),
  addChecklist: (issueId: number, title: string) =>
    request<void>(`/issues/${issueId}/checklists`, {
      method: 'POST',
      body: json({ title }),
    }),
  addChecklistItem: (checklistId: number, content: string) =>
    request<void>(`/checklists/${checklistId}/items`, {
      method: 'POST',
      body: json({ content }),
    }),
  setChecklistItemDone: (itemId: number, done: boolean) =>
    request<void>(`/checklists/items/${itemId}`, {
      method: 'PATCH',
      body: json({ done }),
    }),
  worklogs: (issueId: number) => request<Worklog[]>(`/issues/${issueId}/worklogs`),
  logTime: (issueId: number, minutes: number, spentOn: string, note: string) =>
    request<Worklog>(`/issues/${issueId}/worklogs`, {
      method: 'POST',
      body: json({ minutes, spentOn, note: note || null }),
    }),
  notifications: (projectId?: number, cursor?: { ts: string; id: number }) => {
    const query = new URLSearchParams({ limit: '50' });
    if (projectId) query.set('projectId', String(projectId));
    if (cursor) query.set('cursor', JSON.stringify(cursor));
    return request<{
      items: Notification[];
      nextCursor: { ts: string; id: number } | null;
    }>(`/notifications?${query}`);
  },
  unread: (projectId?: number) =>
    request<{ unread: number }>(
      `/notifications/unread${projectId ? `?projectId=${projectId}` : ''}`,
    ),
  markRead: (id: number, read: boolean) =>
    request<void>(`/notifications/${id}/read`, {
      method: 'POST',
      body: json({ read }),
    }),
  markAllRead: (scope: Exclude<InboxScope, null>) => {
    const projectId = inboxProjectId(scope);
    return request<{ count: number }>('/notifications/read-all', {
      method: 'POST',
      body: json(projectId === undefined ? {} : { projectId }),
    });
  },
};
