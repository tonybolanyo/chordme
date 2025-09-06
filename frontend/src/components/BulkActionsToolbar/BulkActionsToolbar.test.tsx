import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BulkActionsToolbar from './BulkActionsToolbar';
import { BulkActionContext, BulkOperation } from '../../types';

describe('BulkActionsToolbar', () => {
  const mockOnBulkAction = vi.fn();
  const mockOnSelectAll = vi.fn();
  const mockOnClearSelection = vi.fn();

  const mockContext: BulkActionContext = {
    selectedIds: ['1', '2', '3'],
    totalSelected: 3,
    availableOperations: ['export', 'addToPlaylist', 'share', 'delete']
  };

  beforeEach(() => {
    mockOnBulkAction.mockClear();
    mockOnSelectAll.mockClear();
    mockOnClearSelection.mockClear();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <BulkActionsToolbar
        context={mockContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={false}
        totalResults={10}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no items selected', () => {
    const emptyContext = { ...mockContext, totalSelected: 0, selectedIds: [] };
    
    const { container } = render(
      <BulkActionsToolbar
        context={emptyContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('displays selection count', () => {
    render(
      <BulkActionsToolbar
        context={mockContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    expect(screen.getByText('3 of 10 selected')).toBeInTheDocument();
  });

  it('renders available bulk action buttons', () => {
    render(
      <BulkActionsToolbar
        context={mockContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Add to Playlist')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onBulkAction when action button clicked', () => {
    render(
      <BulkActionsToolbar
        context={mockContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    const exportButton = screen.getByRole('button', { name: /Export 3 selected items/ });
    fireEvent.click(exportButton);

    expect(mockOnBulkAction).toHaveBeenCalledWith('export');
  });

  it('shows Select All when not all selected', () => {
    render(
      <BulkActionsToolbar
        context={mockContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    const selectAllButton = screen.getByRole('button', { name: 'Select all' });
    expect(selectAllButton).toHaveTextContent('Select All');
  });

  it('shows Deselect All when all selected', () => {
    const allSelectedContext = { ...mockContext, totalSelected: 10 };
    
    render(
      <BulkActionsToolbar
        context={allSelectedContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    const deselectAllButton = screen.getByRole('button', { name: 'Deselect all' });
    expect(deselectAllButton).toHaveTextContent('Deselect All');
  });

  it('calls onSelectAll with correct value', () => {
    render(
      <BulkActionsToolbar
        context={mockContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    const selectAllButton = screen.getByRole('button', { name: 'Select all' });
    fireEvent.click(selectAllButton);

    expect(mockOnSelectAll).toHaveBeenCalledWith(true);
  });

  it('calls onClearSelection when clear button clicked', () => {
    render(
      <BulkActionsToolbar
        context={mockContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    const clearButton = screen.getByRole('button', { name: 'Clear selection' });
    fireEvent.click(clearButton);

    expect(mockOnClearSelection).toHaveBeenCalled();
  });

  it('filters actions based on available operations', () => {
    const limitedContext = {
      ...mockContext,
      availableOperations: ['export', 'share'] as BulkOperation[]
    };

    render(
      <BulkActionsToolbar
        context={limitedContext}
        onBulkAction={mockOnBulkAction}
        onSelectAll={mockOnSelectAll}
        onClearSelection={mockOnClearSelection}
        isVisible={true}
        totalResults={10}
      />
    );

    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
    expect(screen.queryByText('Add to Playlist')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });
});