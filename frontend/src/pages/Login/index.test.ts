import { describe, it, expect } from 'vitest';

describe('Login Page Index', () => {
  it('exports Login component as default', async () => {
    const module = await import('./index');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});