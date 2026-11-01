import { useRef, useEffect, useCallback, useMemo } from 'react';
import type { FileContent } from '../types/diff';
import { highlightCode } from '../utils/highlight';
import { MAX_INPUT_BYTES, getInputLimitError } from '../utils/limits';

interface EditorProps {
  file: FileContent;
  onChange: (content: string, path?: string) => void;
  onError?: (message: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  highlightLine?: number;
  scrollTop?: number;
  onScroll?: (scrollTop: number) => void;
}

export function Editor({
  file,
  onChange,
  onError,
  placeholder = 'Paste text or drop a file here...',
  readOnly = false,
  showLineNumbers = true,
  highlightLine,
  scrollTop,
  onScroll,
}: EditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync scroll position
  useEffect(() => {
    if (textareaRef.current && scrollTop !== undefined) {
      textareaRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    if (onScroll) {
      onScroll(target.scrollTop);
    }
    // Sync line numbers scroll
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = target.scrollTop;
    }
    // Sync highlighted view scroll
    if (highlightedRef.current) {
      highlightedRef.current.scrollTop = target.scrollTop;
    }
  }, [onScroll]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!readOnly) {
      onChange(e.target.value);
    }
  }, [onChange, readOnly]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    if (readOnly) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > MAX_INPUT_BYTES) {
        onError?.('Each input is limited to 5 MiB.');
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => onError?.(`Could not read ${file.name}.`);
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content !== 'string') {
          onError?.(`Could not read ${file.name}.`);
          return;
        }
        const error = getInputLimitError(content);
        if (error) onError?.(error);
        else onChange(content, file.name);
      };
      reader.readAsText(file);
    }
  }, [onChange, onError, readOnly]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Generate line numbers
  const lineNumbers = useMemo(() => {
    const lines = file.content.split('\n');
    return lines.map((_, i) => i + 1);
  }, [file.content]);

  // Highlighted code for syntax highlighting display
  const highlightedLines = useMemo(() => {
    const lines = file.content.split('\n');
    return lines.map((line, i) => {
      const highlighted = highlightCode(line || ' ', file.language);
      const isHighlighted = highlightLine === i + 1;
      return (
        <div key={i} className={`highlighted-line ${isHighlighted ? 'highlighted' : ''}`}>
          <span className="line-content" dangerouslySetInnerHTML={{ __html: highlighted }} />
        </div>
      );
    });
  }, [file.content, file.language, highlightLine]);

  return (
    <div className="editor-container" ref={containerRef}>
      <div className="editor-header">
        <span className="editor-language">{file.language}</span>
        {file.path && <span className="editor-path" title={file.path}>{file.path}</span>}
      </div>
      
      <div className="editor-wrapper">
        {showLineNumbers && (
          <div 
            className="line-numbers" 
            ref={lineNumbersRef}
            aria-hidden="true"
          >
            {lineNumbers.map(num => (
              <div key={num} className={`line-number ${highlightLine === num ? 'highlighted' : ''}`}>
                {num}
              </div>
            ))}
          </div>
        )}
        
        <div className="editor-content">
          {/* Syntax highlighted overlay (read-only visual) */}
          <pre 
            className="highlighted-code" 
            ref={highlightedRef}
            aria-hidden="true"
          >
            {highlightedLines}
          </pre>
          
          {/* Actual editable textarea */}
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={file.content}
            onChange={handleChange}
            onScroll={handleScroll}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            placeholder={placeholder}
            readOnly={readOnly}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            data-language={file.language}
          />
        </div>
      </div>
    </div>
  );
}
