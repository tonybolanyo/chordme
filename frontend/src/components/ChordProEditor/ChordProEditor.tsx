import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ChordProEditor.css';

interface ChordProEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  style?: React.CSSProperties;
  required?: boolean;
}

interface Token {
  type: 'chord' | 'directive' | 'comment' | 'lyrics';
  content: string;
  start: number;
  end: number;
}

const ChordProEditor: React.FC<ChordProEditorProps> = ({
  value,
  onChange,
  placeholder = '',
  rows = 6,
  id,
  style,
  required = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

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
      currentIndex = lineStart + line.length + (lineIndex < lines.length - 1 ? 1 : 0);
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
  }, [isScrolling]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  return (
    <div className="chordpro-editor-container" style={style}>
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
};

export default ChordProEditor;