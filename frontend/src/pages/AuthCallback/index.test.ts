import { describe, it, expect } from 'vitest';

describe('AuthCallback Page Index', () => {
  it('exports AuthCallback component as default', async () => {
    const module = await import('./index');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });
});