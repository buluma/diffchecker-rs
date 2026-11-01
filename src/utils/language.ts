const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  // Web
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  jsonc: 'json',
  
  // Python
  py: 'python',
  pyw: 'python',
  pyi: 'python',
  
  // Java/JVM
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  groovy: 'groovy',
  clj: 'clojure',
  
  // C/C++
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  
  // C#
  cs: 'csharp',
  csx: 'csharp',
  
  // Go
  go: 'go',
  
  // Rust
  rs: 'rust',
  
  // Ruby
  rb: 'ruby',
  erb: 'ruby',
  rake: 'ruby',
  gemspec: 'ruby',
  
  // PHP
  php: 'php',
  phtml: 'php',
  
  // Swift
  swift: 'swift',
  
  // Shell
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'fish',
  
  // SQL
  sql: 'sql',
  
  // Data/Config
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  csv: 'csv',
  tsv: 'tsv',
  ini: 'ini',
  cfg: 'ini',
  conf: 'ini',
  env: 'dotenv',
  
  // Documentation
  md: 'markdown',
  mdx: 'markdown',
  rst: 'rst',
  txt: 'plaintext',
  
  // Logs
  log: 'plaintext',
  out: 'plaintext',
  err: 'plaintext',
  
  // Other
  dockerfile: 'dockerfile',
  dockerignore: 'dockerfile',
  gitignore: 'gitignore',
  gitattributes: 'gitignore',
  makefile: 'makefile',
  cmake: 'cmake',
  vim: 'vim',
  lua: 'lua',
  r: 'r',
  pl: 'perl',
  pm: 'perl',
};

const FILENAME_LANGUAGE_MAP: Record<string, string> = {
  'Dockerfile': 'dockerfile',
  'Makefile': 'makefile',
  'CMakeLists.txt': 'cmake',
  '.gitignore': 'gitignore',
  '.gitattributes': 'gitignore',
  '.dockerignore': 'dockerfile',
  '.env': 'dotenv',
  '.env.example': 'dotenv',
  '.env.local': 'dotenv',
  '.editorconfig': 'ini',
  '.eslintrc': 'json',
  '.prettierrc': 'json',
  'package.json': 'json',
  'tsconfig.json': 'json',
  'composer.json': 'json',
  'Cargo.toml': 'toml',
  'go.mod': 'go',
  'pom.xml': 'xml',
  'build.gradle': 'groovy',
  'settings.gradle': 'groovy',
};

export function detectLanguageFromPath(filePath: string | null): string {
  if (!filePath) return 'plaintext';
  
  const filename = filePath.split('/').pop() || filePath.split('\\').pop() || '';
  
  // Check exact filename matches first
  if (FILENAME_LANGUAGE_MAP[filename]) {
    return FILENAME_LANGUAGE_MAP[filename];
  }
  
  // Check extension
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (EXTENSION_LANGUAGE_MAP[ext]) {
    return EXTENSION_LANGUAGE_MAP[ext];
  }
  
  return 'plaintext';
}

export function detectLanguageFromContent(content: string): string {
  // Shebang detection
  const shebangMatch = content.match(/^#!\s*(.+)$/m);
  if (shebangMatch) {
    const interpreter = shebangMatch[1].split('/').pop() || '';
    if (interpreter.includes('python')) return 'python';
    if (interpreter.includes('node')) return 'javascript';
    if (interpreter.includes('bash') || interpreter.includes('sh')) return 'bash';
    if (interpreter.includes('perl')) return 'perl';
    if (interpreter.includes('ruby')) return 'ruby';
    if (interpreter.includes('php')) return 'php';
  }
  
  // XML declaration
  if (content.trimStart().startsWith('<?xml')) return 'xml';
  
  // HTML doctype
  if (/^<!DOCTYPE html>/i.test(content.trimStart())) return 'html';
  
  // JSON detection
  if (/^\s*[{[]/.test(content.trimStart())) {
    try {
      JSON.parse(content);
      return 'json';
    } catch {}
  }
  
  // YAML detection (simple heuristic)
  if (/^[\w-]+:\s/m.test(content)) return 'yaml';
  
  // CSV detection
  if (content.includes(',') && content.split('\n').every(l => l.split(',').length > 1)) {
    return 'csv';
  }
  
  return 'plaintext';
}
