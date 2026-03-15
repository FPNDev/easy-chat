export function transformNewlinesForMarkdown(message: string) {
  return message.replace(/\n{1}/g, '\n\n');
}
