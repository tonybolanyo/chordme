// Live cursor tracking component for collaborative editing
import React, { useEffect, useState, useCallback } from 'react';
import { useCollaborativePresence } from '../../hooks/useCollaborativeEditing';
import { usePresenceSystem } from '../../hooks/usePresenceSystem';
import type { UserCursor, CollaborationUser } from '../../types/collaboration';
import './CollaborativeEditing.css';

interface LiveCursorsProps {
  songId: string;
  editorRef: React.RefObject<HTMLTextAreaElement>;
  participants: CollaborationUser[];
  currentUserId?: string;
}

interface CursorPosition {
  x: number;
  y: number;
  height: number;
}

interface SelectionHighlight {
  x: number;
  y: number;
  width: number;
  height: number;
  userId: string;
  lines: { x: number; y: number; width: number; height: number }[];
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({
  songId,
  editorRef,
  participants,
  currentUserId,
}) => {
  const { cursors } = useCollaborativePresence(songId);
  const { generateUserAvatar, typingUsers } = usePresenceSystem({ 
    songId, 
    userId: currentUserId 
  });
  
  const [cursorPositions, setCursorPositions] = useState<
    Map<string, CursorPosition>
  >(new Map());
  const [selectionHighlights, setSelectionHighlights] = useState<
    Map<string, SelectionHighlight>
  >(new Map());

  // Calculate pixel position from line/column coordinates
  const calculateCursorPosition = useCallback((
    cursor: UserCursor
  ): CursorPosition | null => {
    const editor = editorRef.current;
    if (!editor) return null;

    const content = editor.value;
    const lines = content.split('\n');

    // Validate cursor position
    if (cursor.position.line >= lines.length) return null;

    const line = lines[cursor.position.line];
    if (cursor.position.column > line.length) return null;

    // Create a temporary span to measure text dimensions
    const measureElement = document.createElement('span');
    measureElement.style.visibility = 'hidden';
    measureElement.style.position = 'absolute';
    measureElement.style.whiteSpace = 'pre';
    measureElement.style.font = window.getComputedStyle(editor).font;
    measureElement.style.fontSize = window.getComputedStyle(editor).fontSize;
    measureElement.style.fontFamily = window.getComputedStyle(editor).fontFamily;
    document.body.appendChild(measureElement);

    // Measure line height
    measureElement.textContent = 'M';
    const lineHeight = measureElement.offsetHeight;

    // Measure text width up to cursor position
    const textBeforeCursor = line.substring(0, cursor.position.column);
    measureElement.textContent = textBeforeCursor || ' ';
    const textWidth = measureElement.offsetWidth;

    document.body.removeChild(measureElement);

    // Calculate position relative to editor
    const editorStyle = window.getComputedStyle(editor);
    const paddingLeft = parseInt(editorStyle.paddingLeft, 10);
    const paddingTop = parseInt(editorStyle.paddingTop, 10);

    return {
      x: paddingLeft + textWidth,
      y: paddingTop + cursor.position.line * lineHeight,
      height: lineHeight,
    };
  }, [editorRef]);

  // Calculate selection highlight rectangles (supports multi-line selections)
  const calculateSelectionHighlight = useCallback((
    cursor: UserCursor
  ): SelectionHighlight | null => {
    const editor = editorRef.current;
    if (!editor || !cursor.position.hasSelection) return null;

    const { selectionStart, selectionEnd } = cursor.position;
    if (!selectionStart || !selectionEnd || selectionStart === selectionEnd) return null;

    const content = editor.value;
    const lines = content.split('\n');

    // Find start and end positions
    let startLine = 0;
    let startCol = 0;
    let endLine = 0;
    let endCol = 0;
    let charCount = 0;

    // Calculate line/column positions from character indices
    for (let i = 0; i < lines.length; i++) {
      const lineLength = lines[i].length;
      
      if (charCount + lineLength >= selectionStart && startLine === 0) {
        startLine = i;
        startCol = selectionStart - charCount;
      }
      
      if (charCount + lineLength >= selectionEnd) {
        endLine = i;
        endCol = selectionEnd - charCount;
        break;
      }
      
      charCount += lineLength + 1; // +1 for newline
    }

    // Create measurement element
    const measureElement = document.createElement('span');
    measureElement.style.visibility = 'hidden';
    measureElement.style.position = 'absolute';
    measureElement.style.whiteSpace = 'pre';
    measureElement.style.font = window.getComputedStyle(editor).font;
    document.body.appendChild(measureElement);

    measureElement.textContent = 'M';
    const lineHeight = measureElement.offsetHeight;

    const editorStyle = window.getComputedStyle(editor);
    const paddingLeft = parseInt(editorStyle.paddingLeft, 10);
    const paddingTop = parseInt(editorStyle.paddingTop, 10);

    const highlightLines: { x: number; y: number; width: number; height: number }[] = [];

    // Calculate highlight for each line in the selection
    for (let lineIndex = startLine; lineIndex <= endLine; lineIndex++) {
      const line = lines[lineIndex];
      const isFirstLine = lineIndex === startLine;
      const isLastLine = lineIndex === endLine;
      
      const colStart = isFirstLine ? startCol : 0;
      const colEnd = isLastLine ? endCol : line.length;
      
      // Measure text before selection start
      const textBefore = line.substring(0, colStart);
      measureElement.textContent = textBefore || ' ';
      const xStart = paddingLeft + measureElement.offsetWidth;
      
      // Measure selected text
      const selectedText = line.substring(colStart, colEnd);
      measureElement.textContent = selectedText || ' ';
      const width = selectedText.length > 0 ? measureElement.offsetWidth : 2; // Minimum width for empty selections
      
      highlightLines.push({
        x: xStart,
        y: paddingTop + lineIndex * lineHeight,
        width: width,
        height: lineHeight,
      });
    }

    document.body.removeChild(measureElement);

    // Return the first line's position as the main highlight position
    const firstLine = highlightLines[0];
    return {
      x: firstLine.x,
      y: firstLine.y,
      width: firstLine.width,
      height: firstLine.height,
      userId: cursor.userId,
      lines: highlightLines,
    };
  }, [editorRef]);

  // Update cursor positions and selection highlights when cursors change
  useEffect(() => {
    const newCursorPositions = new Map<string, CursorPosition>();
    const newSelectionHighlights = new Map<string, SelectionHighlight>();

    cursors.forEach((cursor) => {
      // Skip current user's cursor
      if (cursor.userId === currentUserId) return;
      
      const position = calculateCursorPosition(cursor);
      if (position) {
        newCursorPositions.set(cursor.userId, position);
      }

      const highlight = calculateSelectionHighlight(cursor);
      if (highlight) {
        newSelectionHighlights.set(cursor.userId, highlight);
      }
    });

    setCursorPositions(newCursorPositions);
    setSelectionHighlights(newSelectionHighlights);
  }, [cursors, editorRef.current?.value, currentUserId, calculateCursorPosition, calculateSelectionHighlight]);

  // Get user info for cursor
  const getUserForCursor = useCallback((userId: string): CollaborationUser | null => {
    return participants.find((p) => p.id === userId) || null;
  }, [participants]);

  const getUserName = useCallback((user: CollaborationUser): string => {
    return user.name || user.email.split('@')[0];
  }, []);

  // Filter out current user's cursors and selections
  const otherUserCursors = cursors.filter(cursor => cursor.userId !== currentUserId);

  return (
    <div className="live-cursors-container">
      {/* Render text selection highlights */}
      {Array.from(selectionHighlights.entries()).map(([userId, highlight]) => {
        const user = getUserForCursor(userId);
        if (!user) return null;

        return (
          <div key={`selection-${userId}`} className="user-selection-container">
            {highlight.lines.map((line, index) => (
              <div
                key={`${userId}-selection-${index}`}
                className="user-selection-highlight"
                style={{
                  position: 'absolute',
                  left: `${line.x}px`,
                  top: `${line.y}px`,
                  width: `${line.width}px`,
                  height: `${line.height}px`,
                  backgroundColor: user.color,
                  opacity: 0.2,
                  borderRadius: '2px',
                  pointerEvents: 'none',
                  zIndex: 1,
                }}
                data-user={getUserName(user)}
                title={`${getUserName(user)}'s selection`}
              />
            ))}
          </div>
        );
      })}

      {/* Render live cursors */}
      {otherUserCursors.map((cursor) => {
        const position = cursorPositions.get(cursor.userId);
        const user = getUserForCursor(cursor.userId);

        if (!position || !user) return null;

        const isTyping = typingUsers.has(cursor.userId);
        const avatar = generateUserAvatar(user);

        return (
          <div
            key={`cursor-${cursor.userId}`}
            className={`live-cursor ${isTyping ? 'typing' : ''}`}
            style={{
              position: 'absolute',
              left: `${position.x}px`,
              top: `${position.y}px`,
              height: `${position.height}px`,
              zIndex: 10,
            }}
          >
            {/* Cursor line */}
            <div
              className="cursor-line"
              style={{
                width: '2px',
                height: '100%',
                backgroundColor: user.color,
                position: 'relative',
                animation: isTyping ? 'cursor-blink 1s infinite' : 'none',
              }}
            />
            
            {/* User label */}
            <div
              className="cursor-label"
              style={{
                position: 'absolute',
                top: '-25px',
                left: '0',
                backgroundColor: user.color,
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <div
                className="user-avatar-mini"
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  fontWeight: 'bold',
                }}
              >
                {avatar.initials}
              </div>
              <span>{getUserName(user)}</span>
              {isTyping && (
                <span className="typing-indicator">
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                  <span className="dot">.</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
