# Keyboard Shortcuts Documentation

## Transposition Shortcuts

The TranspositionControls component supports comprehensive keyboard shortcuts for efficient transposition operations.

### Transposition Operations

| Shortcut | Action | Description |
|----------|--------|-------------|
| `Ctrl+↑` | Transpose Up | Increase pitch by one semitone |
| `Ctrl+↓` | Transpose Down | Decrease pitch by one semitone |
| `Ctrl++` | Transpose Up | Alternative shortcut for transpose up |
| `Ctrl+=` | Transpose Up | Alternative shortcut for transpose up |
| `Ctrl+-` | Transpose Down | Alternative shortcut for transpose down |
| `Ctrl+0` | Reset | Reset to original key/transposition |

### Mac Support

All shortcuts work with `Cmd` key on macOS:

| Shortcut | Action |
|----------|--------|
| `Cmd+↑` | Transpose Up |
| `Cmd+↓` | Transpose Down |
| `Cmd++` | Transpose Up |
| `Cmd+-` | Transpose Down |
| `Cmd+0` | Reset |

## Implementation Details

### Event Handling

Keyboard shortcuts are implemented using global event listeners when the TranspositionControls component is mounted with `enableAdvancedFeatures={true}`.

### Code Example

```tsx
// Keyboard event handler
const handleKeyDown = useCallback((event: KeyboardEvent) => {
  if (disabled) return;
  
  // Handle keyboard shortcuts
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        onTranspose(1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        onTranspose(-1);
        break;
      case '=':
      case '+':
        event.preventDefault();
        onTranspose(1);
        break;
      case '-':
        event.preventDefault();
        onTranspose(-1);
        break;
      case '0':
        event.preventDefault();
        if (onReset) onReset();
        break;
    }
  }
}, [disabled, onTranspose, onReset]);
```

### Accessibility

- All shortcuts are properly documented in tooltips
- Screen readers announce shortcut availability
- Focus management ensures shortcuts work regardless of focus location
- No conflicts with browser or OS shortcuts

### Best Practices

1. **Enable Advanced Features**: Set `enableAdvancedFeatures={true}` to activate shortcuts
2. **Document Shortcuts**: The component shows available shortcuts in the UI
3. **Handle Disabled State**: Shortcuts are automatically disabled when the component is disabled
4. **Cross-Platform**: Use both Ctrl and Cmd for maximum compatibility

### Customization

You can customize the keyboard shortcuts by modifying the key handlers:

```tsx
// Custom shortcuts example
const customHandleKeyDown = (event: KeyboardEvent) => {
  if (event.altKey && event.key === 'ArrowUp') {
    // Custom transpose up with Alt+↑
    onTranspose(1);
  }
  // ... other custom shortcuts
};
```

## Integration with Other Components

### ChordPro Editor

When used with ChordPro editors, shortcuts work globally and don't interfere with text editing:

```tsx
<div>
  <TranspositionControls 
    onTranspose={handleTranspose}
    enableAdvancedFeatures={true}
  />
  <textarea 
    value={content} 
    onChange={setContent}
    onKeyDown={(e) => {
      // Editor-specific shortcuts can coexist
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    }}
  />
</div>
```

### Conflict Prevention

The implementation prevents conflicts by:
- Using specific modifier combinations (Ctrl/Cmd + key)
- Calling `preventDefault()` to stop event propagation
- Only activating when the component is enabled
- Checking for disabled state before processing

## Testing

Keyboard shortcuts are thoroughly tested:

```tsx
// Test example
it('transposes up with Ctrl+ArrowUp', () => {
  const onTranspose = vi.fn();
  render(<TranspositionControls onTranspose={onTranspose} enableAdvancedFeatures={true} />);

  fireEvent.keyDown(document, { key: 'ArrowUp', ctrlKey: true });

  expect(onTranspose).toHaveBeenCalledWith(1);
});
```

## Browser Support

- Works in all modern browsers
- No special polyfills required
- Consistent behavior across platforms
- Respects system accessibility settings

## Troubleshooting

### Shortcuts Not Working

1. Check that `enableAdvancedFeatures={true}`
2. Ensure the component is not disabled
3. Verify there are no JavaScript errors
4. Check for other components intercepting keyboard events

### Platform Differences

- Windows/Linux: Use Ctrl key
- macOS: Use Cmd key  
- Both are supported automatically

### Accessibility Considerations

- Shortcuts are announced in tooltips
- Work with screen readers
- Don't interfere with browser accessibility shortcuts
- Can be disabled if needed for accessibility compliance