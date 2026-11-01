import type { DiffLine } from '../types/diff';

export function buildSideBySideOutput(lines: DiffLine[]): string {
  let output = 'DIFFCHECKER - SIDE BY SIDE COMPARISON\n';
  output += '='.repeat(80) + '\n\n';

  lines.forEach(line => {
    const originalNumber = line.originalLineNumber?.toString().padStart(4) || '    ';
    const changedNumber = line.changedLineNumber?.toString().padStart(4) || '    ';
    const originalContent = line.originalContent ?? line.content;

    switch (line.type) {
      case 'equal':
        output += `${originalNumber} | ${changedNumber} | ${originalContent}\n`;
        break;
      case 'added':
        output += `     | ${changedNumber} | + ${line.content}\n`;
        break;
      case 'removed':
        output += `${originalNumber} |      | - ${originalContent}\n`;
        break;
      case 'modified':
        output += `${originalNumber} | ${changedNumber} | - ${originalContent}\n`;
        output += `     |      | + ${line.content}\n`;
        break;
    }
  });

  return output;
}

export function buildUnifiedOutput(lines: DiffLine[]): string {
  let output = 'DIFFCHECKER - UNIFIED DIFF\n';
  output += '='.repeat(80) + '\n\n';

  lines.forEach(line => {
    switch (line.type) {
      case 'equal':
        output += ` ${line.content}\n`;
        break;
      case 'added':
        output += `+${line.content}\n`;
        break;
      case 'removed':
        output += `-${line.content}\n`;
        break;
      case 'modified':
        output += `-${line.originalContent ?? line.content}\n`;
        output += `+${line.content}\n`;
        break;
    }
  });

  return output;
}
