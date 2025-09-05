import React, { useRef, useCallback, useEffect } from 'react';
import { ViewMode, SplitOrientation } from '../../types';
import './SplitViewLayout.css';

interface SplitViewLayoutProps {
  viewMode: ViewMode;
  splitOrientation: SplitOrientation;
  splitRatio: number;
  onSplitRatioChange: (ratio: number) => void;
  editorContent: React.ReactNode;
  previewContent: React.ReactNode;
  className?: string;
}

const SplitViewLayout: React.FC<SplitViewLayoutProps> = ({
  viewMode,
  splitOrientation,
  splitRatio,
  onSplitRatioChange,
  editorContent,
  previewContent,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Calculate pane sizes based on split ratio
  const editorSize = `${splitRatio * 100}%`;
  const previewSize = `${(1 - splitRatio) * 100}%`;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = splitOrientation === 'vertical' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [splitOrientation]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    
    let newRatio: number;
    
    if (splitOrientation === 'vertical') {
      const mouseX = e.clientX - rect.left;
      newRatio = mouseX / rect.width;
    } else {
      const mouseY = e.clientY - rect.top;
      newRatio = mouseY / rect.height;
    }

    // Clamp ratio between 0.1 and 0.9
    newRatio = Math.max(0.1, Math.min(0.9, newRatio));
    onSplitRatioChange(newRatio);
  }, [splitOrientation, onSplitRatioChange]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const containerClasses = [
    'split-view-container',
    splitOrientation,
    viewMode,
    className
  ].filter(Boolean).join(' ');

  const editorStyle: React.CSSProperties = splitOrientation === 'vertical' 
    ? { width: editorSize }
    : { height: editorSize };

  const previewStyle: React.CSSProperties = splitOrientation === 'vertical'
    ? { width: previewSize }
    : { height: previewSize };

  return (
    <div ref={containerRef} className={containerClasses}>
      <div className="split-view-pane editor-pane" style={editorStyle}>
        <div className="split-view-pane-content">
          {editorContent}
        </div>
      </div>

      {viewMode === 'split' && (
        <div 
          className="split-view-resizer"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation={splitOrientation}
          aria-valuenow={Math.round(splitRatio * 100)}
          aria-valuemin={10}
          aria-valuemax={90}
          aria-label={`Resize ${splitOrientation === 'vertical' ? 'horizontal' : 'vertical'} split`}
        />
      )}

      <div className="split-view-pane preview-pane" style={previewStyle}>
        <div className="split-view-pane-content">
          {previewContent}
        </div>
      </div>
    </div>
  );
};

export default SplitViewLayout;