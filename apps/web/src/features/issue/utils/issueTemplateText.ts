import type { IssueTemplate } from '@/lib/api';

interface DraftText {
  title: string;
  description: string;
}

// Empty presets mean "leave unchanged", just like unset template properties.
export function templateTextChanges(
  draft: DraftText,
  template: Pick<IssueTemplate, 'titleTemplate' | 'descriptionTemplate'>,
): Partial<DraftText> {
  const changes: Partial<DraftText> = {};
  if (template.titleTemplate.trim() && template.titleTemplate !== draft.title) {
    changes.title = template.titleTemplate;
  }
  if (template.descriptionTemplate.trim() && template.descriptionTemplate !== draft.description) {
    changes.description = template.descriptionTemplate;
  }
  return changes;
}

export function replacesDraftText(draft: DraftText, changes: Partial<DraftText>): boolean {
  return (
    (changes.title !== undefined && draft.title.trim() !== '') ||
    (changes.description !== undefined && draft.description.trim() !== '')
  );
}
