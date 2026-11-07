import { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import type { FileContent } from '../types/diff';
import { useHighlightedLines } from '../hooks/useHighlightedLines';
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
  const [viewport, setViewport] = useState({ top: 0, height: 560 });
  const lines = useMemo(() => file.content.split('\n'), [file.content]);
  // Keep this in sync with the fixed editor line height in App.css.
  const lineHeight = 20;
  const start = Math.min(lines.length - 1, Math.max(0, Math.floor(viewport.top / lineHeight) - 20));
  const end = Math.min(lines.length, Math.ceil((viewport.top + viewport.height) / lineHeight) + 20);
  const visibleLines = useMemo(() => lines.slice(start, end), [lines, start, end]);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    const update = () => setViewport({ top: element.scrollTop, height: element.clientHeight || 560 });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Sync scroll position
  useEffect(() => {
    if (textareaRef.current && scrollTop !== undefined) {
      textareaRef.current.scrollTop = scrollTop;
      setViewport({ top: textareaRef.current.scrollTop, height: textareaRef.current.clientHeight || 560 });
    }
  }, [scrollTop]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    setViewport({ top: target.scrollTop, height: target.clientHeight || 560 });
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
  const highlighted = useHighlightedLines(visibleLines, file.language);

  // Highlighted code for syntax highlighting display
  const highlightedLines = useMemo(() => {
    return visibleLines.map((line, i) => {
      const html = highlighted.get(line) ?? ' ';
      const isHighlighted = highlightLine === start + i + 1;
      return (
        <div key={i} className={`highlighted-line ${isHighlighted ? 'highlighted' : ''}`}>
          <span className="line-content" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      );
    });
  }, [visibleLines, start, highlightLine, highlighted]);

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
            <div style={{ height: start * lineHeight }} />
            {visibleLines.map((_, index) => {
              const num = start + index + 1;
              return (
              <div key={num} className={`line-number ${highlightLine === num ? 'highlighted' : ''}`}>
                {num}
              </div>
              );
            })}
            <div style={{ height: (lines.length - end) * lineHeight }} />
          </div>
        )}
        
        <div className="editor-content">
          {/* Syntax highlighted overlay (read-only visual) */}
          <pre 
            className="highlighted-code" 
            ref={highlightedRef}
            aria-hidden="true"
          >
            <div style={{ height: start * lineHeight }} />
            {highlightedLines}
            <div style={{ height: (lines.length - end) * lineHeight }} />
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
