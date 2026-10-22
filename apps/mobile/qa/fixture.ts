import type { Page } from '@playwright/test';

export async function installFixture(
  page: Page,
  options: { empty?: boolean; readonly?: boolean; fail?: boolean; delay?: number } = {},
) {
  const today = new Date().toISOString().slice(0, 10);
  const projects = ['alpha', 'beta'].map((team, index) => ({
    id: index + 1,
    teamId: index + 1,
    teamName: `${team} team`,
    teamRef: team,
    key: 'PLAN',
    ref: `${team}.PLAN`,
    name: `${team} project`,
    description: '',
    role: 'owner',
    isFavorite: false,
    isHidden: false,
    permissions: { work_items: { read: true, create: !options.readonly, edit: !options.readonly } },
  }));
  const columns = [
    { id: 1, name: 'Backlog', stateType: 'backlog', position: 1, color: '#777777', wipLimit: null },
    {
      id: 2,
      name: 'In progress',
      stateType: 'started',
      position: 2,
      color: '#3771c8',
      wipLimit: 3,
    },
    { id: 3, name: 'Done', stateType: 'completed', position: 3, color: '#438548', wipLimit: null },
  ];
  const rows = options.empty
    ? []
    : Array.from({ length: 28 }, (_, index) => ({
        id: index + 1,
        projectId: 1,
        sequenceNumber: index + 1,
        identifier: `PLAN-${index + 1}`,
        title: index ? `Synthetic task ${index + 1}` : 'Plan the mobile release',
        description: '## Details\n\nA synthetic fixture task with **formatted text**.',
        columnId: (index % 2) + 1,
        typeId: 1,
        initiative: null,
        cycle: null,
        labelIds: [],
        assigneeUserId: index % 2 ? null : 'fixture-user',
        priority: index % 2 ? 'low' : 'high',
        startDate: today,
        dueDate: index % 3 ? today : null,
        estimatePoints: null,
        estimateMinutes: null,
        loggedMinutes: 0,
        createdAt: `${today}T09:00:00Z`,
        updatedAt: `${today}T09:00:00Z`,
        archivedAt: null,
        fields: [],
        watchers: [],
        parent: null,
        subtasks: [],
        links: [],
        checklists: [],
      }));
  const byProject = new Map(
    projects.map((project) => [
      project.ref,
      rows.map((row) => ({
        ...row,
        id: row.id + (project.id - 1) * 100,
        projectId: project.id,
        title: project.id === 1 ? row.title : `beta ${row.title}`,
      })),
    ]),
  );
  let writes = 0;
  const failures: string[] = [];
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') {
      failures.push(`Unexpected external request: ${url.origin}`);
      await route.abort();
      return;
    }
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const path = decodeURIComponent(url.pathname.slice(4));
    if (options.delay) await new Promise((resolve) => setTimeout(resolve, options.delay));
    let payload: unknown;
    if (options.fail && path.includes('/projects/'))
      return route.fulfill({ status: 503, json: { error: 'Synthetic outage' } });
    if (path === '/projects') payload = projects;
    else if (/^\/projects\/[^/]+$/.test(path)) {
      const project = projects.find((project) => project.ref === path.split('/')[2]);
      if (!project)
        return route.fulfill({ status: 409, json: { error: 'Project reference is ambiguous' } });
      payload = {
        project,
        columns,
        assignees: [
          { userId: 'fixture-user', name: 'Fixture user', kind: 'member', canReadWorkItems: true },
        ],
        issueTypes: [{ id: 1, name: 'Task', isDefault: true }],
        labels: [],
        customFields: [],
        permissions: project.permissions,
      };
    } else if (path.endsWith('/issues/board'))
      payload = { issues: byProject.get(path.split('/')[2]) ?? [] };
    else if (path.endsWith('/issues/archived')) payload = [];
    else if (/^\/issues\/\d+$/.test(path)) {
      const row = [...byProject.values()]
        .flat()
        .find((row) => row.id === Number(path.split('/')[2]));
      if (request.method() === 'PATCH') {
        writes++;
        await new Promise((resolve) => setTimeout(resolve, 300));
        Object.assign(row ?? {}, request.postDataJSON());
      }
      payload = row;
    } else if (path.endsWith('/feed')) payload = { items: [], nextCursor: null };
    else if (path.endsWith('/attachments') || path.endsWith('/worklogs')) payload = [];
    else {
      failures.push(`Unhandled fixture request: ${request.method()} ${path}`);
      return route.fulfill({ status: 500, json: { error: 'Unhandled fixture request' } });
    }
    return route.fulfill({ json: payload });
  });
  return { options, writes: () => writes, failures };
}
