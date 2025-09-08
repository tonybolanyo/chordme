import '@testing-library/jest-dom';
import '../i18n/config'; // Initialize i18n for tests

// Extend global interface for test environment
declare global {
  var fetch: typeof globalThis.fetch;
}
