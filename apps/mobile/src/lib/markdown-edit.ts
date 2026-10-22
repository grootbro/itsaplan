export type MarkdownCommand = 'bold' | 'italic' | 'code' | 'heading' | 'bullet' | 'task' | 'quote';
export interface TextSelection {
  start: number;
  end: number;
}

export function editMarkdown(source: string, selection: TextSelection, command: MarkdownCommand) {
  const start = Math.max(0, Math.min(source.length, selection.start));
  const end = Math.max(start, Math.min(source.length, selection.end));
  if (command === 'bold' || command === 'italic' || command === 'code') {
    const marker = { bold: '**', italic: '_', code: '`' }[command];
    const selected = source.slice(start, end) || 'text';
    return {
      text: source.slice(0, start) + marker + selected + marker + source.slice(end),
      selection: { start: start + marker.length, end: start + marker.length + selected.length },
    };
  }
  const first = start === 0 ? 0 : source.lastIndexOf('\n', start - 1) + 1;
  const last = end > start && source[end - 1] === '\n' ? end - 1 : end;
  const boundary = source.indexOf('\n', last);
  const finish = boundary < 0 ? source.length : boundary;
  const prefix = { heading: '## ', bullet: '- ', task: '- [ ] ', quote: '> ' }[command];
  const text = source
    .slice(first, finish)
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
  return {
    text: source.slice(0, first) + text + source.slice(finish),
    selection: { start: first, end: first + text.length },
  };
}

export function insertMarkdown(source: string, selection: TextSelection, insertion: string) {
  const start = Math.max(0, Math.min(source.length, selection.start));
  const end = Math.max(start, Math.min(source.length, selection.end));
  return {
    text: source.slice(0, start) + insertion + source.slice(end),
    selection: { start: start + insertion.length, end: start + insertion.length },
  };
}
