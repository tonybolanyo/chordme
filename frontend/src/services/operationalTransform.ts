// Operational Transformation engine for real-time collaborative editing
import type { 
  TextOperation, 
  ChordProOperation, 
  VectorClock, 
  OrderedOperation, 
  OperationHistory, 
  DocumentCheckpoint,
  RecoveryState,
  OperationFailure
} from '../types/collaboration';

/**
 * Operational Transformation (OT) class for handling concurrent text editing
 * Based on the operational transformation algorithm for maintaining consistency
 * in collaborative text editing environments.
 * 
 * Enhanced with:
 * - Vector clocks for operation ordering
 * - Undo/redo functionality
 * - ChordPro-specific operations
 * - Recovery mechanisms
 * - Performance optimizations
 */
export class OperationalTransform {
  /**
   * Transform an operation against another operation that was applied concurrently
   * This is the core of OT - ensuring operations can be applied in any order
   * while maintaining document consistency.
   * 
   * The function transforms op2 against op1 (op1 has priority in case of conflicts)
   */
  static transform(op1: TextOperation, op2: TextOperation): TextOperation {
    // Retain operations don't affect transformations
    if (op1.type === 'retain' || op2.type === 'retain') {
      return op2;
    }

    const pos1 = op1.position || 0;
    const pos2 = op2.position || 0;

    // Handle insert vs insert conflicts
    if (op1.type === 'insert' && op2.type === 'insert') {
      if (pos1 < pos2 || (pos1 === pos2 && op1.content && op2.content && op1.content <= op2.content)) {
        // op1 comes before op2 (or has lexicographic priority), adjust op2's position
        return {
          ...op2,
          position: pos2 + (op1.content?.length || 0),
        };
      } else {
        // op2 comes before op1, no change needed
        return op2;
      }
    }

    // Handle insert vs delete conflicts
    if (op1.type === 'insert' && op2.type === 'delete') {
      const deleteEnd = pos2 + op2.length;

      if (pos1 <= pos2) {
        // Insert comes before delete, adjust delete position
        return {
          ...op2,
          position: pos2 + (op1.content?.length || 0),
        };
      } else if (pos1 >= deleteEnd) {
        // Insert comes after delete, no change needed
        return op2;
      } else {
        // Insert is within delete range, extend delete length
        return {
          ...op2,
          length: op2.length + (op1.content?.length || 0),
        };
      }
    }

    // Handle delete vs insert conflicts
    if (op1.type === 'delete' && op2.type === 'insert') {
      const deleteEnd = pos1 + op1.length;

      if (pos2 <= pos1) {
        // Insert comes before delete, adjust delete position
        return op2;
      } else if (pos2 >= deleteEnd) {
        // Insert comes after delete, adjust insert position
        return {
          ...op2,
          position: pos2 - op1.length,
        };
      } else {
        // Insert is within delete range, move to delete start
        return {
          ...op2,
          position: pos1,
        };
      }
    }

    // Handle delete vs delete conflicts
    if (op1.type === 'delete' && op2.type === 'delete') {
      const end1 = pos1 + op1.length;
      const end2 = pos2 + op2.length;

      if (end1 <= pos2) {
        // op1 comes before op2, adjust op2's position
        return {
          ...op2,
          position: pos2 - op1.length,
        };
      } else if (end2 <= pos1) {
        // op2 comes before op1, no change needed
        return op2;
      } else {
        // Overlapping deletes - calculate new delete operation
        const overlapStart = Math.max(pos1, pos2);
        const overlapEnd = Math.min(end1, end2);
        const overlapLength = Math.max(0, overlapEnd - overlapStart);
        
        if (pos2 < pos1) {
          // op2 starts before op1, keep the non-overlapping part
          return {
            ...op2,
            length: Math.max(0, op2.length - overlapLength),
          };
        } else {
          // op2 starts after or at op1, adjust position and length
          return {
            ...op2,
            position: pos1,
            length: Math.max(0, end2 - end1),
          };
        }
      }
    }

    // Default case - return the operation unchanged
    return op2;
  }

