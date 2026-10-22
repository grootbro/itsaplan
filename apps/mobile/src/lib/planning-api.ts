import { request } from './api';
import type { PlanningEntry, PlanningKind, PlanningPage } from './planning-model';

interface Cycle {
  id: number;
  projectId: number;
  name: string;
  goal: string;
  status: string;
  startDate: string;
  endDate: string;
  progress: PlanningEntry['progress'];
}
const cycleEntry = (cycle: Cycle): PlanningEntry => ({
  ...cycle,
  title: cycle.name,
  description: cycle.goal,
  targetDate: cycle.endDate,
  priority: null,
  ownerUserId: null,
  labelIds: [],
});
export const planningApi = {
  list: async (
    kind: PlanningKind,
    projectRef: string,
    page: number,
    completed: boolean,
    search: string,
    status: string,
  ): Promise<PlanningPage> => {
    const base = `/projects/${encodeURIComponent(projectRef)}/${kind}`;
    if (kind === 'cycles') {
      if (completed) {
        const result = await request<Omit<PlanningPage, 'items'> & { items: Cycle[] }>(
          `${base}/completed?page=${page}&pageSize=25`,
        );
        return { ...result, items: result.items.map(cycleEntry) };
      }
      const result = await request<Cycle[]>(`${base}?status=planned`);
      return {
        items: result.map(cycleEntry),
        total: result.length,
        page: 1,
        pageSize: Math.max(1, result.length),
      };
    }
    const query = new URLSearchParams({
      page: String(page),
      pageSize: '25',
      search,
      sort: 'title',
    });
    if (status !== 'all') query.set('status', status);
    return request<PlanningPage>(`${base}?${query}`);
  },
  detail: async (kind: PlanningKind, id: number): Promise<PlanningEntry> => {
    if (kind === 'cycles') return cycleEntry(await request<Cycle>(`/cycles/${id}`));
    return request<PlanningEntry>(`/initiatives/${id}`);
  },
  save: (
    kind: PlanningKind,
    projectRef: string,
    id: number | undefined,
    body: Record<string, unknown>,
  ) =>
    request<{ id: number }>(
      id ? `/${kind}/${id}` : `/projects/${encodeURIComponent(projectRef)}/${kind}`,
      {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      },
    ),
};
