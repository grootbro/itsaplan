import { describe, expect, test } from 'bun:test';
import { editMarkdown, insertMarkdown } from '../markdown-edit';
import {
  attachmentMarkdown,
  attachmentUrl,
  imageAttachment,
  nativeUploadPart,
} from '../attachments';
import type { Attachment } from '../types';

describe('Native Markdown editing', () => {
  test('wraps selected text and retains UTF-16 selection around emoji', () => {
    expect(editMarkdown('Hello 😀 friend', { start: 6, end: 8 }, 'bold')).toEqual({
      text: 'Hello **😀** friend',
      selection: { start: 8, end: 10 },
    });
  });
  test('inserts a selected placeholder at a collapsed caret', () => {
    expect(editMarkdown('', { start: 0, end: 0 }, 'italic')).toEqual({
      text: '_text_',
      selection: { start: 1, end: 5 },
    });
  });
  test('formats complete selected lines without touching the following line', () => {
    expect(editMarkdown('one\ntwo\nthree', { start: 0, end: 8 }, 'task').text).toBe(
      '- [ ] one\n- [ ] two\nthree',
    );
    expect(editMarkdown('one\ntwo', { start: 0, end: 0 }, 'heading').text).toBe('## one\ntwo');
  });
  test('clamps stale selections and replaces only the intended range', () => {
    expect(insertMarkdown('abc', { start: -2, end: 99 }, 'new')).toEqual({
      text: 'new',
      selection: { start: 3, end: 3 },
    });
    expect(insertMarkdown('abc', { start: 1, end: 2 }, 'X').text).toBe('aXc');
  });
});
describe('Attachment presentation', () => {
  test('resolves attachment paths under an API base path', () => {
    expect(attachmentUrl('/attachments/abc/raw', 'https://host.test/api')).toBe(
      'https://host.test/api/attachments/abc/raw',
    );
    expect(attachmentUrl('https://cdn.test/file', 'https://host.test/api')).toBe(
      'https://cdn.test/file',
    );
    expect(attachmentUrl('javascript:alert(1)', 'https://host.test')).toBeNull();
  });
  test('preserves provider names and MIME even without a file extension', () => {
    expect(
      nativeUploadPart({
        uri: 'file:///cache/random-id',
        name: 'Design notes',
        mimeType: 'application/pdf',
      }),
    ).toEqual({ uri: 'file:///cache/random-id', name: 'Design notes', type: 'application/pdf' });
    expect(nativeUploadPart({ uri: 'file:///cache/x', name: 'x' }).type).toBe(
      'application/octet-stream',
    );
  });
  test('escapes Markdown filenames and URL delimiters', () => {
    const file = {
      filename: '[draft].png',
      url: '/attachments/a (b)/raw',
      contentType: 'image/png',
    } as Attachment;
    expect(attachmentMarkdown(file)).toBe('![\\[draft\\].png](/attachments/a%20%28b%29/raw)');
    expect(imageAttachment('image/svg+xml')).toBe(false);
    expect(attachmentMarkdown({ ...file, contentType: 'application/pdf' }).startsWith('!')).toBe(
      false,
    );
  });
});
