import { describe, it, expect } from 'vitest';

describe('GoogleAuth Component Index', () => {
  it('exports GoogleAuth components', async () => {
    const module = await import('./index');
    expect(module.GoogleAuthButton).toBeDefined();
    expect(module.GoogleDriveFileList).toBeDefined();
    expect(typeof module.GoogleAuthButton).toBe('function');
    expect(typeof module.GoogleDriveFileList).toBe('function');
  });
});