import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText } from 'lucide-react';
import type { IssueTemplate } from '@/lib/api';
import { Pill } from '@/components/common/fields/Pill';
import PopoverPick from '@/components/common/fields/PopoverPick';
import ConfirmDialog from '@/components/common/overlay/ConfirmDialog';
import { templateTextChanges, replacesDraftText } from '../../utils/issueTemplateText';

// Picks the template the new issue starts from. Applying one fills the dialog in;
// everything it filled stays editable, so there is nothing to un-apply.
export default function NewIssueTemplatePill({
  templates,
  applied,
  title,
  description,
  onApply,
}: {
  templates: IssueTemplate[];
  // The template that was applied last, named on the pill.
  applied: IssueTemplate | null;
  title: string;
  description: string;
  onApply: (template: IssueTemplate) => void;
}) {
  const t = useTranslations('issue.create');
  const [pending, setPending] = useState<IssueTemplate | null>(null);

  function selectTemplate(template: IssueTemplate) {
    const draft = { title, description };
    if (replacesDraftText(draft, templateTextChanges(draft, template))) setPending(template);
    else onApply(template);
  }

  return (
    <>
      <PopoverPick
        trigger={
          <Pill active={applied != null}>
            <FileText />
            <span className="truncate">{applied?.name ?? t('template')}</span>
          </Pill>
        }
        inputPlaceholder={t('applyTemplate')}
        emptyText={t('noTemplates')}
        contentClassName="w-72"
        items={templates.map((template) => ({
          key: String(template.id),
          search: `${template.name} ${template.description}`,
          icon: <FileText />,
          label: template.name,
          trailing: template.description ? (
            <span className="truncate text-xs text-muted-foreground">{template.description}</span>
          ) : undefined,
          selected: template.id === applied?.id,
          onSelect: () => selectTemplate(template),
        }))}
      />
      {pending && (
        <ConfirmDialog
          title={t('replaceDraftTitle')}
          confirmLabel={t('confirmApplyTemplate')}
          onClose={() => setPending(null)}
          onConfirm={async () => {
            onApply(pending);
            setPending(null);
          }}
        >
          <p className="text-sm text-muted-foreground">
            {t('replaceDraftDescription', { name: pending.name })}
          </p>
        </ConfirmDialog>
      )}
    </>
  );
}
