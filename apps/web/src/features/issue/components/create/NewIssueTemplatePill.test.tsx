import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { NextIntlClientProvider } from 'next-intl';
import { JSDOM } from 'jsdom';
import type { IssueTemplate } from '@/lib/api';
import issueMessages from '../../../../../messages/en/issue.json';
import commonMessages from '../../../../../messages/en/common.json';

const template: IssueTemplate = {
  id: 1,
  name: 'Bug report',
  description: 'Report a bug',
  titleTemplate: 'Bug',
  descriptionTemplate: '## Steps',
  typeId: null,
  columnId: null,
  priority: null,
  assigneeUserId: null,
  labelIds: [],
};

const replacedGlobals = [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'HTMLInputElement',
  'Element',
  'Node',
  'NodeFilter',
  'MutationObserver',
  'CustomEvent',
  'Event',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'ResizeObserver',
  'IS_REACT_ACT_ENVIRONMENT',
] as const;

let dom: JSDOM;
let root: Root;
let originalGlobalDescriptors: Map<string, PropertyDescriptor | undefined>;
let NewIssueTemplatePill: typeof import('./NewIssueTemplatePill').default;

beforeEach(async () => {
  originalGlobalDescriptors = new Map(
    replacedGlobals.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
  );
  dom = new JSDOM('<!doctype html><div id="root"></div>', { pretendToBeVisual: true });
  for (const name of replacedGlobals) {
    if (name in dom.window) {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        value: Reflect.get(dom.window, name),
      });
    }
  }
  // JSDOM has no layout; cmdk only needs these APIs to measure/scroll its list.
  Object.defineProperties(globalThis, {
    ResizeObserver: {
      configurable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  dom.window.HTMLElement.prototype.scrollIntoView = () => {};
  const { createRoot } = await import('react-dom/client');
  NewIssueTemplatePill = (await import('./NewIssueTemplatePill')).default;
  root = createRoot(document.querySelector('#root')!);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
    // Radix restores focus on the next tick; keep this document alive until then.
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  dom.window.close();
  for (const [name, descriptor] of originalGlobalDescriptors) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
});

async function click(element: Element | null) {
  assert.ok(element);
  await act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function button(label: string) {
  return [...document.querySelectorAll('button')].find((el) => el.textContent === label) ?? null;
}

async function renderPicker(
  title: string,
  description: string,
  selected: IssueTemplate[],
  preset = template,
) {
  await act(async () =>
    root.render(
      <NextIntlClientProvider
        locale="en"
        timeZone="UTC"
        messages={{ issue: issueMessages, common: commonMessages }}
      >
        <NewIssueTemplatePill
          templates={[preset]}
          applied={null}
          title={title}
          description={description}
          onApply={(value) => selected.push(value)}
        />
      </NextIntlClientProvider>,
    ),
  );
  await click(button('Template'));
  await click(document.querySelector('[role="option"]'));
}

describe('NewIssueTemplatePill', () => {
  it('keeps the draft untouched until the replacement is confirmed', async () => {
    const selected: IssueTemplate[] = [];
    await renderPicker('My title', 'My steps', selected);
    assert.deepEqual(selected, []);
    assert.ok(
      document.querySelector('[role="dialog"]')?.textContent?.includes('Replace draft text?'),
    );

    await click(button('Cancel'));
    assert.deepEqual(selected, []);
    assert.equal(document.querySelector('[role="dialog"]'), null);

    await click(button('Template'));
    await click(document.querySelector('[role="option"]'));
    await click(button('Apply template'));
    assert.deepEqual(selected, [template]);
    assert.equal(document.querySelector('[role="dialog"]'), null);
  });

  it('applies to an empty draft without a confirmation', async () => {
    const selected: IssueTemplate[] = [];
    await renderPicker('', '', selected);
    assert.deepEqual(selected, [template]);
    assert.equal(document.querySelector('[role="dialog"]'), null);
  });

  it('applies property-only templates without prompting to replace text', async () => {
    const selected: IssueTemplate[] = [];
    const preset = { ...template, titleTemplate: '', descriptionTemplate: '', priority: 'high' };
    await renderPicker('My title', 'My steps', selected, preset);
    assert.deepEqual(selected, [preset]);
    assert.equal(document.querySelector('[role="dialog"]'), null);
  });
});
