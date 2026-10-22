import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';

test('clipboard fragments from the view compose with the editor schema', () => {
  const fromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
  const fromTiptap = createRequire(fromWeb.resolve('@tiptap/pm/view'));
  const fromView = createRequire(fromTiptap.resolve('prosemirror-view'));
  const { Schema } = fromWeb('@tiptap/pm/model');
  const { Fragment } = fromView('prosemirror-model');
  const schema = new Schema({
    nodes: {
      doc: { content: 'block+' },
      paragraph: { group: 'block', content: 'text*' },
      text: { group: 'inline' },
    },
  });
  const paragraph = schema.nodes.paragraph.create(null, schema.text('Pasted text'));
  const document = schema.nodes.doc.create(null, Fragment.from(paragraph));

  expect(document.textContent).toBe('Pasted text');
});
