export function worklistLayout(width: number, fontScale = 1) {
  const split = Number.isFinite(width) && width >= 900 && fontScale < 1.6;
  const listWidth = split ? Math.min(420, Math.round(width * 0.4)) : width;
  return { split, listWidth };
}

export function tabletNavigation(width: number, fontScale: number) {
  return width >= 768 && fontScale < 1.6;
}
