import { describe, it, expect } from 'vitest';

describe('Layout Component Index', () => {
  it('exports Layout component as default', async () => {
    const layoutModule = await import('./index');
    expect(layoutModule.default).toBeDefined();
    expect(typeof layoutModule.default).toBe('function');
  });
});