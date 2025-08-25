import { describe, it, expect } from 'vitest';

describe('Header Component Index', () => {
  it('exports Header component as default', async () => {
    const headerModule = await import('./index');
    expect(headerModule.default).toBeDefined();
    expect(typeof headerModule.default).toBe('function');
  });
});
