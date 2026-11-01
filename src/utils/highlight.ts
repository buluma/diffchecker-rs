// Lightweight syntax highlighting tokenization
// This provides basic tokenization for common languages without heavy dependencies

interface Token {
  type: string;
  value: string;
}

type Tokenizer = (code: string) => Token[];

const KEYWORDS: Record<string, string[]> = {
  javascript: [
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
    'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch',
    'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
    'let', 'static', 'enum', 'implements', 'interface', 'package', 'protected',
    'private', 'public', 'await', 'async', 'of', 'from', 'as', 'get', 'set',
    'null', 'true', 'false', 'undefined', 'NaN', 'Infinity'
  ],
  typescript: [
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
    'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function',
    'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch',
    'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
    'let', 'static', 'enum', 'implements', 'interface', 'package', 'protected',
    'private', 'public', 'await', 'async', 'of', 'from', 'as', 'get', 'set',
    'null', 'true', 'false', 'undefined', 'NaN', 'Infinity',
    'type', 'interface', 'abstract', 'readonly', 'declare', 'namespace', 'module',
    'never', 'unknown', 'any', 'void', 'object', 'tuple', 'keyof', 'typeof'
  ],
  python: [
    'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
    'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
    'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass',
    'raise', 'return', 'try', 'while', 'with', 'yield', 'None', 'True', 'False',
    'self', 'cls', 'super', 'property', 'staticmethod', 'classmethod'
  ],
  java: [
    'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
    'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
    'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements',
    'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package',
    'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp',
    'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient',
    'try', 'void', 'volatile', 'while', 'null', 'true', 'false'
  ],
  csharp: [
    'abstract', 'as', 'base', 'bool', 'break', 'byte', 'case', 'catch', 'char',
    'checked', 'class', 'const', 'continue', 'decimal', 'default', 'delegate',
    'do', 'double', 'else', 'enum', 'event', 'explicit', 'extern', 'false',
    'finally', 'fixed', 'float', 'for', 'foreach', 'goto', 'if', 'implicit',
    'in', 'int', 'interface', 'internal', 'is', 'lock', 'long', 'namespace',
    'new', 'null', 'object', 'operator', 'out', 'override', 'params', 'private',
    'protected', 'public', 'readonly', 'ref', 'return', 'sbyte', 'sealed',
    'short', 'sizeof', 'stackalloc', 'static', 'string', 'struct', 'switch',
    'this', 'throw', 'true', 'try', 'typeof', 'uint', 'ulong', 'unchecked',
    'unsafe', 'ushort', 'using', 'virtual', 'void', 'volatile', 'while'
  ],
  go: [
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else',
    'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface',
    'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type',
    'var', 'true', 'false', 'nil', 'iota', 'make', 'new', 'len', 'cap', 'append',
    'copy', 'delete', 'panic', 'recover', 'print', 'println', 'complex', 'real',
    'imag', 'close', 'error'
  ],
  rust: [
    'as', 'break', 'const', 'continue', 'crate', 'else', 'enum', 'extern',
    'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod',
    'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct',
    'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while',
    'async', 'await', 'dyn', 'macro', 'union', 'box', 'try', 'await'
  ],
  ruby: [
    'alias', 'and', 'begin', 'break', 'case', 'class', 'def', 'defined?',
    'do', 'else', 'elsif', 'end', 'ensure', 'false', 'for', 'if', 'in',
    'module', 'next', 'nil', 'not', 'or', 'redo', 'rescue', 'retry', 'return',
    'self', 'super', 'then', 'true', 'undef', 'unless', 'until', 'when',
    'while', 'yield', 'BEGIN', 'END', '__FILE__', '__LINE__', '__ENCODING__'
  ],
  php: [
    'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch',
    'class', 'clone', 'const', 'continue', 'declare', 'default', 'die', 'do',
    'echo', 'else', 'elseif', 'empty', 'enddeclare', 'endfor', 'endforeach',
    'endif', 'endswitch', 'endwhile', 'eval', 'exit', 'extends', 'final',
    'finally', 'for', 'foreach', 'function', 'global', 'goto', 'if', 'implements',
    'include', 'include_once', 'instanceof', 'insteadof', 'interface', 'isset',
    'list', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public',
    'require', 'require_once', 'return', 'static', 'switch', 'throw', 'trait',
    'try', 'unset', 'use', 'var', 'while', 'xor', 'yield', 'true', 'false', 'null'
  ],
  swift: [
    'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate',
    'func', 'import', 'init', 'inout', 'internal', 'let', 'open', 'operator',
    'private', 'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript',
    'typealias', 'var', 'break', 'case', 'continue', 'default', 'defer', 'do',
    'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return',
    'switch', 'where', 'while', 'as', 'catch', 'false', 'is', 'nil', 'rethrows',
    'super', 'self', 'Self', 'throw', 'throws', 'true', 'try', 'Any', 'AnyObject'
  ],
  kotlin: [
    'abstract', 'actual', 'annotation', 'as', 'as?', 'break', 'by', 'catch',
    'class', 'companion', 'const', 'constructor', 'continue', 'crossinline',
    'data', 'delegate', 'do', 'dynamic', 'else', 'enum', 'expect', 'external',
    'false', 'final', 'field', 'file', 'final', 'for', 'fun', 'get', 'if',
    'import', 'in', 'infix', 'init', 'inline', 'inner', 'interface', 'internal',
    'is', 'lateinit', 'noinline', 'null', 'object', 'open', 'operator', 'out',
    'override', 'package', 'param', 'private', 'property', 'protected', 'public',
    'receiver', 'reified', 'return', 'sealed', 'set', 'setparam', 'super',
    'suspend', 'tailrec', 'this', 'throw', 'true', 'try', 'typealias', 'typeof',
    'var', 'vararg', 'when', 'where', 'while', 'yield'
  ],
  bash: [
    'if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'until', 'do', 'done',
    'case', 'esac', 'function', 'return', 'break', 'continue', 'exit', 'export',
    'local', 'readonly', 'declare', 'set', 'unset', 'shift', 'source', '.',
    'true', 'false', 'test', '[', '[[', ']', ']]'
  ],
  sql: [
    'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
    'ALTER', 'TABLE', 'INDEX', 'VIEW', 'DATABASE', 'SCHEMA', 'JOIN', 'INNER',
    'LEFT', 'RIGHT', 'OUTER', 'ON', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN',
    'LIKE', 'BETWEEN', 'EXISTS', 'UNION', 'ALL', 'ORDER', 'BY', 'GROUP', 'HAVING',
    'LIMIT', 'OFFSET', 'DISTINCT', 'AS', 'ASC', 'DESC', 'PRIMARY', 'KEY',
    'FOREIGN', 'REFERENCES', 'CONSTRAINT', 'DEFAULT', 'UNIQUE', 'CHECK',
    'VALUES', 'SET', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'BEGIN', 'COMMIT',
    'ROLLBACK', 'TRANSACTION', 'GRANT', 'REVOKE'
  ],
  json: [],
  yaml: [],
  xml: [],
  html: [
    'div', 'span', 'p', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td',
    'th', 'thead', 'tbody', 'form', 'input', 'button', 'select', 'option',
    'textarea', 'label', 'header', 'footer', 'nav', 'section', 'article',
    'aside', 'main', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br', 'hr'
  ],
  css: [
    'color', 'background', 'margin', 'padding', 'border', 'width', 'height',
    'display', 'position', 'top', 'right', 'bottom', 'left', 'flex', 'grid',
    'font', 'text', 'align', 'justify', 'content', 'z-index', 'opacity',
    'transform', 'transition', 'animation', 'media', 'hover', 'focus',
    'before', 'after', 'nth-child', 'first-child', 'last-child'
  ],
};

