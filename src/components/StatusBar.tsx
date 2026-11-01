import type { FileContent } from '../types/diff';

interface StatusBarProps {
  originalFile: FileContent;
  changedFile: FileContent;
  isComputing: boolean;
  message?: string | null;
  version?: string;
}

const sourceLabel = (file: FileContent) => (file.content ? '(pasted)' : '(empty)');

export function StatusBar({ originalFile, changedFile, isComputing, message, version }: StatusBarProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const originalSize = new Blob([originalFile.content]).size;
  const changedSize = new Blob([changedFile.content]).size;
  const originalLines = originalFile.content.split('\n').length;
  const changedLines = changedFile.content.split('\n').length;

  return (
    <div className="status-bar">
      <div className="status-left">
        {message ? (
          <span className="status-error" role="status" aria-live="polite">{message}</span>
        ) : isComputing && (
          <span className="status-computing">
            <span className="spinner" />
            Computing diff...
          </span>
        )}
      </div>
      
      <div className="status-center">
        <span className="status-item">
          <span className="status-label">Original:</span>
          <span className="status-value">{originalFile.path ?? sourceLabel(originalFile)}</span>
          <span className="status-sep">•</span>
          <span className="status-value">{originalLines} lines</span>
          <span className="status-sep">•</span>
          <span className="status-value">{formatSize(originalSize)}</span>
          <span className="status-sep">•</span>
          <span className="status-value">{originalFile.language}</span>
        </span>
        
        <span className="status-item">
          <span className="status-label">Changed:</span>
          <span className="status-value">{changedFile.path ?? sourceLabel(changedFile)}</span>
          <span className="status-sep">•</span>
          <span className="status-value">{changedLines} lines</span>
          <span className="status-sep">•</span>
          <span className="status-value">{formatSize(changedSize)}</span>
          <span className="status-sep">•</span>
          <span className="status-value">{changedFile.language}</span>
        </span>
      </div>
      
      <div className="status-right">
        {version && <span className="status-version">v{version}</span>}
      </div>
    </div>
  );
}
