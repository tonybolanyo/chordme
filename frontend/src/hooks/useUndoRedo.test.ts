import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from './useUndoRedo';

describe('useUndoRedo', () => {
  const initialState = { title: 'Initial Title', content: 'Initial Content' };

  it('should initialize with the provided state', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    expect(result.current.currentState).toEqual(initialState);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should enable undo after setting new state', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    act(() => {
      result.current.setState({ title: 'New Title', content: 'New Content' });
    });

    expect(result.current.currentState).toEqual({ title: 'New Title', content: 'New Content' });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should undo to previous state', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    act(() => {
      result.current.setState({ title: 'New Title', content: 'New Content' });
    });

    act(() => {
      const undoResult = result.current.undo();
      expect(undoResult).toEqual(initialState);
    });

    expect(result.current.currentState).toEqual(initialState);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to next state', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));
    const newState = { title: 'New Title', content: 'New Content' };

    act(() => {
      result.current.setState(newState);
    });

    act(() => {
      result.current.undo();
    });

    act(() => {
      const redoResult = result.current.redo();
      expect(redoResult).toEqual(newState);
    });

    expect(result.current.currentState).toEqual(newState);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear redo stack when new state is set after undo', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    act(() => {
      result.current.setState({ title: 'State 1', content: 'Content 1' });
    });

    act(() => {
      result.current.setState({ title: 'State 2', content: 'Content 2' });
    });

    act(() => {
      result.current.undo(); // Now at State 1
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.setState({ title: 'New Branch', content: 'New Branch Content' });
    });

    expect(result.current.canRedo).toBe(false); // Redo stack should be cleared
    expect(result.current.canUndo).toBe(true);
  });

  it('should handle multiple undo/redo operations', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    const states = [
      { title: 'State 1', content: 'Content 1' },
      { title: 'State 2', content: 'Content 2' },
      { title: 'State 3', content: 'Content 3' },
    ];

    // Add multiple states
    act(() => {
      result.current.setState(states[0]);
    });
    act(() => {
      result.current.setState(states[1]);
    });
    act(() => {
      result.current.setState(states[2]);
    });

    // Undo all the way back
    act(() => {
      result.current.undo(); // Back to State 2
    });
    act(() => {
      result.current.undo(); // Back to State 1
    });
    act(() => {
      result.current.undo(); // Back to Initial
    });

    expect(result.current.currentState).toEqual(initialState);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    // Redo back to the end
    act(() => {
      result.current.redo(); // To State 1
    });
    act(() => {
      result.current.redo(); // To State 2
    });
    act(() => {
      result.current.redo(); // To State 3
    });

    expect(result.current.currentState).toEqual(states[2]);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should not change state when undoing/redoing is not possible', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    // Try to undo when no history exists
    act(() => {
      const undoResult = result.current.undo();
      expect(undoResult).toBe(null);
    });

    expect(result.current.currentState).toEqual(initialState);

    // Try to redo when no redo stack exists
    act(() => {
      const redoResult = result.current.redo();
      expect(redoResult).toBe(null);
    });

    expect(result.current.currentState).toEqual(initialState);
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    act(() => {
      result.current.setState({ title: 'New Title', content: 'New Content' });
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.getHistorySize()).toBe(0);
  });

  it('should return correct history size', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    expect(result.current.getHistorySize()).toBe(0);

    act(() => {
      result.current.setState({ title: 'State 1', content: 'Content 1' });
      result.current.setState({ title: 'State 2', content: 'Content 2' });
    });

    expect(result.current.getHistorySize()).toBe(2);

    act(() => {
      result.current.undo();
    });

    expect(result.current.getHistorySize()).toBe(2); // 1 undo + 1 redo
  });

  it('should not add to history if state has not changed', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    act(() => {
      result.current.setState(initialState); // Same state
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.getHistorySize()).toBe(0);
  });

  it('should handle partial state updates', () => {
    const { result } = renderHook(() => useUndoRedo(initialState));

    act(() => {
      result.current.setState({ title: 'Updated Title', content: initialState.content });
    });

    expect(result.current.currentState.title).toBe('Updated Title');
    expect(result.current.currentState.content).toBe(initialState.content);
    expect(result.current.canUndo).toBe(true);
  });
});