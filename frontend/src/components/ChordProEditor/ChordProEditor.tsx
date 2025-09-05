import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
} from 'react';
import './ChordProEditor.css';
import ChordAutocomplete from '../ChordAutocomplete';
import { detectInputContext, isValidChord } from '../../services/chordService';

interface ChordProEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  id?: string;
  style?: React.CSSProperties;
  required?: boolean;
  allowDrop?: boolean; // New prop to enable/disable drop functionality
  enableAutocomplete?: boolean; // New prop to enable/disable autocomplete
}

interface Token {
  type:
    | 'chord'
    | 'directive'
    | 'comment'
    | 'lyrics'
    | 'section-start'
    | 'section-end';
  content: string;
  start: number;
  end: number;
  sectionType?: 'verse' | 'chorus' | 'bridge' | 'content';
}

const ChordProEditor = forwardRef<HTMLTextAreaElement, ChordProEditorProps>(
  (
    {
      value,
      onChange,
      placeholder = '',
      rows = 6,
      id,
      style,
      required = false,
      allowDrop = true, // Enable drop by default
      enableAutocomplete = true, // Enable autocomplete by default
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    const textareaRef =
      (ref as React.RefObject<HTMLTextAreaElement>) || internalRef;
    const highlightRef = useRef<HTMLDivElement>(null);
    const [isScrolling, setIsScrolling] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);

    // Autocomplete state
    const [autocompleteVisible, setAutocompleteVisible] = useState(false);
    const [autocompletePosition, setAutocompletePosition] = useState({
      top: 0,
      left: 0,
    });
    const [currentChordInput, setCurrentChordInput] = useState('');
    const [chordInputPosition, setChordInputPosition] = useState<{
      start: number;
      end: number;
    } | null>(null);

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

              // Add directive - check if it's a section directive
              const directiveContent = tempContent.substring(
                startBrace,
                endBrace + 1
              );
              const directive = directiveContent.slice(1, -1); // Remove braces

              let tokenType: Token['type'] = 'directive';
              let sectionType: Token['sectionType'] = undefined;

              // Check for section start directives
              if (
                directive.startsWith('start_of_') ||
                directive === 'sov' ||
                directive === 'soc' ||
                directive === 'sob'
              ) {
                tokenType = 'section-start';

                let sectionName: string;
                if (directive.startsWith('start_of_')) {
                  sectionName = directive
                    .replace('start_of_', '')
                    .split(':')[0];
                } else {
                  const abbreviationMap: Record<string, string> = {
                    sov: 'verse',
                    soc: 'chorus',
                    sob: 'bridge',
                  };
                  sectionName = abbreviationMap[directive] || 'content';
                }

                if (
                  sectionName === 'verse' ||
                  sectionName === 'chorus' ||
                  sectionName === 'bridge'
                ) {
                  sectionType = sectionName;
                } else {
                  sectionType = 'content';
                }
              }
              // Check for section end directives
              else if (
                directive.startsWith('end_of_') ||
                directive === 'eov' ||
                directive === 'eoc' ||
                directive === 'eob'
              ) {
                tokenType = 'section-end';
              }

              tokens.push({
                type: tokenType,
                content: directiveContent,
                start: tempStart + startBrace,
                end: tempStart + endBrace + 1,
                sectionType,
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

        if (token.type === 'chord') {
          // Extract chord content without brackets for validation
          const chordMatch = token.content.match(/\[([^\]]*)\]/);
          const chordName = chordMatch ? chordMatch[1] : '';
          const isValidChordToken = chordName ? isValidChord(chordName) : false;
          const validityClass = isValidChordToken ? '' : ' invalid';

          highlightedHTML += `<span class="chordpro-${token.type}${validityClass}">${escapedContent}</span>`;
        } else if (token.type === 'section-start') {
          const sectionClass = token.sectionType
            ? ` chordpro-section-${token.sectionType}`
            : '';
          highlightedHTML += `<span class="chordpro-${token.type}${sectionClass}">${escapedContent}</span>`;
        } else if (token.type === 'section-end') {
          highlightedHTML += `<span class="chordpro-${token.type}">${escapedContent}</span>`;
        } else {
          highlightedHTML += `<span class="chordpro-${token.type}">${escapedContent}</span>`;
        }

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
    const getTextPositionFromPoint = useCallback(
      (x: number, y: number): number => {
        const textarea = textareaRef.current;
        if (!textarea) return 0;

        // Get the textarea's bounding rect
        const rect = textarea.getBoundingClientRect();

        // Calculate relative position within the textarea
        const relativeX =
          x - rect.left - parseFloat(getComputedStyle(textarea).paddingLeft);
        const relativeY =
          y -
          rect.top -
          parseFloat(getComputedStyle(textarea).paddingTop) +
          textarea.scrollTop;

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
        tempElement.style.width =
          rect.width -
          parseFloat(getComputedStyle(textarea).paddingLeft) -
          parseFloat(getComputedStyle(textarea).paddingRight) +
          'px';

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
      },
      [value, textareaRef]
    );

    // Calculate cursor position for autocomplete positioning
    const calculateAutocompletePosition = useCallback(
      (cursorPosition: number): { top: number; left: number } => {
        const textarea = textareaRef.current;
        if (!textarea) return { top: 0, left: 0 };

        const rect = textarea.getBoundingClientRect();
        const computedStyle = getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight);

        // Calculate the line number
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lineNumber = (textBeforeCursor.match(/\n/g) || []).length;

        // Calculate position within the current line
        const currentLineStart = textBeforeCursor.lastIndexOf('\n') + 1;
        const currentLineText = textBeforeCursor.substring(currentLineStart);

        // Create a temporary element to measure text width
        const tempElement = document.createElement('span');
        tempElement.style.visibility = 'hidden';
        tempElement.style.position = 'absolute';
        tempElement.style.whiteSpace = 'pre';
        tempElement.style.fontFamily = computedStyle.fontFamily;
        tempElement.style.fontSize = computedStyle.fontSize;
        tempElement.textContent = currentLineText;

        document.body.appendChild(tempElement);
        const textWidth = tempElement.offsetWidth;
        document.body.removeChild(tempElement);

        return {
          top:
            rect.top +
            window.scrollY +
            lineHeight * (lineNumber + 1) +
            parseFloat(computedStyle.paddingTop),
          left:
            rect.left +
            window.scrollX +
            textWidth +
            parseFloat(computedStyle.paddingLeft),
        };
      },
      [value, textareaRef]
    );

    // Handle input detection and autocomplete (enhanced for both chords and directives)
    const handleInputDetection = useCallback(
      (cursorPosition: number) => {
        if (!enableAutocomplete) return;

        const inputContext = detectInputContext(value, cursorPosition);

        if (inputContext.type !== 'none' && inputContext.inputText !== undefined) {
          setCurrentChordInput(inputContext.inputText);
          setChordInputPosition({
            start: inputContext.start!,
            end: inputContext.end!,
          });

          // Only show autocomplete if there's some input and it's not just spaces
          if (inputContext.inputText.trim().length > 0) {
            const position = calculateAutocompletePosition(cursorPosition);
            setAutocompletePosition(position);
            setAutocompleteVisible(true);
          } else {
            setAutocompleteVisible(false);
          }
        } else {
          setAutocompleteVisible(false);
          setCurrentChordInput('');
          setChordInputPosition(null);
        }
      },
      [value, enableAutocomplete, calculateAutocompletePosition]
    );

    // Handle selection from autocomplete (works for both chords and directives)
    const handleSuggestionSelect = useCallback(
      (selectedSuggestion: string) => {
        if (!chordInputPosition || !textareaRef.current) return;

        const newValue =
          value.substring(0, chordInputPosition.start) +
          selectedSuggestion +
          value.substring(chordInputPosition.end);

        onChange(newValue);

        // Position cursor after the inserted suggestion
        const newCursorPos = chordInputPosition.start + selectedSuggestion.length;
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 0);

        setAutocompleteVisible(false);
      },
      [chordInputPosition, value, onChange, textareaRef]
    );

    // Handle input changes with chord detection
    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        // Check for input detection after a short delay to allow cursor position to update
        setTimeout(() => {
          if (textareaRef.current) {
            handleInputDetection(textareaRef.current.selectionStart);
          }
        }, 0);
      },
      [onChange, handleInputDetection, textareaRef]
    );

    // Handle cursor position changes (clicks, arrow keys, etc.)
    const handleSelectionChange = useCallback(() => {
      if (textareaRef.current) {
        handleInputDetection(textareaRef.current.selectionStart);
      }
    }, [handleInputDetection, textareaRef]);

    // Handle special keys that might affect autocomplete
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Allow autocomplete to handle its own key events when visible
        if (autocompleteVisible) {
          // Only handle keys that should close autocomplete or be passed through
          if (
            ['Escape', 'ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)
          ) {
            // Let the autocomplete component handle these
            return;
          }
        }

        // Update input detection on any key that might change cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            handleInputDetection(textareaRef.current.selectionStart);
          }
        }, 0);
      },
      [autocompleteVisible, handleInputDetection, textareaRef]
    );

    // Drop event handlers
    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        if (!allowDrop) return;

        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
      },
      [allowDrop]
    );

    const handleDragEnter = useCallback(
      (e: React.DragEvent) => {
        if (!allowDrop) return;

        e.preventDefault();
        setIsDragOver(true);
      },
      [allowDrop]
    );

    const handleDragLeave = useCallback(
      (e: React.DragEvent) => {
        if (!allowDrop) return;

        // Only set drag over to false if we're actually leaving the component
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (
          x < rect.left ||
          x > rect.right ||
          y < rect.top ||
          y > rect.bottom
        ) {
          setIsDragOver(false);
        }
      },
      [allowDrop]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
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
      },
      [allowDrop, value, onChange, getTextPositionFromPoint, textareaRef]
    );

    useEffect(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.addEventListener('scroll', handleScroll);
        return () => textarea.removeEventListener('scroll', handleScroll);
      }
    }, [handleScroll, textareaRef]);

    return (
      <>
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
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelectionChange}
            onClick={handleSelectionChange}
            placeholder={placeholder}
            rows={rows}
            required={required}
            className="chordpro-textarea"
            spellCheck={false}
          />
        </div>

        {enableAutocomplete && (
          <ChordAutocomplete
            inputText={currentChordInput}
            onSelectChord={handleSuggestionSelect}
            onClose={() => setAutocompleteVisible(false)}
            position={autocompletePosition}
            visible={autocompleteVisible}
            inputType="auto"
            chordProContent={value}
            cursorPosition={textareaRef.current?.selectionStart}
          />
        )}
      </>
    );
  }
);

ChordProEditor.displayName = 'ChordProEditor';

export default ChordProEditor;