function createTokenizer(language: string): Tokenizer {
  const keywords = new Set(KEYWORDS[language] || []);
  const isKeyword = (word: string) => keywords.has(word);
  
  const patterns: [RegExp, string][] = [
    // Comments
    [/\/\/.*$/, 'comment'],
    [/\/\*[\s\S]*?\*\//, 'comment'],
    [/#.*$/, 'comment'],
    [/<!--[\s\S]*?-->/, 'comment'],
    
    // Strings
    [/"(?:[^"\\]|\\.)*"/, 'string'],
    [/'(?:[^'\\]|\\.)*'/, 'string'],
    [/`(?:[^`\\]|\\.)*`/, 'string'],
    
    // Numbers
    [/\b\d+\.?\d*([eE][+-]?\d+)?\b/, 'number'],
    
    // Operators
    [/[+\-*/%=<>!&|^~?:]+/, 'operator'],
    
    // Punctuation
    [/[{}[\](),.;]/, 'punctuation'],
    
    // Keywords/Identifiers
    [/\b[a-zA-Z_$][a-zA-Z0-9_$]*\b/, 'identifier'],
    
    // Whitespace
    [/\s+/, 'whitespace'],
  ];
  
  return (code: string) => {
    const tokens: Token[] = [];
    let remaining = code;
    
    while (remaining.length > 0) {
      let matched = false;
      
      for (const [pattern, type] of patterns) {
        const match = remaining.match(pattern);
        if (match && match.index === 0) {
          const value = match[0];
          let tokenType = type;
          
          if (type === 'identifier' && isKeyword(value)) {
            tokenType = 'keyword';
          }
          
          tokens.push({ type: tokenType, value });
          remaining = remaining.slice(value.length);
          matched = true;
          break;
        }
      }
      
      if (!matched) {
        // Fallback: consume one character
        tokens.push({ type: 'unknown', value: remaining[0] });
        remaining = remaining.slice(1);
      }
    }
    
    // Merge adjacent tokens of same type
    const merged: Token[] = [];
    for (const token of tokens) {
      const last = merged[merged.length - 1];
      if (last && last.type === token.type && token.type !== 'whitespace') {
        last.value += token.value;
      } else {
        merged.push({ ...token });
      }
    }
    
    return merged;
  };
}

const tokenizerCache = new Map<string, Tokenizer>();
const MAX_HIGHLIGHT_LINE_CHARS = 100_000;

export const SUPPORTED_LANGUAGES = Object.keys(KEYWORDS);

export function tokenize(code: string, language: string): Token[] {
  if (!tokenizerCache.has(language)) {
    tokenizerCache.set(language, createTokenizer(language));
  }
  return tokenizerCache.get(language)!(code);
}

export function highlightCode(code: string, language: string): string {
  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Plain text and minified/very long lines do not benefit from tokenization.
  if (language === 'plaintext' || code.length > MAX_HIGHLIGHT_LINE_CHARS) return escapeHtml(code);

  const tokens = tokenize(code, language);
  return tokens.map(token => {
    const escaped = escapeHtml(token.value);
    return `<span class="token token-${token.type}">${escaped}</span>`;
  }).join('');
}
