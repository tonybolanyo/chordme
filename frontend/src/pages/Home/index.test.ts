import { describe, it, expect } from 'vitest';

describe('Home Page Index', () => {
  it('exports Home component as default', async () => {
    const module = await import('./index');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});