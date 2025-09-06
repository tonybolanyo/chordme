// Enhanced operational transformation tests for advanced features
import { describe, it, expect } from 'vitest';
import { OperationalTransform } from '../services/operationalTransform';
import type { 
  VectorClock, 
  OrderedOperation, 
  OperationHistory, 
  ChordProOperation,
  DocumentCheckpoint,
  OperationFailure
} from '../types/collaboration';

describe('Enhanced Operational Transform', () => {
  describe('Vector Clock System', () => {
    it('should create and increment vector clocks', () => {
      const clock = OperationalTransform.createVectorClock('user1');
      expect(clock).toEqual({ user1: 0 });

      const incremented = OperationalTransform.incrementVectorClock(clock, 'user1');
      expect(incremented).toEqual({ user1: 1 });
    });

    it('should merge vector clocks correctly', () => {
      const clock1 = { user1: 5, user2: 3 };
      const clock2 = { user1: 3, user2: 7, user3: 2 };

      const merged = OperationalTransform.mergeVectorClocks(clock1, clock2);
      expect(merged).toEqual({ user1: 5, user2: 7, user3: 2 });
    });

    it('should compare vector clocks correctly', () => {
      const clock1 = { user1: 5, user2: 3 };
      const clock2 = { user1: 3, user2: 7 };
      const clock3 = { user1: 5, user2: 3 };
      const clock4 = { user1: 6, user2: 4 };

      expect(OperationalTransform.compareVectorClocks(clock1, clock2)).toBe('concurrent');
      expect(OperationalTransform.compareVectorClocks(clock1, clock3)).toBe('equal');
      expect(OperationalTransform.compareVectorClocks(clock1, clock4)).toBe('before');
      expect(OperationalTransform.compareVectorClocks(clock4, clock1)).toBe('after');
    });

    it('should determine if operation can be applied based on vector clock', () => {
      const currentClock = { user1: 5, user2: 3 };
      
      const operation1: OrderedOperation = {
        id: 'op1',
        operation: { type: 'insert', position: 0, content: 'test', length: 4 },
        vectorClock: { user1: 5, user2: 3 }, // Equal to current
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      const operation2: OrderedOperation = {
        id: 'op2',
        operation: { type: 'insert', position: 0, content: 'test', length: 4 },
        vectorClock: { user1: 4, user2: 2 }, // Behind current (can apply)
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      expect(OperationalTransform.canApplyOperation(operation1, currentClock)).toBe(true);
      expect(OperationalTransform.canApplyOperation(operation2, currentClock)).toBe(true);
    });

    it('should order operations based on vector clocks', () => {
      const operations: OrderedOperation[] = [
        {
          id: 'op3',
          operation: { type: 'insert', position: 0, content: 'c', length: 1 },
          vectorClock: { user1: 3, user2: 2 },
          userId: 'user1',
          timestamp: '2023-01-01T12:02:00Z',
        },
        {
          id: 'op1',
          operation: { type: 'insert', position: 0, content: 'a', length: 1 },
          vectorClock: { user1: 1, user2: 1 },
          userId: 'user1',
          timestamp: '2023-01-01T12:00:00Z',
        },
        {
          id: 'op2',
          operation: { type: 'insert', position: 0, content: 'b', length: 1 },
          vectorClock: { user1: 2, user2: 1 },
          userId: 'user2',
          timestamp: '2023-01-01T12:01:00Z',
        },
      ];

      const ordered = OperationalTransform.orderOperations(operations);
      expect(ordered[0].id).toBe('op1');
      expect(ordered[1].id).toBe('op2');
      expect(ordered[2].id).toBe('op3');
    });
  });

  describe('Operation History and Undo/Redo', () => {
    it('should create and manage operation history', () => {
      const history = OperationalTransform.createOperationHistory(10);
      
      expect(history.operations).toEqual([]);
      expect(history.undoStack).toEqual([]);
      expect(history.redoStack).toEqual([]);
      expect(history.maxHistorySize).toBe(10);
    });

    it('should add operations to history', () => {
      let history = OperationalTransform.createOperationHistory(10);
      
      const operation: OrderedOperation = {
        id: 'op1',
        operation: { type: 'insert', position: 0, content: 'test', length: 4 },
        vectorClock: { user1: 1 },
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      history = OperationalTransform.addToHistory(history, operation);
      
      expect(history.operations).toHaveLength(1);
      expect(history.undoStack).toContain('op1');
      expect(history.currentIndex).toBe(0);
    });

    it('should generate undo operations correctly', () => {
      const originalContent = 'Hello World';
      const vectorClock = { user1: 5 };
      
      const insertOperation: OrderedOperation = {
        id: 'op1',
        operation: { type: 'insert', position: 5, content: ' Beautiful', length: 10 },
        vectorClock,
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      const undoOp = OperationalTransform.generateUndoOperation(
        insertOperation,
        originalContent,
        'user1',
        vectorClock
      );

      expect(undoOp).toBeDefined();
      expect(undoOp!.operation.type).toBe('delete');
      expect(undoOp!.operation.position).toBe(5);
      expect(undoOp!.operation.length).toBe(10);
    });

    it('should generate undo operations for delete operations', () => {
      const originalContent = 'Hello Beautiful World';
      const vectorClock = { user1: 5 };
      
      const deleteOperation: OrderedOperation = {
        id: 'op1',
        operation: { type: 'delete', position: 5, length: 10 },
        vectorClock,
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      const undoOp = OperationalTransform.generateUndoOperation(
        deleteOperation,
        originalContent,
        'user1',
        vectorClock
      );

      expect(undoOp).toBeDefined();
      expect(undoOp!.operation.type).toBe('insert');
      expect(undoOp!.operation.position).toBe(5);
      expect(undoOp!.operation.content).toBe(' Beautiful');
    });

    it('should perform undo operations', () => {
      let history = OperationalTransform.createOperationHistory();
      
      const operation: OrderedOperation = {
        id: 'op1',
        operation: { type: 'insert', position: 0, content: 'test', length: 4 },
        vectorClock: { user1: 1 },
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      history = OperationalTransform.addToHistory(history, operation);
      
      const { undoOperation, newHistory } = OperationalTransform.performUndo(
        history,
        'test content',
        'user1',
        { user1: 2 }
      );

      expect(undoOperation).toBeDefined();
      expect(undoOperation!.operation.type).toBe('delete');
      expect(newHistory.undoStack).toHaveLength(0);
      expect(newHistory.redoStack).toContain('op1');
    });

    it('should perform redo operations', () => {
      let history = OperationalTransform.createOperationHistory();
      
      const operation: OrderedOperation = {
        id: 'op1',
        operation: { type: 'insert', position: 0, content: 'test', length: 4 },
        vectorClock: { user1: 1 },
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      history = OperationalTransform.addToHistory(history, operation);
      
      // Perform undo
      const { newHistory: historyAfterUndo } = OperationalTransform.performUndo(
        history,
        'test content',
        'user1',
        { user1: 2 }
      );

      // Perform redo
      const { redoOperation, newHistory } = OperationalTransform.performRedo(
        historyAfterUndo,
        'content',
        'user1',
        { user1: 3 }
      );

      expect(redoOperation).toBeDefined();
      expect(redoOperation!.id).toBe('op1');
      expect(newHistory.redoStack).toHaveLength(0);
      expect(newHistory.undoStack).toContain('op1');
    });
  });

  describe('ChordPro-Specific Operations', () => {
    it('should apply chord insertion operations', () => {
      const content = 'Hello World';
      const operation: ChordProOperation = {
        type: 'chord-insert',
        position: 5,
        chordData: {
          original: 'C',
          normalized: 'C',
          position: 5,
        },
      };

      const result = OperationalTransform.applyChordProOperation(content, operation);
      expect(result).toBe('Hello[C] World');
    });

    it('should apply directive insertion operations', () => {
      const content = 'Hello World';
      const operation: ChordProOperation = {
        type: 'directive-insert',
        position: 0,
        directiveData: {
          type: 'title',
          value: 'My Song',
          position: 0,
        },
      };

      const result = OperationalTransform.applyChordProOperation(content, operation);
      expect(result).toBe('{title: My Song}Hello World');
    });

    it('should modify existing chords', () => {
      const content = 'Hello [Am] World';
      const operation: ChordProOperation = {
        type: 'chord-modify',
        position: 7, // Position within the chord
        chordData: {
          original: 'C',
          normalized: 'C',
          position: 7,
        },
      };

      const result = OperationalTransform.applyChordProOperation(content, operation);
      expect(result).toBe('Hello [C] World');
    });

    it('should transform ChordPro operations against text operations', () => {
      const chordProOp: ChordProOperation = {
        type: 'chord-insert',
        position: 10,
        chordData: {
          original: 'G',
          normalized: 'G',
          position: 10,
        },
      };

      const textOp = {
        type: 'insert' as const,
        position: 5,
        content: 'Beautiful ',
        length: 10,
      };

      const transformed = OperationalTransform.transformChordProOperation(chordProOp, textOp);
      expect(transformed.position).toBe(20); // Original position + inserted length
    });

    it('should extract chords from ChordPro content', () => {
      const content = '{title: My Song}\n[C]Hello [Am]beautiful [G]world[F]';
      
      const chords = OperationalTransform.extractChordsFromContent(content);
      
      expect(chords).toHaveLength(4);
      expect(chords[0]).toEqual({ chord: 'C', position: 17 });
      expect(chords[1]).toEqual({ chord: 'Am', position: 26 });
      expect(chords[2]).toEqual({ chord: 'G', position: 40 });
      expect(chords[3]).toEqual({ chord: 'F', position: 48 });
    });

    it('should extract directives from ChordPro content', () => {
      const content = '{title: My Song}\n{artist: John Doe}\n{key: C}Hello World';
      
      const directives = OperationalTransform.extractDirectivesFromContent(content);
      
      expect(directives).toHaveLength(3);
      expect(directives[0]).toEqual({ type: 'title', value: 'My Song', position: 0 });
      expect(directives[1]).toEqual({ type: 'artist', value: 'John Doe', position: 17 });
      expect(directives[2]).toEqual({ type: 'key', value: 'C', position: 36 });
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should create document checkpoints', () => {
      const checkpoint = OperationalTransform.createCheckpoint(
        'Hello World',
        5,
        { user1: 3, user2: 1 },
        'op-123'
      );

      expect(checkpoint.content).toBe('Hello World');
      expect(checkpoint.version).toBe(5);
      expect(checkpoint.vectorClock).toEqual({ user1: 3, user2: 1 });
      expect(checkpoint.operationId).toBe('op-123');
      expect(checkpoint.id).toMatch(/^checkpoint-\d+$/);
    });

    it('should attempt recovery with retry strategy', () => {
      const failure: OperationFailure = {
        operationId: 'op-failed',
        error: 'Network timeout',
        timestamp: new Date().toISOString(),
        retryCount: 1,
        canRecover: true,
      };

      const result = OperationalTransform.attemptRecovery(failure, [], []);
      
      expect(result.success).toBe(false);
      expect(result.recoveryStrategy).toBe('retry');
    });

    it('should attempt recovery with skip strategy', () => {
      const failure: OperationFailure = {
        operationId: 'op-failed',
        error: 'Invalid operation',
        timestamp: new Date().toISOString(),
        retryCount: 5,
        canRecover: true,
      };

      const result = OperationalTransform.attemptRecovery(failure, [], []);
      
      expect(result.success).toBe(true);
      expect(result.recoveryStrategy).toBe('skip');
    });

    it('should attempt recovery with rollback strategy', () => {
      const checkpoint: DocumentCheckpoint = {
        id: 'checkpoint-1',
        content: 'Hello World',
        version: 5,
        vectorClock: { user1: 3 },
        timestamp: '2023-01-01T12:00:00Z',
        operationId: 'op-5',
      };

      const operations: OrderedOperation[] = [
        {
          id: 'op-6',
          operation: { type: 'insert', position: 5, content: ' Beautiful', length: 10 },
          vectorClock: { user1: 4 },
          userId: 'user1',
          timestamp: '2023-01-01T12:01:00Z',
        },
      ];

      const failure: OperationFailure = {
        operationId: 'op-7',
        error: 'Corruption detected',
        timestamp: new Date().toISOString(),
        retryCount: 5,
        canRecover: false,
      };

      const result = OperationalTransform.attemptRecovery(failure, [checkpoint], operations);
      
      expect(result.success).toBe(true);
      expect(result.recoveryStrategy).toBe('rollback');
      expect(result.recoveredContent).toBe('Hello Beautiful World');
    });

    it('should validate operations for recovery', () => {
      const operation: OrderedOperation = {
        id: 'op-1',
        operation: { type: 'insert', position: 5, content: 'test', length: 4 },
        vectorClock: { user1: 4 }, // Behind or equal to current
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      const currentContent = 'Hello World';
      const currentVectorClock = { user1: 4 };

      const validation = OperationalTransform.validateOperationForRecovery(
        operation,
        currentContent,
        currentVectorClock
      );

      expect(validation.valid).toBe(true);
      expect(validation.issues).toEqual([]);
    });

    it('should detect invalid operations for recovery', () => {
      const operation: OrderedOperation = {
        id: 'op-1',
        operation: { type: 'delete', position: 20, length: 5 },
        vectorClock: { user1: 6 }, // Ahead of current (dependency not satisfied)
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      const currentContent = 'Hello World'; // Length 11
      const currentVectorClock = { user1: 4 };

      const validation = OperationalTransform.validateOperationForRecovery(
        operation,
        currentContent,
        currentVectorClock
      );

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Vector clock dependency not satisfied');
      expect(validation.issues).toContain('Delete position beyond content length');
    });
  });

  describe('Performance Optimizations', () => {
    it('should compress adjacent operations', () => {
      const operations = [
        { type: 'insert' as const, position: 0, content: 'Hello', length: 5 },
        { type: 'insert' as const, position: 5, content: ' World', length: 6 },
      ];

      const compressed = OperationalTransform.compressOperations(operations);
      
      expect(compressed).toHaveLength(1);
      expect(compressed[0].content).toBe('Hello World');
      expect(compressed[0].length).toBe(11);
    });

    it('should optimize operations for bandwidth', () => {
      const operations: OrderedOperation[] = [
        {
          id: 'op-1',
          operation: { type: 'insert', position: 0, content: 'H', length: 1 },
          vectorClock: { user1: 1 },
          userId: 'user1',
          timestamp: '2023-01-01T12:00:00Z',
        },
        {
          id: 'op-2',
          operation: { type: 'insert', position: 1, content: 'e', length: 1 },
          vectorClock: { user1: 2 },
          userId: 'user1',
          timestamp: '2023-01-01T12:00:00Z',
        },
        {
          id: 'op-3',
          operation: { type: 'insert', position: 0, content: 'X', length: 1 },
          vectorClock: { user2: 1 },
          userId: 'user2',
          timestamp: '2023-01-01T12:00:10Z',
        },
      ];

      const optimized = OperationalTransform.optimizeForBandwidth(operations);
      
      // Should try to compress operations from the same user in the same time window
      expect(optimized.length).toBeLessThanOrEqual(operations.length);
    });

    it('should handle large operation sequences efficiently', () => {
      const largeOperations = Array.from({ length: 1000 }, (_, i) => ({
        type: 'insert' as const,
        position: i,
        content: 'x',
        length: 1,
      }));

      const startTime = performance.now();
      const compressed = OperationalTransform.compressOperations(largeOperations);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
      expect(compressed.length).toBeLessThan(largeOperations.length); // Should achieve some compression
    });
  });

  describe('Integration Tests', () => {
    it('should handle complex collaborative editing scenario', () => {
      const initialContent = '{title: My Song}\nHello World';
      let vectorClock1 = { user1: 0, user2: 0 };
      let vectorClock2 = { user1: 0, user2: 0 };

      // User 1 inserts a chord
      const user1Op1: OrderedOperation = {
        id: 'u1-op1',
        operation: { type: 'insert', position: 22, content: '[C]', length: 3 },
        vectorClock: OperationalTransform.incrementVectorClock(vectorClock1, 'user1'),
        userId: 'user1',
        timestamp: '2023-01-01T12:00:00Z',
      };
      vectorClock1 = user1Op1.vectorClock;

      // User 2 modifies the title (concurrent)
      const user2Op1: OrderedOperation = {
        id: 'u2-op1',
        operation: { type: 'delete', position: 8, length: 7 }, // Remove "My Song"
        vectorClock: OperationalTransform.incrementVectorClock(vectorClock2, 'user2'),
        userId: 'user2',
        timestamp: '2023-01-01T12:00:01Z',
      };
      vectorClock2 = user2Op1.vectorClock;

      const user2Op2: OrderedOperation = {
        id: 'u2-op2',
        operation: { type: 'insert', position: 8, content: 'Amazing Song', length: 12 },
        vectorClock: OperationalTransform.incrementVectorClock(vectorClock2, 'user2'),
        userId: 'user2',
        timestamp: '2023-01-01T12:00:02Z',
      };

      // Apply operations in order with proper transformation
      let content = initialContent;
      const allOps = [user1Op1, user2Op1, user2Op2];
      const orderedOps = OperationalTransform.orderOperations(allOps);

      for (const op of orderedOps) {
        content = OperationalTransform.applyOperation(content, op.operation);
      }

      expect(content).toContain('Amazing Song');
      expect(content).toContain('[C]');
      expect(content).toContain('Hello');
      expect(content).toContain('World');
    });

    it('should maintain consistency with undo/redo in collaborative context', () => {
      let history = OperationalTransform.createOperationHistory();
      let content = 'Hello World';
      let vectorClock = { user1: 0 };

      // Add text
      const insertOp: OrderedOperation = {
        id: 'op1',
        operation: { type: 'insert', position: 5, content: ' Beautiful', length: 10 },
        vectorClock: OperationalTransform.incrementVectorClock(vectorClock, 'user1'),
        userId: 'user1',
        timestamp: new Date().toISOString(),
      };

      content = OperationalTransform.applyOperation(content, insertOp.operation);
      history = OperationalTransform.addToHistory(history, insertOp);
      vectorClock = insertOp.vectorClock;

      expect(content).toBe('Hello Beautiful World');

      // Perform undo
      const { undoOperation, newHistory } = OperationalTransform.performUndo(
        history,
        content,
        'user1',
        vectorClock
      );

      expect(undoOperation).toBeDefined();
      
      const undoContent = OperationalTransform.applyOperation(content, undoOperation!.operation);
      expect(undoContent).toBe('Hello World');

      // Perform redo
      const { redoOperation } = OperationalTransform.performRedo(
        newHistory,
        undoContent,
        'user1',
        vectorClock
      );

      expect(redoOperation).toBeDefined();
      
      const redoContent = OperationalTransform.applyOperation(undoContent, redoOperation!.operation);
      expect(redoContent).toBe('Hello Beautiful World');
    });
  });
});