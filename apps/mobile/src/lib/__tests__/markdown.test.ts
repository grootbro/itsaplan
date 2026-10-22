import { describe, expect, test } from 'bun:test';
import { markdownTokens, markdownUrl, markdownTextValue } from '../markdown';

describe('native Markdown content', () => {
  test('keeps headings, rich inline text, lists and fenced code structured', () => {
    const tokens = markdownTokens(
      '# Plan\n\nA **bold** task with [context](https://example.com).\n\n- [x] Done\n- [ ] Next\n\n```ts\nconst ready = true;\n```',
    );
    expect(tokens.filter((token) => token.type !== 'space').map((token) => token.type)).toEqual([
      'heading',
      'paragraph',
      'list',
      'code',
    ]);
    const list = tokens.find((token) => token.type === 'list');
    expect(list?.type === 'list' && list.items.map((item) => item.checked)).toEqual([true, false]);
  });
  test('preserves table cell content and alignment for native rendering', () => {
    const table = markdownTokens('| Name | State |\n| --- | --- |\n| Task | **Done** |')[0];
    expect(table.type).toBe('table');
    if (table.type !== 'table') throw new Error('Expected table');
    expect(table.header.map((cell) => cell.text)).toEqual(['Name', 'State']);
    expect(table.rows[0][1].tokens[0].type).toBe('strong');
  });
  test('keeps raw HTML as inert text tokens', () => {
    const tokens = markdownTokens('<script>alert(1)</script>');
    expect(tokens[0].type).toBe('html');
    expect(tokens[0].raw).toContain('<script>');
  });
  test('decodes text entities and destinations before validating link schemes', () => {
    expect(markdownTextValue('Tom &amp; Jerry &#169; &lt;3')).toBe('Tom & Jerry © <3');
    expect(markdownTextValue('&copy without a semicolon')).toBe('&copy without a semicolon');
    expect(markdownUrl('https://example.com/?a=1&amp;b=2', 'https://plan-api.sekta.work')).toBe(
      'https://example.com/?a=1&b=2',
    );
    expect(markdownUrl('javascript&colon;alert(1)', 'https://plan-api.sekta.work')).toBeNull();
    const code = markdownTokens('```\n&amp;\n```')[0];
    expect(code.type === 'code' && code.text).toBe('&amp;');
  });
  test('opens only supported web/mail destinations, resolving relative attachments', () => {
    expect(markdownUrl('/attachments/123', 'https://plan-api.sekta.work')).toBe(
      'https://plan-api.sekta.work/attachments/123',
    );
    expect(markdownUrl('https://example.com/docs', 'https://plan-api.sekta.work')).toBe(
      'https://example.com/docs',
    );
    expect(markdownUrl('mailto:team@example.com', 'https://plan-api.sekta.work')).toBe(
      'mailto:team@example.com',
    );
    for (const href of [
      'javascript:alert(1)',
      'data:text/html,test',
      'file:///etc/passwd',
      'intent://example',
      'https://[invalid',
    ])
      expect(markdownUrl(href, 'https://plan-api.sekta.work')).toBeNull();
  });
});
