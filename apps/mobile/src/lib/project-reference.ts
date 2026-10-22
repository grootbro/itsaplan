export function projectReference(project: { key: string; ref?: string }): string {
  return project.ref || project.key;
}

export function findProject<T extends { key: string; ref?: string }>(
  projects: readonly T[] | undefined,
  reference: string | null,
): T | undefined {
  if (!reference || !projects) return undefined;
  const exact = projects.find((project) => project.ref === reference);
  if (exact) return exact;
  const legacy = projects.filter((project) => project.key === reference);
  return legacy.length === 1 ? legacy[0] : undefined;
}
