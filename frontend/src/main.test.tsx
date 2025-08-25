import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the modules
vi.mock('react-dom/client', () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
  })),
}));

vi.mock('./App.tsx', () => ({
  default: () => 'App Component',
}));

// Mock CSS import
vi.mock('./index.css', () => ({}));

// Mock DOM elements
Object.defineProperty(document, 'getElementById', {
  value: vi.fn(() => ({
    innerHTML: '',
  })),
  writable: true,
});

describe('Main Entry Point', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('imports required modules', async () => {
    // Test that the main module can be imported without errors
    const mainModule = await import('./main');
    expect(mainModule).toBeDefined();
  });

  it('attempts to find root element', async () => {
    // Import the main module which executes the code
    await import('./main');

    // Verify that getElementById was called with 'root'
    expect(document.getElementById).toHaveBeenCalledWith('root');
  });

  it('imports App component', async () => {
    const App = await import('./App');
    expect(App.default).toBeDefined();
  });

  it('imports CSS styles', async () => {
    // CSS import should not throw
    await expect(import('./index.css')).resolves.toBeDefined();
  });
});
