export type Priority = 'urgent' | 'high' | 'medium' | 'low' | null;

export interface Project {
  role: 'owner' | 'member';
  id: number;
  teamId: number;
  teamName: string;
  teamRef?: string;
  ref?: string;
  key: string;
  name: string;
  description: string;
  checklistsEnabled?: boolean;
  timeLoggingEnabled?: boolean;
  pointsEstimateEnabled?: boolean;
  timeEstimateEnabled?: boolean;
  initiativesEnabled?: boolean;
  cyclesEnabled?: boolean;
  isFavorite: boolean;
  isHidden: boolean;
  permissions?: {
    work_items?: {
      read?: boolean;
      create?: boolean;
      edit?: boolean;
      delete?: boolean;
    };
  };
}

export interface Column {
  id: number;
  name: string;
  color: string;
  position: number;
  stateType: string;
  wipLimit?: number | null;
  wipMode?: string;
}

export interface Assignee {
  userId: string;
  name: string;
  kind: 'member' | 'agent';
  canReadWorkItems: boolean;
}

export interface ProjectBoard {
  project: Pick<
    Project,
    | 'id'
    | 'teamId'
    | 'teamName'
    | 'key'
    | 'ref'
    | 'teamRef'
    | 'name'
    | 'description'
    | 'checklistsEnabled'
    | 'timeLoggingEnabled'
    | 'pointsEstimateEnabled'
    | 'timeEstimateEnabled'
    | 'initiativesEnabled'
    | 'cyclesEnabled'
  >;
  columns: Column[];
  issueTypes: { id: number; name: string; isDefault: boolean }[];
  labels: { id: number; name: string; color: string; groupId: number | null }[];
  customFields: {
    id: number;
    name: string;
    fieldType: string;
    memberScope: 'all' | 'humans' | 'agents' | null;
    options: { id: number; value: string }[];
  }[];
  assignees: Assignee[];
  permissions: {
    cycles?: { read?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
    initiatives?: { read?: boolean; create?: boolean; edit?: boolean; delete?: boolean };
    work_items?: {
      read?: boolean;
      create?: boolean;
      edit?: boolean;
      delete?: boolean;
    };
    checklists?: { read?: boolean; edit?: boolean };
  };
}

export interface Issue {
  id: number;
  projectId: number;
  sequenceNumber: number;
  identifier: string;
  title: string;
  description: string;
  columnId: number;
  typeId: number | null;
  initiative: { id: number; title: string; status: string } | null;
  cycle: { id: number; name: string; status: string } | null;
  labelIds: number[];
  assigneeUserId: string | null;
  delegateUserId?: string | null;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
  estimatePoints: number | null;
  estimateMinutes: number | null;
  loggedMinutes: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

export interface IssueDetail extends Issue {
  fields: {
    fieldId: number;
    name: string;
    fieldType: string;
    value: string | number | boolean | null;
    valueEnd: string | null;
    optionIds: number[];
  }[];
  watchers: { userId: string; name: string; image: string | null }[];
  parent: { id: number; identifier: string; title: string } | null;
  subtasks: { id: number; identifier: string; title: string }[];
  links: {
    id: number;
    kind: string;
    issue: { id: number; identifier: string; title: string };
  }[];
  checklists: {
    id: number;
    title: string;
    items: { id: number; content: string; done: boolean }[];
  }[];
}

export interface IssueSearchHit {
  typeId: number | null;
  cycleId: number | null;
  initiativeId: number | null;
  labelIds: number[];
  id: number;
  sequenceNumber: number;
  identifier: string;
  title: string;
  columnId: number;
  assigneeUserId: string | null;
  priority: Priority;
  dueDate: string | null;
  archived: boolean;
}

export interface Notification {
  id: number;
  type: string;
  actorName: string | null;
  readAt: string | null;
  createdAt: string;
  issueId: number;
  issueSeq: number;
  issueTitle: string;
  projectId: number;
  projectKey: string;
  projectName: string;
}

export interface FeedItem {
  actorUserId: string | null;
  replyToId: number | null;
  editedAt: string | null;
  action: string | null;
  id: number;
  kind: string;
  actorName: string | null;
  body: string | null;
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

export interface Worklog {
  userId: string;
  id: number;
  userName: string | null;
  minutes: number;
  spentOn: string;
  note: string | null;
}
