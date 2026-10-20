import { Lexer, type MarkedToken } from 'marked';
import { decodeHTMLStrict } from 'entities';

export { decodeHTMLStrict as markdownTextValue } from 'entities';

export function markdownTokens(source: string): MarkedToken[] {
  return Lexer.lex(source, { gfm: true, breaks: true }) as MarkedToken[];
}

export function markdownUrl(href: string, baseUrl: string): string | null {
  try {
    const url = new URL(decodeHTMLStrict(href), baseUrl);
    if (['https:', 'http:', 'mailto:'].includes(url.protocol)) return url.href;
  } catch {
    // Invalid destinations remain readable text.
  }
  return null;
}
