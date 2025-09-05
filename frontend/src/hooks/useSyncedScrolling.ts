import { useRef, useCallback, useEffect } from 'react';

interface UseSyncedScrollingOptions {
  enabled: boolean;
  debounceMs?: number;
}

interface UseSyncedScrollingReturn {
  editorRef: React.RefObject<HTMLTextAreaElement>;
  previewRef: React.RefObject<HTMLDivElement>;
  syncScrollToEditor: () => void;
  syncScrollToPreview: () => void;
}

export const useSyncedScrolling = (
  options: UseSyncedScrollingOptions
): UseSyncedScrollingReturn => {
  const { enabled, debounceMs = 16 } = options; // ~60fps default
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const syncInProgressRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Sync editor scroll to preview
  const syncScrollToPreview = useCallback(() => {
    if (!enabled || !editorRef.current || !previewRef.current || syncInProgressRef.current) {
      return;
    }

    const editor = editorRef.current;
    const preview = previewRef.current;

    // Calculate scroll percentage
    const scrollTop = editor.scrollTop;
    const scrollHeight = editor.scrollHeight - editor.clientHeight;
    const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    // Apply to preview
    const previewScrollHeight = preview.scrollHeight - preview.clientHeight;
    const previewScrollTop = scrollPercentage * previewScrollHeight;

    syncInProgressRef.current = true;
    preview.scrollTop = previewScrollTop;
    
    // Reset sync lock after a short delay
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      syncInProgressRef.current = false;
    }, debounceMs);
  }, [enabled, debounceMs]);

  // Sync preview scroll to editor
  const syncScrollToEditor = useCallback(() => {
    if (!enabled || !editorRef.current || !previewRef.current || syncInProgressRef.current) {
      return;
    }

    const editor = editorRef.current;
    const preview = previewRef.current;

    // Calculate scroll percentage
    const scrollTop = preview.scrollTop;
    const scrollHeight = preview.scrollHeight - preview.clientHeight;
    const scrollPercentage = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

    // Apply to editor
    const editorScrollHeight = editor.scrollHeight - editor.clientHeight;
    const editorScrollTop = scrollPercentage * editorScrollHeight;

    syncInProgressRef.current = true;
    editor.scrollTop = editorScrollTop;
    
    // Reset sync lock after a short delay
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      syncInProgressRef.current = false;
    }, debounceMs);
  }, [enabled, debounceMs]);

  // Set up scroll event listeners
  useEffect(() => {
    if (!enabled) return;

    const editor = editorRef.current;
    const preview = previewRef.current;

    if (!editor || !preview) return;

    // Debounced scroll handlers
    let editorScrollTimeout: NodeJS.Timeout;
    let previewScrollTimeout: NodeJS.Timeout;

    const handleEditorScroll = () => {
      if (editorScrollTimeout) clearTimeout(editorScrollTimeout);
      editorScrollTimeout = setTimeout(syncScrollToPreview, debounceMs);
    };

    const handlePreviewScroll = () => {
      if (previewScrollTimeout) clearTimeout(previewScrollTimeout);
      previewScrollTimeout = setTimeout(syncScrollToEditor, debounceMs);
    };

    editor.addEventListener('scroll', handleEditorScroll, { passive: true });
    preview.addEventListener('scroll', handlePreviewScroll, { passive: true });

    return () => {
      editor.removeEventListener('scroll', handleEditorScroll);
      preview.removeEventListener('scroll', handlePreviewScroll);
      if (editorScrollTimeout) clearTimeout(editorScrollTimeout);
      if (previewScrollTimeout) clearTimeout(previewScrollTimeout);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [enabled, debounceMs, syncScrollToEditor, syncScrollToPreview]);

  return {
    editorRef,
    previewRef,
    syncScrollToEditor,
    syncScrollToPreview,
  };
};