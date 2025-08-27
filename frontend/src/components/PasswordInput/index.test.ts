import { describe, it, expect } from 'vitest';
import PasswordInput from './index';

describe('PasswordInput Component Index', () => {
  it('exports PasswordInput component as default', () => {
    expect(PasswordInput).toBeDefined();
    expect(typeof PasswordInput).toBe('function');
  });
});