import React, { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import './ChordProEditor.css';

interface ChordProEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  style?: React.CSSProperties;
  required?: boolean;
  allowDrop?: boolean; // New prop to enable/disable drop functionality
}

interface Token {
  type: 'chord' | 'directive' | 'comment' | 'lyrics';
  content: string;
  start: number;
  end: number;
}

const ChordProEditor = forwardRef<HTMLTextAreaElement, ChordProEditorProps>(({
  value,
  onChange,
  placeholder = '',
  rows = 6,
  id,
  style,
  required = false,
  allowDrop = true, // Enable drop by default
}, ref) => {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
  const highlightRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Parse ChordPro content and identify tokens
  const parseChordPro = (text: string): Token[] => {
    const tokens: Token[] = [];
    const lines = text.split('\n');
    let currentIndex = 0;

    lines.forEach((line, lineIndex) => {
      const lineStart = currentIndex;

      // Comments (lines starting with #)
      if (line.trim().startsWith('#')) {
        tokens.push({
          type: 'comment',
          content: line,
          start: lineStart,
          end: lineStart + line.length,
        });
      }
      // Directives (content within curly braces)
      else if (line.includes('{') && line.includes('}')) {
        let tempContent = line;
        let tempStart = lineStart;

        while (tempContent.includes('{') && tempContent.includes('}')) {
          const startBrace = tempContent.indexOf('{');
          const endBrace = tempContent.indexOf('}', startBrace);

          if (startBrace !== -1 && endBrace !== -1) {
            // Add lyrics before directive
            if (startBrace > 0) {
              tokens.push({
                type: 'lyrics',
                content: tempContent.substring(0, startBrace),
                start: tempStart,
                end: tempStart + startBrace,
              });
            }

            // Add directive
            tokens.push({
              type: 'directive',
              content: tempContent.substring(startBrace, endBrace + 1),
              start: tempStart + startBrace,
              end: tempStart + endBrace + 1,
            });

            tempStart = tempStart + endBrace + 1;
            tempContent = tempContent.substring(endBrace + 1);
          } else {
            break;
          }
        }

        // Add remaining content as lyrics
        if (tempContent.length > 0) {
          tokens.push({
            type: 'lyrics',
            content: tempContent,
            start: tempStart,
            end: tempStart + tempContent.length,
          });
        }
      }
      // Lines with chords (content within square brackets)
      else if (line.includes('[') && line.includes(']')) {
        let tempContent = line;
        let tempStart = lineStart;

        while (tempContent.includes('[') && tempContent.includes(']')) {
          const startBracket = tempContent.indexOf('[');
          const endBracket = tempContent.indexOf(']', startBracket);

          if (startBracket !== -1 && endBracket !== -1) {
            // Add lyrics before chord
            if (startBracket > 0) {
              tokens.push({
                type: 'lyrics',
                content: tempContent.substring(0, startBracket),
                start: tempStart,
                end: tempStart + startBracket,
              });
            }

            // Add chord
            tokens.push({
              type: 'chord',
              content: tempContent.substring(startBracket, endBracket + 1),
              start: tempStart + startBracket,
              end: tempStart + endBracket + 1,
            });

            tempStart = tempStart + endBracket + 1;
            tempContent = tempContent.substring(endBracket + 1);
          } else {
            break;
          }
        }

        // Add remaining content as lyrics
        if (tempContent.length > 0) {
          tokens.push({
            type: 'lyrics',
            content: tempContent,
            start: tempStart,
            end: tempStart + tempContent.length,
          });
        }
      }
      // Regular lyrics
      else {
        tokens.push({
          type: 'lyrics',
          content: line,
          start: lineStart,
          end: lineStart + line.length,
        });
      }

      // Account for newline character (except for last line)
      currentIndex =
        lineStart + line.length + (lineIndex < lines.length - 1 ? 1 : 0);
    });

    return tokens;
  };

  // Generate highlighted HTML
  const generateHighlightedHTML = (text: string): string => {
    if (!text) return '';

    const tokens = parseChordPro(text);
    let highlightedHTML = '';
    let lastEnd = 0;

    tokens.forEach((token) => {
      // Add any text that wasn't tokenized
      if (token.start > lastEnd) {
        const skippedText = text.substring(lastEnd, token.start);
        highlightedHTML += escapeHtml(skippedText);
      }

      // Add the token with its CSS class
      const escapedContent = escapeHtml(token.content);
      highlightedHTML += `<span class="chordpro-${token.type}">${escapedContent}</span>`;

      lastEnd = token.end;
    });

    // Add any remaining text
    if (lastEnd < text.length) {
      highlightedHTML += escapeHtml(text.substring(lastEnd));
    }

    return highlightedHTML.replace(/\n/g, '<br>');
  };

  // Escape HTML characters
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Synchronize scroll between textarea and highlight layer
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current && !isScrolling) {
      setIsScrolling(true);
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
      setTimeout(() => setIsScrolling(false), 10);
    }
  }, [isScrolling, textareaRef]);

  // Calculate the text position from mouse coordinates
  const getTextPositionFromPoint = useCallback((x: number, y: number): number => {
    const textarea = textareaRef.current;
    if (!textarea) return 0;

    // Get the textarea's bounding rect
    const rect = textarea.getBoundingClientRect();
    
    // Calculate relative position within the textarea
    const relativeX = x - rect.left - parseFloat(getComputedStyle(textarea).paddingLeft);
    const relativeY = y - rect.top - parseFloat(getComputedStyle(textarea).paddingTop) + textarea.scrollTop;
    
    // Use a temporary span to measure character positions
    const computedStyle = getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight);
    const fontSize = parseFloat(computedStyle.fontSize);
    const fontFamily = computedStyle.fontFamily;
    
    // Create a temporary element for measurement
    const tempElement = document.createElement('div');
    tempElement.style.position = 'absolute';
    tempElement.style.left = '-9999px';
    tempElement.style.fontFamily = fontFamily;
    tempElement.style.fontSize = fontSize + 'px';
    tempElement.style.lineHeight = lineHeight + 'px';
    tempElement.style.whiteSpace = 'pre-wrap';
    tempElement.style.wordWrap = 'break-word';
    tempElement.style.width = (rect.width - parseFloat(getComputedStyle(textarea).paddingLeft) - parseFloat(getComputedStyle(textarea).paddingRight)) + 'px';
    
    document.body.appendChild(tempElement);
    
    try {
      // Calculate line number
      const lineNumber = Math.floor(relativeY / lineHeight);
      const lines = value.split('\n');
      
      if (lineNumber >= lines.length) {
        // Position at end of text
        return value.length;
      }
      
      if (lineNumber < 0) {
        // Position at beginning
        return 0;
      }
      
      // Calculate position within the line
      const currentLine = lines[lineNumber];
      tempElement.textContent = currentLine;
      
      let charPosition = 0;
      for (let i = 0; i <= currentLine.length; i++) {
        tempElement.textContent = currentLine.substring(0, i);
        const charWidth = tempElement.offsetWidth;
        
        if (charWidth > relativeX) {
          charPosition = i > 0 ? i - 1 : 0;
          break;
        } else if (i === currentLine.length) {
          charPosition = i;
        }
      }
      
      // Calculate absolute position in the text
      let absolutePosition = 0;
      for (let i = 0; i < lineNumber; i++) {
        absolutePosition += lines[i].length + 1; // +1 for newline
      }
      absolutePosition += charPosition;
      
      return Math.min(absolutePosition, value.length);
    } finally {
      document.body.removeChild(tempElement);
    }
  }, [value, textareaRef]);

  // Drop event handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!allowDrop) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, [allowDrop]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (!allowDrop) return;
    
    e.preventDefault();
    setIsDragOver(true);
  }, [allowDrop]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!allowDrop) return;
    
    // Only set drag over to false if we're actually leaving the component
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }, [allowDrop]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    if (!allowDrop) return;
    
    e.preventDefault();
    setIsDragOver(false);
    
    // Get the chord data from the drag event
    const chordData = e.dataTransfer.getData('text/plain');
    
    if (chordData && textareaRef.current) {
      // Calculate the drop position
      const dropPosition = getTextPositionFromPoint(e.clientX, e.clientY);
      
      // Insert the chord at the calculated position
      const newContent = 
        value.substring(0, dropPosition) + 
        chordData + 
        value.substring(dropPosition);
      
      onChange(newContent);
      
      // Focus the textarea and position cursor after the inserted chord
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = dropPosition + chordData.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  }, [allowDrop, value, onChange, getTextPositionFromPoint, textareaRef]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, textareaRef]);

  return (
    <div 
      className={`chordpro-editor-container ${isDragOver ? 'drag-over' : ''}`} 
      style={style}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div
        ref={highlightRef}
        className="chordpro-highlight-layer"
        dangerouslySetInnerHTML={{ __html: generateHighlightedHTML(value) }}
      />
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="chordpro-textarea"
        spellCheck={false}
      />
    </div>
  );
});

ChordProEditor.displayName = 'ChordProEditor';

export default ChordProEditor;
