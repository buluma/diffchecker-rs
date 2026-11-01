export const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const MAX_INPUT_LINES = 10_000;

export function getInputLimitError(content: string): string | null {
  if (new Blob([content]).size > MAX_INPUT_BYTES) {
    return 'Each input is limited to 5 MiB.';
  }

  let lines = 1;
  for (const character of content) {
    if (character === '\n' && ++lines > MAX_INPUT_LINES) {
      return `Each input is limited to ${MAX_INPUT_LINES.toLocaleString()} lines.`;
    }
  }

  return null;
}
