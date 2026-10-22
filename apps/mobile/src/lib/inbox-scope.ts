import { findProject } from './project-reference';
export type InboxScope = 'all' | number | null;

export function resolveInboxScope(
  allProjects: boolean,
  projectKey: string | null,
  projects: readonly { key: string; ref?: string; id: number }[] | undefined,
): InboxScope {
  if (allProjects) return 'all';
  return findProject(projects, projectKey)?.id ?? null;
}

export function inboxProjectId(scope: InboxScope): number | undefined {
  if (scope === 'all') return undefined;
  if (typeof scope !== 'number' || !Number.isSafeInteger(scope) || scope <= 0)
    throw new Error('Choose a project before updating Inbox.');
  return scope;
}
