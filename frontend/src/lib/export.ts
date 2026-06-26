import { Conversation } from './types';

export function exportAsMarkdown(conv: Conversation): void {
  const lines = conv.messages.map(m =>
    `**${m.role}:** ${m.content}`
  );
  const content = `# ${conv.title}\n\n${lines.join('\n\n')}`;
  downloadFile(`${conv.title}.md`, content, 'text/markdown');
}

export function exportAsJson(conv: Conversation): void {
  const content = JSON.stringify(conv.messages, null, 2);
  downloadFile(`${conv.title}.json`, content, 'application/json');
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
