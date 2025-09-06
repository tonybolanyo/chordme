// Comprehensive tests for operational transformation algorithms
import { describe, it, expect } from 'vitest';
import { OperationalTransform } from '../services/operationalTransform';
import type { TextOperation, EditOperation } from '../types/collaboration';

describe('OperationalTransform', () => {
  describe('Basic Operation Application', () => {
    it('should apply insert operations correctly', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'insert',
        position: 5,
        content: ' Beautiful',
        length: 10,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello Beautiful World');
    });

    it('should apply delete operations correctly', () => {
      const content = 'Hello Beautiful World';
      const operation: TextOperation = {
        type: 'delete',
        position: 5,
        length: 10,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello World');
    });

    it('should apply retain operations correctly', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'retain',
        length: 11,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello World');
    });

    it('should handle insert at beginning of document', () => {
      const content = 'World';
      const operation: TextOperation = {
        type: 'insert',
        position: 0,
        content: 'Hello ',
        length: 6,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello World');
    });

    it('should handle insert at end of document', () => {
      const content = 'Hello';
      const operation: TextOperation = {
        type: 'insert',
        position: 5,
        content: ' World',
        length: 6,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello World');
    });

    it('should handle delete at beginning of document', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'delete',
        position: 0,
        length: 6,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('World');
    });

    it('should handle delete at end of document', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'delete',
        position: 5,
        length: 6,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello');
    });
  });

  describe('Concurrent Operation Transformation', () => {
    it('should transform concurrent insert operations', () => {
      const op1: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'A',
        length: 1,
      };

      const op2: TextOperation = {
        type: 'insert',
        position: 7,
        content: 'B',
        length: 1,
      };

      const transformed = OperationalTransform.transform(op1, op2);
      expect(transformed.position).toBe(8); // Adjusted for op1's insertion
    });

    it('should transform insert vs delete operations', () => {
      const insertOp: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'Hello',
        length: 5,
      };

      const deleteOp: TextOperation = {
        type: 'delete',
        position: 7,
        length: 3,
      };

      const transformed = OperationalTransform.transform(insertOp, deleteOp);
      expect(transformed.position).toBe(12); // Adjusted for insert
    });

    it('should handle overlapping delete operations', () => {
      const op1: TextOperation = {
        type: 'delete',
        position: 5,
        length: 5,
      };

      const op2: TextOperation = {
        type: 'delete',
        position: 7,
        length: 3,
      };

      const transformed = OperationalTransform.transform(op1, op2);
      // Should handle overlap gracefully
      expect(transformed).toBeDefined();
    });

    it('should preserve operation order independence', () => {
      const content = 'Hello World';

      const op1: TextOperation = {
        type: 'insert',
        position: 5,
        content: ' Beautiful',
        length: 10,
      };

      const op2: TextOperation = {
        type: 'insert',
        position: 0,
        content: 'Amazing ',
        length: 8,
      };

      // Apply op1 then transformed op2
      const result1 = OperationalTransform.applyOperation(content, op1);
      const transformedOp2 = OperationalTransform.transform(op1, op2);
      const finalResult1 = OperationalTransform.applyOperation(
        result1,
        transformedOp2
      );

      // Apply op2 then transformed op1
      const result2 = OperationalTransform.applyOperation(content, op2);
      const transformedOp1 = OperationalTransform.transform(op2, op1);
      const finalResult2 = OperationalTransform.applyOperation(
        result2,
        transformedOp1
      );

      expect(finalResult1).toBe(finalResult2);
    });
  });

  describe('Complex Transformation Scenarios', () => {
    it('should handle multiple sequential insertions', () => {
      const content = 'Hello World';

      // Apply operations sequentially with adjusted positions
      const operations: TextOperation[] = [
        { type: 'insert', position: 5, content: ' Beautiful', length: 10 }, // "Hello Beautiful World"
        { type: 'insert', position: 0, content: 'Amazing ', length: 8 },     // "Amazing Hello Beautiful World" 
        { type: 'insert', position: content.length + 18 + 8, content: '!', length: 1 }, // At end
      ];

      const result = OperationalTransform.applyOperations(content, operations);
      expect(result).toContain('Amazing');
      expect(result).toContain('Hello');
      expect(result).toContain('Beautiful');
      expect(result).toContain('World');
      expect(result).toContain('!');
      expect(result).toBe('Amazing Hello Beautiful World!');
    });

    it('should handle mixed insert and delete operations', () => {
      const content = 'Hello Beautiful World';

      const operations: TextOperation[] = [
        { type: 'delete', position: 6, length: 9 }, // Remove "Beautiful"
        { type: 'insert', position: 6, content: 'Amazing', length: 7 },
      ];

      const result = OperationalTransform.applyOperations(content, operations);
      expect(result).toBe('Hello Amazing World');
    });

    it('should handle operations at same position', () => {
      const content = 'Hello World';

      const op1: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'A',
        length: 1,
      };

      const op2: TextOperation = {
        type: 'insert',
        position: 5,
        content: 'B',
        length: 1,
      };

      const transformed = OperationalTransform.transform(op1, op2);
      expect(transformed.position).toBe(6); // B should come after A
    });

    it('should handle retain operations in sequences', () => {
      const content = 'Hello World';

      const operations: TextOperation[] = [
        { type: 'retain', length: 5 },
        { type: 'insert', position: 5, content: ' Beautiful', length: 10 },
        { type: 'retain', length: 6 },
      ];

      const result = OperationalTransform.applyOperations(content, operations);
      expect(result).toBe('Hello Beautiful World');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle operations on empty content', () => {
      const content = '';
      const operation: TextOperation = {
        type: 'insert',
        position: 0,
        content: 'Hello',
        length: 5,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello');
    });

    it('should handle delete operations beyond content length', () => {
      const content = 'Hello';
      const operation: TextOperation = {
        type: 'delete',
        position: 3,
        length: 10, // More than remaining content
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hel');
    });

    it('should handle insert at invalid position gracefully', () => {
      const content = 'Hello';
      const operation: TextOperation = {
        type: 'insert',
        position: 10, // Beyond content length
        content: ' World',
        length: 6,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello World'); // Should append
    });

    it('should handle operations with missing content', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'insert',
        position: 5,
        length: 0,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Hello World'); // No change
    });

    it('should handle negative positions gracefully', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'insert',
        position: -1,
        content: 'Test ',
        length: 5,
      };

      const result = OperationalTransform.applyOperation(content, operation);
      expect(result).toBe('Test Hello World'); // Should prepend
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large documents efficiently', () => {
      const largeContent = 'A'.repeat(10000);
      const operation: TextOperation = {
        type: 'insert',
        position: 5000,
        content: 'INSERTED',
        length: 8,
      };

      const startTime = performance.now();
      const result = OperationalTransform.applyOperation(
        largeContent,
        operation
      );
      const endTime = performance.now();

      expect(result).toContain('INSERTED');
      expect(endTime - startTime).toBeLessThan(10); // Should complete in less than 10ms
    });

    it('should handle many small operations efficiently', () => {
      let content = 'Hello World';
      const operations: TextOperation[] = [];

      // Create 100 small insert operations
      for (let i = 0; i < 100; i++) {
        operations.push({
          type: 'insert',
          position: Math.floor(content.length / 2),
          content: `${i}`,
          length: i.toString().length,
        });
      }

      const startTime = performance.now();
      const result = OperationalTransform.applyOperations(content, operations);
      const endTime = performance.now();

      expect(result.length).toBeGreaterThan(content.length);
      expect(endTime - startTime).toBeLessThan(50); // Should complete in less than 50ms
    });

    it('should optimize retain operations', () => {
      const content = 'Hello World';
      const operation: TextOperation = {
        type: 'retain',
        length: content.length,
      };

      const startTime = performance.now();
      const result = OperationalTransform.applyOperation(content, operation);
      const endTime = performance.now();

      expect(result).toBe(content);
      expect(endTime - startTime).toBeLessThan(1); // Should be nearly instantaneous
    });
  });

  describe('Conflict Resolution', () => {
    it('should generate conflict markers for unresolvable conflicts', () => {
      const localContent = 'Hello Local World';
      const remoteContent = 'Hello Remote World';

      const conflict = OperationalTransform.generateConflictMarkers(
        localContent,
        remoteContent,
        'user1',
        'user2'
      );

      expect(conflict).toContain('<<<<<<< user1');
      expect(conflict).toContain('=======');
      expect(conflict).toContain('>>>>>>> user2');
      expect(conflict).toContain('Hello Local World');
      expect(conflict).toContain('Hello Remote World');
    });

    it('should resolve simple auto-mergeable conflicts', () => {
      const op1: TextOperation = {
        type: 'insert',
        position: 0,
        content: 'A',
        length: 1,
      };

      const op2: TextOperation = {
        type: 'insert',
        position: 10,
        content: 'B',
        length: 1,
      };

      const canAutoMerge = OperationalTransform.canAutoMerge([op1], [op2]);
      expect(canAutoMerge).toBe(true);
    });

    it('should detect conflicting operations that cannot auto-merge', () => {
      const op1: TextOperation = {
        type: 'delete',
        position: 5,
        length: 5,
      };

      const op2: TextOperation = {
        type: 'insert',
        position: 7,
        content: 'conflict',
        length: 8,
      };

      const canAutoMerge = OperationalTransform.canAutoMerge([op1], [op2]);
      expect(canAutoMerge).toBe(false);
    });
  });

  describe('Document State Consistency', () => {
    it('should maintain document integrity across complex operations', () => {
      const initialContent = 'The quick brown fox jumps over the lazy dog';

      const operations: TextOperation[] = [
        { type: 'insert', position: 0, content: 'Today, ', length: 7 },  // "Today, The quick brown fox..."
        { type: 'delete', position: 17, length: 5 }, // Remove 'brown' (now at position 17 after "Today, The quick ")
        { type: 'insert', position: 17, content: 'red', length: 3 },   // Insert 'red' at same position
        { type: 'insert', position: initialContent.length + 7 - 5 + 3, content: '.', length: 1 }, // At end
      ];

      const result = OperationalTransform.applyOperations(
        initialContent,
        operations
      );

      expect(result).toContain('Today,');
      expect(result).toContain('red fox');
      expect(result).not.toContain('brown');
      expect(result.endsWith('.')).toBe(true);
    });

    it('should validate operation sequences for consistency', () => {
      const operations: TextOperation[] = [
        { type: 'insert', position: 0, content: 'Hello', length: 5 },
        { type: 'delete', position: 10, length: 2 }, // Invalid: position beyond content
      ];

      const isValid = OperationalTransform.validateOperationSequence(
        operations,
        ''
      );
      expect(isValid).toBe(false);
    });

    it('should track document version through operations', () => {
      const initialVersion = 1;
      const operations: TextOperation[] = [
        { type: 'insert', position: 0, content: 'A', length: 1 },
        { type: 'insert', position: 1, content: 'B', length: 1 },
      ];

      const newVersion = OperationalTransform.computeVersionAfterOperations(
        initialVersion,
        operations
      );

      expect(newVersion).toBe(3); // Initial + 2 operations
    });
  });
});