  /**
   * Apply a series of operations to transform them against a base operation
   */
  static transformOperations(
    operations: TextOperation[],
    baseOp: TextOperation
  ): TextOperation[] {
    return operations.map((op) => this.transform(op, baseOp));
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
        return [
          {
            type: 'insert',
            position: pos1,
            content: (op1.content || '') + (op2.content || ''),
            length: len1 + (op2.content?.length || 0),
          },
        ];
      }
    }

    if (op1.type === 'delete' && op2.type === 'delete') {
      const pos1 = op1.position || 0;
      const pos2 = op2.position || 0;

      if (pos1 === pos2) {
        // Adjacent deletes at same position can be combined
        return [
          {
            type: 'delete',
            position: pos1,
            length: op1.length + op2.length,
          },
        ];
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
        let insertPos = operation.position || 0;
        const insertContent = operation.content || '';
        
        // Handle negative positions by treating as 0
        if (insertPos < 0) {
          insertPos = 0;
        }
        
        // Handle positions beyond content length
        if (insertPos > content.length) {
          insertPos = content.length;
        }
        
        return (
          content.slice(0, insertPos) + insertContent + content.slice(insertPos)
        );

      case 'delete':
        let deletePos = operation.position || 0;
        let deleteEnd = deletePos + operation.length;
        
        // Handle negative positions
        if (deletePos < 0) {
          deletePos = 0;
        }
        
        // Handle positions beyond content length
        if (deletePos >= content.length) {
          return content;
        }
        
        // Clamp delete end to content length
        if (deleteEnd > content.length) {
          deleteEnd = content.length;
        }
        
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
    return operations.reduce(
      (acc, op) => this.applyOperation(acc, op),
      content
    );
  }

  /**
   * Calculate the inverse of an operation for rollback purposes
   */
  static invertOperation(
    operation: TextOperation,
    originalContent: string
  ): TextOperation {
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
        const deletedContent = originalContent.slice(
          deletePos,
          deletePos + operation.length
        );
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

    // Special case: Insert operations conflict if they're at the boundary of a delete operation
    if (this.isInsertDeleteBoundaryConflict(op1, op2)) {
      return true;
    }
    if (this.isInsertDeleteBoundaryConflict(op2, op1)) {
      return true;
    }

    // Check for overlap for other cases
    return !(range1.end <= range2.start || range2.end <= range1.start);
  }

  /**
   * Check if insert operation conflicts with delete operation at boundary
   */
  static isInsertDeleteBoundaryConflict(
    op1: TextOperation,
    op2: TextOperation
  ): boolean {
    // Only check if one is insert and other is delete
    if (
      !(op1.type === 'insert' && op2.type === 'delete') &&
      !(op1.type === 'delete' && op2.type === 'insert')
    ) {
      return false;
    }

    const insertOp = op1.type === 'insert' ? op1 : op2;
    const deleteOp = op1.type === 'delete' ? op1 : op2;

    const insertPos = insertOp.position || 0;
    const deleteStart = deleteOp.position || 0;
    const deleteEnd = deleteStart + (deleteOp.length || 0);

    // Insert conflicts if it's at the exact boundary of the delete operation
    return insertPos === deleteStart || insertPos === deleteEnd;
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
        while (
          insertEnd < newText.length &&
          deleteEnd < oldText.length &&
          newText[insertEnd] !== oldText[deleteEnd]
        ) {
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

  /**
   * Generate conflict markers for manual merge resolution
   */
  static generateConflictMarkers(
    localContent: string,
    remoteContent: string,
    localUser: string,
    remoteUser: string
  ): string {
    return `<<<<<<< ${localUser}\n${localContent}\n=======\n${remoteContent}\n>>>>>>> ${remoteUser}`;
  }

  /**
   * Check if two sets of operations can be automatically merged
   */
  static canAutoMerge(
    localOps: TextOperation[],
    remoteOps: TextOperation[]
  ): boolean {
    // Check for conflicts between operation sets
    for (const localOp of localOps) {
      for (const remoteOp of remoteOps) {
        if (this.operationsConflict(localOp, remoteOp)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Validate that a sequence of operations can be applied consistently
   */
  static validateOperationSequence(
    operations: TextOperation[],
    initialContent: string
  ): boolean {
    let content = initialContent;

    try {
      for (const op of operations) {
        // Check bounds
        const pos = op.position || 0;

        if (pos < 0) return false;

        if (op.type === 'insert') {
          if (pos > content.length) return false;
        } else if (op.type === 'delete') {
          if (pos >= content.length || pos + op.length > content.length)
            return false;
        }

        // Apply operation to validate
        content = this.applyOperation(content, op);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Compute new document version after applying operations
   */
  static computeVersionAfterOperations(
    initialVersion: number,
    operations: TextOperation[]
  ): number {
    return initialVersion + operations.length;
  }

  // === VECTOR CLOCK SYSTEM ===

  /**
   * Create a new vector clock
   */
  static createVectorClock(userId: string): VectorClock {
    return { [userId]: 0 };
  }

  /**
   * Increment vector clock for a user
   */
  static incrementVectorClock(clock: VectorClock, userId: string): VectorClock {
    return {
      ...clock,
      [userId]: (clock[userId] || 0) + 1,
    };
  }

  /**
   * Merge two vector clocks (taking maximum of each user's clock)
   */
  static mergeVectorClocks(clock1: VectorClock, clock2: VectorClock): VectorClock {
    const merged: VectorClock = { ...clock1 };
    
    for (const userId in clock2) {
      merged[userId] = Math.max(merged[userId] || 0, clock2[userId]);
    }
    
    return merged;
  }

  /**
   * Compare two vector clocks
   * Returns: 'before', 'after', 'concurrent', or 'equal'
   */
  static compareVectorClocks(clock1: VectorClock, clock2: VectorClock): 'before' | 'after' | 'concurrent' | 'equal' {
    const allUsers = new Set([...Object.keys(clock1), ...Object.keys(clock2)]);
    
    let clock1Greater = false;
    let clock2Greater = false;
    
    for (const userId of allUsers) {
      const val1 = clock1[userId] || 0;
      const val2 = clock2[userId] || 0;
      
      if (val1 > val2) {
        clock1Greater = true;
      } else if (val2 > val1) {
        clock2Greater = true;
      }
    }
    
    if (clock1Greater && !clock2Greater) return 'after';
    if (clock2Greater && !clock1Greater) return 'before';
    if (!clock1Greater && !clock2Greater) return 'equal';
    return 'concurrent';
  }

  /**
   * Check if operation can be applied based on vector clock dependencies
   */
  static canApplyOperation(operation: OrderedOperation, currentClock: VectorClock): boolean {
    const comparison = this.compareVectorClocks(currentClock, operation.vectorClock);
    return comparison === 'after' || comparison === 'equal';
  }

  /**
   * Order operations based on vector clocks and timestamps
   */
  static orderOperations(operations: OrderedOperation[]): OrderedOperation[] {
    return operations.sort((a, b) => {
      const clockComparison = this.compareVectorClocks(a.vectorClock, b.vectorClock);
      
      if (clockComparison === 'before') return -1;
      if (clockComparison === 'after') return 1;
      
      // For concurrent operations, use timestamp as tiebreaker
      if (clockComparison === 'concurrent') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      }
      
      return 0;
    });
  }

  // === OPERATION HISTORY AND UNDO/REDO ===

  /**
   * Create a new operation history
   */
  static createOperationHistory(maxSize = 100): OperationHistory {
    return {
      operations: [],
      undoStack: [],
      redoStack: [],
      currentIndex: -1,
      maxHistorySize: maxSize,
    };
  }

  /**
   * Add operation to history
   */
  static addToHistory(history: OperationHistory, operation: OrderedOperation): OperationHistory {
    const newOperations = [...history.operations];
    const newUndoStack = [...history.undoStack];
    
    // Add operation to history
    newOperations.push(operation);
    
    // Trim history if too large
    if (newOperations.length > history.maxHistorySize) {
      newOperations.shift();
    }
    
    // Add to undo stack if it's not an undo operation
    if (!operation.operation.type.includes('undo')) {
      newUndoStack.push(operation.id);
    }
    
    return {
      ...history,
      operations: newOperations,
      undoStack: newUndoStack,
      redoStack: [], // Clear redo stack when new operation is added
      currentIndex: newOperations.length - 1,
    };
  }

  /**
   * Generate undo operation for a given operation
   */
  static generateUndoOperation(
    operation: OrderedOperation,
    originalContent: string,
    userId: string,
    vectorClock: VectorClock
  ): OrderedOperation | null {
    if (operation.operation.type === 'insert') {
      const textOp = operation.operation as TextOperation;
      return {
        id: `undo-${operation.id}`,
        operation: {
          type: 'delete',
          position: textOp.position,
          length: textOp.content?.length || 0,
        },
        vectorClock: this.incrementVectorClock(vectorClock, userId),
        userId,
        timestamp: new Date().toISOString(),
        dependencies: [operation.id],
      };
    }
    
    if (operation.operation.type === 'delete') {
      const textOp = operation.operation as TextOperation;
      const deletedContent = originalContent.slice(
        textOp.position || 0,
        (textOp.position || 0) + textOp.length
      );
      
      return {
        id: `undo-${operation.id}`,
        operation: {
          type: 'insert',
          position: textOp.position,
          content: deletedContent,
          length: deletedContent.length,
        },
        vectorClock: this.incrementVectorClock(vectorClock, userId),
        userId,
        timestamp: new Date().toISOString(),
        dependencies: [operation.id],
      };
    }
    
    return null;
  }

  /**
   * Perform undo operation
   */
  static performUndo(
    history: OperationHistory,
    currentContent: string,
    userId: string,
    vectorClock: VectorClock
  ): { undoOperation: OrderedOperation | null; newHistory: OperationHistory } {
    if (history.undoStack.length === 0) {
      return { undoOperation: null, newHistory: history };
    }
    
    const lastOperationId = history.undoStack[history.undoStack.length - 1];
    const lastOperation = history.operations.find(op => op.id === lastOperationId);
    
    if (!lastOperation) {
      return { undoOperation: null, newHistory: history };
    }
    
    const undoOperation = this.generateUndoOperation(lastOperation, currentContent, userId, vectorClock);
    
    const newUndoStack = history.undoStack.slice(0, -1);
    const newRedoStack = [...history.redoStack, lastOperationId];
    
    return {
      undoOperation,
      newHistory: {
        ...history,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      },
    };
  }

  /**
   * Perform redo operation
   */
  static performRedo(
    history: OperationHistory,
    currentContent: string,
    userId: string,
    vectorClock: VectorClock
  ): { redoOperation: OrderedOperation | null; newHistory: OperationHistory } {
    if (history.redoStack.length === 0) {
      return { redoOperation: null, newHistory: history };
    }
    
    const redoOperationId = history.redoStack[history.redoStack.length - 1];
    const redoOperation = history.operations.find(op => op.id === redoOperationId);
    
    if (!redoOperation) {
      return { redoOperation: null, newHistory: history };
    }
    
    const newRedoStack = history.redoStack.slice(0, -1);
    const newUndoStack = [...history.undoStack, redoOperationId];
    
    return {
      redoOperation,
      newHistory: {
        ...history,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      },
    };
  }

  // === CHORDPRO-SPECIFIC OPERATIONS ===

  /**
   * Apply ChordPro-specific operation to content
   */
  static applyChordProOperation(content: string, operation: ChordProOperation): string {
    switch (operation.type) {
      case 'chord-insert':
        if (operation.chordData) {
          const insertPos = Math.max(0, Math.min(operation.position, content.length));
          const chordNotation = `[${operation.chordData.original}]`;
          return content.slice(0, insertPos) + chordNotation + content.slice(insertPos);
        }
        break;
        
      case 'chord-modify':
        if (operation.chordData) {
          // Find and replace existing chord at position
          const chordPattern = /\[[^\]]+\]/g;
          let match;
          
          while ((match = chordPattern.exec(content)) !== null) {
            if (match.index <= operation.position && match.index + match[0].length > operation.position) {
              const newChord = `[${operation.chordData.original}]`;
              return content.slice(0, match.index) + newChord + content.slice(match.index + match[0].length);
            }
          }
        }
        break;
        
      case 'directive-insert':
        if (operation.directiveData) {
          const insertPos = Math.max(0, Math.min(operation.position, content.length));
          const directive = `{${operation.directiveData.type}: ${operation.directiveData.value}}`;
          return content.slice(0, insertPos) + directive + content.slice(insertPos);
        }
        break;
        
      case 'directive-modify':
        if (operation.directiveData) {
          // Find and replace existing directive at position
          const directivePattern = /\{[^}]+\}/g;
          let match;
          
          while ((match = directivePattern.exec(content)) !== null) {
            if (match.index <= operation.position && match.index + match[0].length > operation.position) {
              const newDirective = `{${operation.directiveData.type}: ${operation.directiveData.value}}`;
              return content.slice(0, match.index) + newDirective + content.slice(match.index + match[0].length);
            }
          }
        }
        break;
        
      case 'directive-delete':
        // Find and delete directive at position
        const directivePattern = /\{[^}]+\}/g;
        let match;
        
        while ((match = directivePattern.exec(content)) !== null) {
          if (match.index <= operation.position && match.index + match[0].length > operation.position) {
            return content.slice(0, match.index) + content.slice(match.index + match[0].length);
          }
        }
        break;
    }
    
    return content;
  }

  /**
   * Transform ChordPro operation against text operation
   */
  static transformChordProOperation(
    chordProOp: ChordProOperation,
    textOp: TextOperation
  ): ChordProOperation {
    const textPos = textOp.position || 0;
    
    if (textOp.type === 'insert') {
      if (textPos <= chordProOp.position) {
        return {
          ...chordProOp,
          position: chordProOp.position + (textOp.content?.length || 0),
        };
      }
    } else if (textOp.type === 'delete') {
      const deleteEnd = textPos + textOp.length;
      
      if (deleteEnd <= chordProOp.position) {
        return {
          ...chordProOp,
          position: chordProOp.position - textOp.length,
        };
      } else if (textPos < chordProOp.position) {
        // ChordPro operation is within deleted range, move to delete start
        return {
          ...chordProOp,
          position: textPos,
        };
      }
    }
    
    return chordProOp;
  }

  /**
   * Extract chords from ChordPro content
   */
  static extractChordsFromContent(content: string): Array<{ chord: string; position: number }> {
    const chords: Array<{ chord: string; position: number }> = [];
    const chordPattern = /\[([^\]]+)\]/g;
    let match;
    
    while ((match = chordPattern.exec(content)) !== null) {
      chords.push({
        chord: match[1],
        position: match.index,
      });
    }
    
    return chords;
  }

  /**
   * Extract directives from ChordPro content
   */
  static extractDirectivesFromContent(content: string): Array<{ type: string; value: string; position: number }> {
    const directives: Array<{ type: string; value: string; position: number }> = [];
    const directivePattern = /\{([^:}]+):\s*([^}]+)\}/g;
    let match;
    
    while ((match = directivePattern.exec(content)) !== null) {
      directives.push({
        type: match[1],
        value: match[2],
        position: match.index,
      });
    }
    
    return directives;
  }

  // === RECOVERY MECHANISMS ===

  /**
   * Create document checkpoint for recovery
   */
  static createCheckpoint(
    content: string,
    version: number,
    vectorClock: VectorClock,
    operationId: string
  ): DocumentCheckpoint {
    return {
      id: `checkpoint-${Date.now()}`,
      content,
      version,
      vectorClock: { ...vectorClock },
      timestamp: new Date().toISOString(),
      operationId,
    };
  }

  /**
   * Attempt to recover from operation failure
   */
  static attemptRecovery(
    failure: OperationFailure,
    checkpoints: DocumentCheckpoint[],
    operations: OrderedOperation[]
  ): { success: boolean; recoveredContent?: string; recoveryStrategy: string } {
    // Strategy 1: Retry with exponential backoff
    if (failure.retryCount < 3 && failure.canRecover) {
      return {
        success: false,
        recoveryStrategy: 'retry',
      };
    }
    
    // Strategy 2: Skip failed operation and continue
    if (failure.canRecover) {
      return {
        success: true,
        recoveryStrategy: 'skip',
      };
    }
    
    // Strategy 3: Rollback to last known good state
    if (checkpoints.length > 0) {
      const lastCheckpoint = checkpoints[checkpoints.length - 1];
      
      // Replay operations from checkpoint
      let content = lastCheckpoint.content;
      const operationsAfterCheckpoint = operations.filter(
        op => new Date(op.timestamp) > new Date(lastCheckpoint.timestamp) && op.id !== failure.operationId
      );
      
      try {
        for (const op of operationsAfterCheckpoint) {
          if (op.operation.type === 'insert' || op.operation.type === 'delete' || op.operation.type === 'retain') {
            content = this.applyOperation(content, op.operation as TextOperation);
          }
        }
        
        return {
          success: true,
          recoveredContent: content,
          recoveryStrategy: 'rollback',
        };
      } catch (error) {
        return {
          success: false,
          recoveryStrategy: 'manual',
        };
      }
    }
    
    return {
      success: false,
      recoveryStrategy: 'manual',
    };
  }

  /**
   * Validate operation sequence for potential issues
   */
  static validateOperationForRecovery(
    operation: OrderedOperation,
    currentContent: string,
    currentVectorClock: VectorClock
  ): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check vector clock dependencies
    if (!this.canApplyOperation(operation, currentVectorClock)) {
      issues.push('Vector clock dependency not satisfied');
    }
    
    // Check operation bounds
    if (operation.operation.type === 'insert' || operation.operation.type === 'delete') {
      const textOp = operation.operation as TextOperation;
      const pos = textOp.position || 0;
      
      if (pos < 0) {
        issues.push('Negative position');
      }
      
      if (textOp.type === 'insert' && pos > currentContent.length) {
        issues.push('Insert position beyond content length');
      }
      
      if (textOp.type === 'delete') {
        if (pos >= currentContent.length) {
          issues.push('Delete position beyond content length');
        }
        if (pos + textOp.length > currentContent.length) {
          issues.push('Delete length extends beyond content');
        }
      }
    }
    
    return {
      valid: issues.length === 0,
      issues,
    };
  }

  // === PERFORMANCE OPTIMIZATIONS ===

  /**
   * Compress operation sequence by merging adjacent operations
   */
  static compressOperations(operations: TextOperation[]): TextOperation[] {
    if (operations.length <= 1) return operations;
    
    const compressed: TextOperation[] = [];
    let current = operations[0];
    
    for (let i = 1; i < operations.length; i++) {
      const next = operations[i];
      const merged = this.compose(current, next);
      
      if (merged.length === 1) {
        // Successfully merged
        current = merged[0];
      } else {
        // Cannot merge, add current and move to next
        compressed.push(current);
        current = next;
      }
    }
    
    compressed.push(current);
    return compressed;
  }

  /**
   * Optimize operation sequence for bandwidth
   */
  static optimizeForBandwidth(operations: OrderedOperation[]): OrderedOperation[] {
    // Group operations by user and time window
    const groups = new Map<string, OrderedOperation[]>();
    
    for (const op of operations) {
      const key = `${op.userId}-${Math.floor(new Date(op.timestamp).getTime() / 1000)}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(op);
    }
    
    // Compress operations within each group
    const optimized: OrderedOperation[] = [];
    
    for (const group of groups.values()) {
      if (group.length === 1) {
        optimized.push(group[0]);
        continue;
      }
      
      // Try to compress text operations
      const textOps = group
        .filter(op => op.operation.type === 'insert' || op.operation.type === 'delete' || op.operation.type === 'retain')
        .map(op => op.operation as TextOperation);
      
      if (textOps.length === group.length) {
        const compressed = this.compressOperations(textOps);
        
        if (compressed.length < textOps.length) {
          // Create new optimized operations
          const baseOp = group[0];
          for (let i = 0; i < compressed.length; i++) {
            optimized.push({
              ...baseOp,
              id: `${baseOp.id}-compressed-${i}`,
              operation: compressed[i],
            });
          }
          continue;
        }
      }
      
      // No compression possible, add all operations
      optimized.push(...group);
    }
    
    return optimized;
  }
}
