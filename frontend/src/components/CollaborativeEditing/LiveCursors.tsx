// Live cursor tracking component for collaborative editing
import React, { useEffect, useState } from 'react';
import { useCollaborativePresence } from '../../hooks/useCollaborativeEditing';
import type { UserCursor, CollaborationUser } from '../../types/collaboration';
import './CollaborativeEditing.css';

interface LiveCursorsProps {
  songId: string;
  editorRef: React.RefObject<HTMLTextAreaElement>;
  participants: CollaborationUser[];
}

interface CursorPosition {
  x: number;
  y: number;
  height: number;
}

export const LiveCursors: React.FC<LiveCursorsProps> = ({
  songId,
  editorRef,
  participants,
}) => {
  const { cursors } = useCollaborativePresence(songId);
  const [cursorPositions, setCursorPositions] = useState<Map<string, CursorPosition>>(new Map());

  // Calculate pixel position from line/column coordinates
  const calculateCursorPosition = (cursor: UserCursor): CursorPosition | null => {
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
    const editorRect = editor.getBoundingClientRect();
    const editorStyle = window.getComputedStyle(editor);
    const paddingLeft = parseInt(editorStyle.paddingLeft, 10);
    const paddingTop = parseInt(editorStyle.paddingTop, 10);

    return {
      x: paddingLeft + textWidth,
      y: paddingTop + (cursor.position.line * lineHeight),
      height: lineHeight,
    };
  };

  // Update cursor positions when cursors change
  useEffect(() => {
    const newPositions = new Map<string, CursorPosition>();

    cursors.forEach((cursor) => {
      const position = calculateCursorPosition(cursor);
      if (position) {
        newPositions.set(cursor.userId, position);
      }
    });

    setCursorPositions(newPositions);
  }, [cursors, editorRef.current?.value]);

  // Get user info for cursor
  const getUserForCursor = (userId: string): CollaborationUser | null => {
    return participants.find(p => p.id === userId) || null;
  };

  const getUserName = (user: CollaborationUser): string => {
    return user.name || user.email.split('@')[0];
  };

  return (
    <>
      {cursors.map((cursor) => {
        const position = cursorPositions.get(cursor.userId);
        const user = getUserForCursor(cursor.userId);
        
        if (!position || !user) return null;

        return (
          <div
            key={cursor.userId}
            className="live-cursor"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              height: `${position.height}px`,
              backgroundColor: user.color,
            }}
            data-user={getUserName(user)}
          />
        );
      })}
      
      {/* Render selections if they exist */}
      {cursors.map((cursor) => {
        const position = cursorPositions.get(cursor.userId);
        const user = getUserForCursor(cursor.userId);
        
        if (!position || !user || !cursor.position.selectionStart || !cursor.position.selectionEnd) {
          return null;
        }

        const selectionStart = cursor.position.selectionStart;
        const selectionEnd = cursor.position.selectionEnd;
        
        if (selectionStart === selectionEnd) return null;

        // Calculate selection rectangle (simplified for single-line selections)
        const editor = editorRef.current;
        if (!editor) return null;

        const content = editor.value;
        const lines = content.split('\n');
        
        // For simplicity, only handle single-line selections
        const startLine = cursor.position.line;
        const line = lines[startLine];
        
        const startCol = Math.max(0, selectionStart);
        const endCol = Math.min(line.length, selectionEnd);
        
        if (startCol >= endCol) return null;

        // Measure selection width
        const measureElement = document.createElement('span');
        measureElement.style.visibility = 'hidden';
        measureElement.style.position = 'absolute';
        measureElement.style.whiteSpace = 'pre';
        measureElement.style.font = window.getComputedStyle(editor).font;
        document.body.appendChild(measureElement);

        const selectedText = line.substring(startCol, endCol);
        measureElement.textContent = selectedText;
        const selectionWidth = measureElement.offsetWidth;

        document.body.removeChild(measureElement);

        return (
          <div
            key={`${cursor.userId}-selection`}
            className="live-selection"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              width: `${selectionWidth}px`,
              height: `${position.height}px`,
              backgroundColor: user.color,
            }}
          />
        );
      })}
    </>
  );
};