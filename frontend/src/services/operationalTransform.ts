// Operational Transformation engine for real-time collaborative editing
import type { TextOperation, EditOperation, DocumentState } from '../types/collaboration';

/**
 * Operational Transformation (OT) class for handling concurrent text editing
 * Based on the operational transformation algorithm for maintaining consistency
 * in collaborative text editing environments.
 */
export class OperationalTransform {
  /**
   * Transform an operation against another operation that was applied concurrently
   * This is the core of OT - ensuring operations can be applied in any order
   * while maintaining document consistency.
   */
  static transform(op1: TextOperation, op2: TextOperation): TextOperation {
    // If both operations are at different positions, no transformation needed
    if (op1.type === 'retain' && op2.type === 'retain') {
      return op1;
    }

    // Handle insert vs insert conflicts
    if (op1.type === 'insert' && op2.type === 'insert') {
      const pos1 = op1.position || 0;
      const pos2 = op2.position || 0;
      
      if (pos1 <= pos2) {
        // op1 comes before op2, adjust op2's position
        return {
          ...op2,
          position: pos2 + (op1.content?.length || 0),
        };
      } else {
        // op2 comes before op1, no change needed for op1
        return op1;
      }
    }

    // Handle insert vs delete conflicts
    if (op1.type === 'insert' && op2.type === 'delete') {
      const insertPos = op1.position || 0;
      const deletePos = op2.position || 0;
      const deleteEnd = deletePos + op2.length;

      if (insertPos <= deletePos) {
        // Insert comes before delete, adjust delete position
        return {
          ...op2,
          position: deletePos + (op1.content?.length || 0),
        };
      } else if (insertPos > deleteEnd) {
        // Insert comes after delete, no change needed
        return op1;
      } else {
        // Insert is within delete range, adjust accordingly
        return {
          ...op2,
          length: op2.length + (op1.content?.length || 0),
        };
      }
    }

    // Handle delete vs insert conflicts (symmetric to above)
    if (op1.type === 'delete' && op2.type === 'insert') {
      const deletePos = op1.position || 0;
      const deleteEnd = deletePos + op1.length;
      const insertPos = op2.position || 0;

      if (insertPos <= deletePos) {
        // Insert comes before delete, adjust delete position
        return {
          ...op1,
          position: deletePos + (op2.content?.length || 0),
        };
      } else if (insertPos > deleteEnd) {
        // Insert comes after delete, no change needed
        return op2;
      } else {
        // Insert is within delete range
        return {
          ...op2,
          position: deletePos,
        };
      }
    }

    // Handle delete vs delete conflicts
    if (op1.type === 'delete' && op2.type === 'delete') {
      const pos1 = op1.position || 0;
      const end1 = pos1 + op1.length;
      const pos2 = op2.position || 0;
      const end2 = pos2 + op2.length;

      // No overlap
      if (end1 <= pos2) {
        // op1 comes before op2, adjust op2's position
        return {
          ...op2,
          position: pos2 - op1.length,
        };
      } else if (end2 <= pos1) {
        // op2 comes before op1, adjust op1's position
        return {
          ...op1,
          position: pos1 - op2.length,
        };
      } else {
        // Overlapping deletes - complex case, merge them
        const newPos = Math.min(pos1, pos2);
        const newEnd = Math.max(end1, end2);
        return {
          type: 'delete',
          position: newPos,
          length: newEnd - newPos - Math.max(0, Math.min(end1, end2) - Math.max(pos1, pos2)),
        };
      }
    }

    // Default case - return the operation unchanged
    return op1;
  }

  /**
   * Apply a series of operations to transform them against a base operation
   */
  static transformOperations(operations: TextOperation[], baseOp: TextOperation): TextOperation[] {
    return operations.map(op => this.transform(op, baseOp));
  }

  /**
   * Compose two operations into a single operation
   * Useful for optimizing operation sequences
   */
  static compose(op1: TextOperation, op2: TextOperation): TextOperation[] {
    // If operations are adjacent and compatible, combine them
    if (op1.type === 'insert' && op2.type === 'insert') {
      const pos1 = op1.position || 0;
      const pos2 = op2.position || 0;
      const len1 = op1.content?.length || 0;

      if (pos1 + len1 === pos2) {
        // Adjacent inserts can be combined
        return [{
          type: 'insert',
          position: pos1,
          content: (op1.content || '') + (op2.content || ''),
          length: len1 + (op2.content?.length || 0),
        }];
      }
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      const pos1 = op1.position || 0;
      const pos2 = op2.position || 0;

      if (pos1 === pos2) {
        // Adjacent deletes at same position can be combined
        return [{
          type: 'delete',
          position: pos1,
          length: op1.length + op2.length,
        }];
      }
    }

    // Cannot compose, return both operations
    return [op1, op2];
  }

