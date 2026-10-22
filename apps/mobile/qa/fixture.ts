import type { Page } from '@playwright/test';

export async function installFixture(
  page: Page,
  options: {
    empty?: boolean;
    readonly?: boolean;
    fail?: boolean;
    delay?: number;
    planning?: boolean;
  } = {},
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
    cyclesEnabled: !!options.planning,
    initiativesEnabled: !!options.planning,
    permissions: {
      work_items: { read: true, create: !options.readonly, edit: !options.readonly },
      cycles: { read: true, create: !options.readonly, edit: !options.readonly },
      initiatives: { read: true, create: !options.readonly, edit: !options.readonly },
    },
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
        initiative: options.planning ? { id: 1, title: 'Mobile delivery', status: 'active' } : null,
        cycle: options.planning ? { id: 1, name: 'October delivery', status: 'active' } : null,
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
  const initiatives = Array.from({ length: 26 }, (_, index) => ({
    id: index + 1,
    projectId: 1,
    title: index === 0 ? 'Mobile delivery' : `Initiative ${index + 1}`,
    description: '## Initiative overview\n\nSynthetic planning description.',
    status: 'active',
    ownerUserId: null,
    priority: null,
    startDate: today,
    targetDate: today,
    labelIds: [],
    position: index,
    createdAt: today,
    updatedAt: today,
    progress: { completed: 0, canceled: 0, total: index === 0 ? 28 : 0 },
    health: null,
  }));
  const cycle = {
    id: 1,
    projectId: 1,
    name: 'October delivery',
    goal: 'Ship a tested mobile release.',
    startDate: today,
    endDate: today,
    completedAt: null,
    status: 'active',
    createdAt: today,
    updatedAt: today,
    progress: { completed: 0, canceled: 0, total: 28 },
  };
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
    } else if (path.endsWith('/cycles/options'))
      payload = [{ id: cycle.id, name: cycle.name, status: cycle.status }];
    else if (path.endsWith('/initiatives/options'))
      payload = initiatives.map(({ id, title, status }) => ({ id, title, status }));
    else if (path.endsWith('/cycles/completed')) {
      const pageNumber = Number(url.searchParams.get('page') ?? 1);
      payload = {
        items: Array.from({ length: pageNumber === 1 ? 25 : 1 }, (_, index) => ({
          ...cycle,
          id: 2 + (pageNumber - 1) * 25 + index,
          name: `Completed cycle ${1 + (pageNumber - 1) * 25 + index}`,
          status: 'completed',
          completedAt: today,
        })),
        total: 26,
        page: pageNumber,
        pageSize: 25,
      };
    } else if (path.endsWith('/cycles')) payload = [cycle];
    else if (path === '/cycles/1') payload = cycle;
    else if (/^\/initiatives\/\d+$/.test(path)) {
      const entry = initiatives.find((entry) => entry.id === Number(path.split('/')[2]));
      if (request.method() === 'PATCH') {
        writes++;
        Object.assign(entry ?? {}, request.postDataJSON());
      }
      payload = entry;
    } else if (path.endsWith('/initiatives')) {
      if (request.method() === 'POST') {
        writes++;
        const entry = {
          ...initiatives[0],
          id: initiatives.length + 1,
          ...request.postDataJSON(),
          progress: { completed: 0, canceled: 0, total: 0 },
        };
        initiatives.push(entry);
        payload = entry;
      } else {
        const term = url.searchParams.get('search') ?? '';
        const status = url.searchParams.get('status');
        const matches = initiatives.filter(
          (entry) =>
            entry.title.toLowerCase().includes(term.toLowerCase()) &&
            (!status || entry.status === status),
        );
        const pageNumber = Number(url.searchParams.get('page') ?? 1);
        payload = {
          items: matches.slice((pageNumber - 1) * 25, pageNumber * 25),
          total: matches.length,
          page: pageNumber,
          pageSize: 25,
        };
      }
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
