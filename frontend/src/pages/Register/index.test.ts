import { describe, it, expect } from 'vitest';

describe('Register Page Index', () => {
  it('exports Register component as default', async () => {
    const module = await import('./index');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});