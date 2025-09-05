/**
 * Component for displaying validation error highlights and tooltips
 */

import React, { useState, useRef, useEffect } from 'react';
import { ValidationError } from '../../services/chordProValidation';
import './ValidationErrorHighlight.css';

interface ValidationErrorHighlightProps {
  content: string;
  errors: ValidationError[];
  className?: string;
  showTooltips?: boolean;
  onErrorClick?: (error: ValidationError) => void;
}

interface ErrorTooltipProps {
  error: ValidationError;
  position: { x: number; y: number };
  visible: boolean;
  onClose: () => void;
}

const ErrorTooltip: React.FC<ErrorTooltipProps> = ({ 
  error, 
  position, 
  visible, 
  onClose 
}) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible && tooltipRef.current) {
      // Adjust position to keep tooltip in viewport
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Adjust horizontal position
      if (position.x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewportHeight) {
        adjustedY = position.y - rect.height - 10;
      }

      tooltip.style.left = `${adjustedX}px`;
      tooltip.style.top = `${adjustedY}px`;
    }
  }, [visible, position]);

  if (!visible) return null;

  const getSeverityIcon = (severity: ValidationError['severity']): string => {
    switch (severity) {
      case 'error': return '⚠️';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '⚠️';
    }
  };

  const getSeverityClass = (severity: ValidationError['severity']): string => {
    return `tooltip-${severity}`;
  };

  return (
    <>
      {/* Overlay to capture clicks outside tooltip */}
      <div 
        className="validation-tooltip-overlay"
        onClick={onClose}
      />
      
      <div
        ref={tooltipRef}
        className={`validation-tooltip ${getSeverityClass(error.severity)}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tooltip-header">
          <span className="tooltip-icon">{getSeverityIcon(error.severity)}</span>
          <span className="tooltip-type">{error.type}</span>
          <button 
            className="tooltip-close"
            onClick={onClose}
            aria-label="Close tooltip"
          >
            ×
          </button>
        </div>
        
        <div className="tooltip-content">
          <div className="tooltip-message">{error.message}</div>
          
          {error.suggestion && (
            <div className="tooltip-suggestion">
              <strong>Suggestion:</strong> {error.suggestion}
            </div>
          )}
          
          <div className="tooltip-position">
            Line {error.position.line}, Column {error.position.column}
          </div>
        </div>
      </div>
    </>
  );
};

export const ValidationErrorHighlight: React.FC<ValidationErrorHighlightProps> = ({
  content,
  errors,
  className = '',
  showTooltips = true,
  onErrorClick
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{
    error: ValidationError;
    position: { x: number; y: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Create segments of content with error highlighting
  const createHighlightedContent = (): React.ReactNode[] => {
    if (!content || errors.length === 0) {
      return [<span key="content">{content}</span>];
    }

    // Sort errors by start position
    const sortedErrors = [...errors].sort((a, b) => a.position.start - b.position.start);
    
    const segments: React.ReactNode[] = [];
    let currentIndex = 0;

    sortedErrors.forEach((error, errorIndex) => {
      // Add content before error
      if (currentIndex < error.position.start) {
        const beforeText = content.substring(currentIndex, error.position.start);
        segments.push(
          <span key={`before-${errorIndex}`}>{beforeText}</span>
        );
      }

      // Add highlighted error segment
      const errorText = content.substring(error.position.start, error.position.end);
      const errorKey = `error-${errorIndex}`;
      
      segments.push(
        <span
          key={errorKey}
          className={`validation-error-highlight ${error.severity} ${error.type}`}
          data-error-type={error.type}
          data-error-severity={error.severity}
          onMouseEnter={(e) => {
            if (showTooltips) {
              const rect = e.currentTarget.getBoundingClientRect();
              setActiveTooltip({
                error,
                position: {
                  x: rect.left + window.scrollX,
                  y: rect.bottom + window.scrollY + 5
                }
              });
            }
          }}
          onMouseLeave={() => {
            if (showTooltips) {
              // Small delay to allow moving to tooltip
              setTimeout(() => {
                setActiveTooltip(null);
              }, 100);
            }
          }}
          onClick={(e) => {
            e.preventDefault();
            if (onErrorClick) {
              onErrorClick(error);
            }
            if (showTooltips) {
              const rect = e.currentTarget.getBoundingClientRect();
              setActiveTooltip({
                error,
                position: {
                  x: rect.left + window.scrollX,
                  y: rect.bottom + window.scrollY + 5
                }
              });
            }
          }}
          title={showTooltips ? undefined : error.message} // Fallback for no-tooltip mode
        >
          {errorText}
        </span>
      );

      currentIndex = Math.max(currentIndex, error.position.end);
    });

    // Add remaining content after last error
    if (currentIndex < content.length) {
      const remainingText = content.substring(currentIndex);
      segments.push(
        <span key="remaining">{remainingText}</span>
      );
    }

    return segments;
  };

  return (
    <div 
      ref={containerRef}
      className={`validation-error-highlight-container ${className}`}
    >
      <div className="validation-content">
        {createHighlightedContent()}
      </div>
      
      {activeTooltip && showTooltips && (
        <ErrorTooltip
          error={activeTooltip.error}
          position={activeTooltip.position}
          visible={true}
          onClose={() => setActiveTooltip(null)}
        />
      )}
    </div>
  );
};

export default ValidationErrorHighlight;