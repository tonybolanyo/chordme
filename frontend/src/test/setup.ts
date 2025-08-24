import '@testing-library/jest-dom';

// Extend global interface for test environment
declare global {
  var fetch: typeof globalThis.fetch;
}
