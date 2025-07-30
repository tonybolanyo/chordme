import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Layout from './Layout';

// Mock the Header component to avoid AuthContext dependency
vi.mock('../Header', () => ({
  default: () => <header data-testid="header">Header</header>
}));

describe('Layout', () => {
  it('renders children content', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders header', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );

    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('renders footer with correct text', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );

    expect(screen.getByText(/© 2024 ChordMe/)).toBeInTheDocument();
  });

  it('has correct layout structure', () => {
    render(
      <Layout>
        <div>Test content</div>
      </Layout>
    );

    const layout = screen.getByText('Test content').closest('.layout');
    expect(layout).toBeInTheDocument();
    
    const mainContent = screen.getByText('Test content').closest('.main-content');
    expect(mainContent).toBeInTheDocument();
  });
});