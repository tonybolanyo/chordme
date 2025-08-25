import { useState, useCallback } from 'react';

interface UndoRedoState {
  title: string;
  content: string;
}

interface UndoRedoHook {
  currentState: UndoRedoState;
  canUndo: boolean;
  canRedo: boolean;
  setState: (state: UndoRedoState) => void;
  undo: () => UndoRedoState | null;
  redo: () => UndoRedoState | null;
  clearHistory: () => void;
  getHistorySize: () => number;
}

/**
 * Hook for managing undo/redo functionality in the song editor
 * Maintains a stack of editor states and provides undo/redo operations
 */
export function useUndoRedo(initialState: UndoRedoState): UndoRedoHook {
  const [currentState, setCurrentState] = useState<UndoRedoState>(initialState);
  const [undoStack, setUndoStack] = useState<UndoRedoState[]>([]);
  const [redoStack, setRedoStack] = useState<UndoRedoState[]>([]);

  const setState = useCallback(
    (newState: UndoRedoState) => {
      // Only add to history if state actually changed
      if (
        newState.title !== currentState.title ||
        newState.content !== currentState.content
      ) {
        setUndoStack((prev) => [...prev, currentState]);
        setRedoStack([]); // Clear redo stack when new changes are made
        setCurrentState(newState);
      }
    },
    [currentState]
  );

  const undo = useCallback((): UndoRedoState | null => {
    if (undoStack.length === 0) return null;

    const previousState = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);

    setRedoStack((prev) => [...prev, currentState]);
    setUndoStack(newUndoStack);
    setCurrentState(previousState);

    return previousState;
  }, [undoStack, currentState]);

  const redo = useCallback((): UndoRedoState | null => {
    if (redoStack.length === 0) return null;

    const nextState = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack((prev) => [...prev, currentState]);
    setRedoStack(newRedoStack);
    setCurrentState(nextState);

    return nextState;
  }, [redoStack, currentState]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const getHistorySize = useCallback(() => {
    return undoStack.length + redoStack.length;
  }, [undoStack.length, redoStack.length]);

  return {
    currentState,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    setState,
    undo,
    redo,
    clearHistory,
    getHistorySize,
  };
}