  /**
   * Apply an operation to a document content string
   */
  static applyOperation(content: string, operation: TextOperation): string {
    switch (operation.type) {
      case 'insert':
        const insertPos = operation.position || 0;
        const insertContent = operation.content || '';
        return content.slice(0, insertPos) + insertContent + content.slice(insertPos);

      case 'delete':
        const deletePos = operation.position || 0;
        const deleteEnd = deletePos + operation.length;
        return content.slice(0, deletePos) + content.slice(deleteEnd);

      case 'retain':
        // Retain operations don't change content
        return content;

      default:
        return content;
    }
  }

  /**
   * Apply a series of operations to document content
   */
  static applyOperations(content: string, operations: TextOperation[]): string {
    return operations.reduce((acc, op) => this.applyOperation(acc, op), content);
  }

  /**
   * Calculate the inverse of an operation for rollback purposes
   */
  static invertOperation(operation: TextOperation, originalContent: string): TextOperation {
    switch (operation.type) {
      case 'insert':
        // Inverse of insert is delete
        return {
          type: 'delete',
          position: operation.position,
          length: operation.content?.length || 0,
        };

      case 'delete':
        // Inverse of delete is insert (need to get the deleted content)
        const deletePos = operation.position || 0;
        const deletedContent = originalContent.slice(deletePos, deletePos + operation.length);
        return {
          type: 'insert',
          position: deletePos,
          content: deletedContent,
          length: deletedContent.length,
        };

      case 'retain':
        // Retain operations are their own inverse
        return operation;

      default:
        return operation;
    }
  }

  /**
   * Check if two operations conflict (affect the same content region)
   */
  static operationsConflict(op1: TextOperation, op2: TextOperation): boolean {
    if (op1.type === 'retain' || op2.type === 'retain') {
      return false;
    }

    const getRange = (op: TextOperation) => {
      const pos = op.position || 0;
      const length = op.type === 'insert' ? 0 : op.length;
      return { start: pos, end: pos + length };
    };

    const range1 = getRange(op1);
    const range2 = getRange(op2);

    // Check for overlap
    return !(range1.end <= range2.start || range2.end <= range1.start);
  }

  /**
   * Generate a diff between two text strings as operations
   */
  static generateDiff(oldText: string, newText: string): TextOperation[] {
    const operations: TextOperation[] = [];
    
    // Simple character-by-character diff
    // In a production system, you'd want a more sophisticated algorithm like Myers' diff
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldText.length || newIndex < newText.length) {
      if (oldIndex >= oldText.length) {
        // Only new text remains - insert
        operations.push({
          type: 'insert',
          position: oldIndex,
          content: newText.slice(newIndex),
          length: newText.length - newIndex,
        });
        break;
      } else if (newIndex >= newText.length) {
        // Only old text remains - delete
        operations.push({
          type: 'delete',
          position: oldIndex,
          length: oldText.length - oldIndex,
        });
        break;
      } else if (oldText[oldIndex] === newText[newIndex]) {
        // Characters match - retain
        oldIndex++;
        newIndex++;
      } else {
        // Characters differ - need to determine if it's insert, delete, or replace
        let insertEnd = newIndex;
        let deleteEnd = oldIndex;
        
        // Find end of differing section
        while (insertEnd < newText.length && deleteEnd < oldText.length && 
               newText[insertEnd] !== oldText[deleteEnd]) {
          insertEnd++;
          deleteEnd++;
        }
        
        // Delete old content
        if (deleteEnd > oldIndex) {
          operations.push({
            type: 'delete',
            position: oldIndex,
            length: deleteEnd - oldIndex,
          });
        }
        
        // Insert new content
        if (insertEnd > newIndex) {
          operations.push({
            type: 'insert',
            position: oldIndex,
            content: newText.slice(newIndex, insertEnd),
            length: insertEnd - newIndex,
          });
        }
        
        oldIndex = deleteEnd;
        newIndex = insertEnd;
      }
    }
    
    return operations;
  }
}