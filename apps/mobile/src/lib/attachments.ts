import type { Attachment } from './types';

export interface PickedAttachment {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
}

export function attachmentUrl(path: string, apiUrl: string) {
  try {
    const relative = path.startsWith('/') && !path.startsWith('//') ? path.slice(1) : path;
    const url = new URL(relative, `${apiUrl.replace(/\/$/, '')}/`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function imageAttachment(type: string) {
  return ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'].includes(type);
}

export function attachmentMarkdown(attachment: Attachment) {
  const label = attachment.filename.replace(/[\r\n]/g, ' ').replace(/[\\[\]]/g, '\\$&');
  const url = attachment.url.replace(/[()\s]/g, (character) => {
    if (character === '(') return '%28';
    if (character === ')') return '%29';
    return encodeURIComponent(character);
  });
  return `${imageAttachment(attachment.contentType) ? '!' : ''}[${label}](${url})`;
}

export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString(undefined, { maximumFractionDigits: 1 })} MB`;
}

export function nativeUploadPart(file: PickedAttachment) {
  return { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' };
}
