import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { templateTextChanges, replacesDraftText } from './issueTemplateText';

describe('issue template text', () => {
  const draft = { title: 'Investigate checkout', description: 'Steps already written' };

  it('preserves draft content when a template leaves text unset', () => {
    const changes = templateTextChanges(draft, { titleTemplate: '', descriptionTemplate: '' });
    assert.deepEqual(changes, {});
    assert.equal(replacesDraftText(draft, changes), false);
  });

  it('treats whitespace-only presets as unset', () => {
    assert.deepEqual(
      templateTextChanges(draft, { titleTemplate: '  ', descriptionTemplate: '\n' }),
      {},
    );
  });

  it('requires confirmation before replacing a nonempty title or description', () => {
    for (const template of [
      { titleTemplate: 'Bug report', descriptionTemplate: '' },
      { titleTemplate: '', descriptionTemplate: '## Steps' },
    ]) {
      assert.equal(replacesDraftText(draft, templateTextChanges(draft, template)), true);
    }
  });

  it('fills empty fields without asking, preserving the other field', () => {
    const current = { title: draft.title, description: '' };
    const changes = templateTextChanges(current, {
      titleTemplate: '',
      descriptionTemplate: '## Steps',
    });
    assert.deepEqual(changes, { description: '## Steps' });
    assert.equal(replacesDraftText(current, changes), false);
    assert.deepEqual({ ...current, ...changes }, { title: draft.title, description: '## Steps' });
  });

  it('does not confirm or reset an editor whose text already matches', () => {
    const changes = templateTextChanges(draft, {
      titleTemplate: draft.title,
      descriptionTemplate: draft.description,
    });
    assert.deepEqual(changes, {});
    assert.equal(replacesDraftText(draft, changes), false);
  });

  it('preserves Markdown and applies both nonempty text presets', () => {
    const changes = templateTextChanges(draft, {
      titleTemplate: 'Bug report',
      descriptionTemplate: '## Steps\n\n- [ ] Reproduce\n',
    });
    assert.deepEqual(changes, {
      title: 'Bug report',
      description: '## Steps\n\n- [ ] Reproduce\n',
    });
  });
});
