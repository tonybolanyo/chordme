# Performance Mode - Full-Screen Interface Documentation

## Overview

The Performance Mode is a specialized full-screen interface designed for live presentations, stage performances, and practice sessions. It provides maximum visibility with large typography, high-contrast themes, and distraction-free design optimized for distance viewing.

## Features

### 🎯 Full-Screen Experience
- **Immersive interface** that takes over the entire screen
- **Auto-hiding controls** that appear on mouse movement
- **Keyboard-only operation** for hands-free performance
- **Cross-browser fullscreen support** with fallback handling

### 🎨 Multiple Themes for Different Environments

#### Practice Theme (Default)
- **Standard contrast** suitable for rehearsal rooms
- **Comfortable colors** for extended practice sessions
- **Balanced brightness** for indoor lighting

#### Stage Bright Theme
- **High visibility** optimized for bright stage lighting
- **Enhanced contrast** to cut through stage lights
- **Green accent colors** for better visibility under hot lights

#### Stage Dark Theme  
- **Dark background** optimized for low-light venues
- **Bright text and chords** for excellent readability
- **Amber highlights** that work well in dark environments

#### High Contrast Theme
- **Maximum accessibility** with stark black and white contrast
- **WCAG AAA compliance** for vision accessibility
- **Bold typography** with enhanced borders

### 📝 Enhanced Typography
- **Scalable font sizes** from 12px to 48px
- **Large chord markers** with enhanced visibility
- **Increased line spacing** for better readability at distance
- **Bold text weights** for stage lighting conditions

### ⌨️ Comprehensive Keyboard Shortcuts

#### Essential Controls
- **F11**: Toggle fullscreen mode
- **Esc**: Exit performance mode
- **H**: Show/hide controls

#### Theme Switching
- **F1**: Practice theme
- **F2**: Stage bright theme  
- **F3**: Stage dark theme
- **F4**: High contrast theme

#### Font Size Control
- **Ctrl +**: Increase font size
- **Ctrl -**: Decrease font size
- **Ctrl 0**: Reset to default size

#### Chord Transposition
- **Ctrl ↑**: Transpose up one semitone
- **Ctrl ↓**: Transpose down one semitone
- **Ctrl 0**: Reset transposition

### 🎵 Performance-Optimized Features

#### Enhanced Chord Display
- **Larger chord markers** with improved contrast
- **Current chord highlighting** with subtle glow animation
- **Hover effects** for interactive feedback
- **Click-to-jump** functionality for quick navigation

#### Song Structure Visualization
- **Directive highlighting** (verse, chorus, bridge markers)
- **Visual hierarchy** with clear section divisions
- **Position tracking** integration with audio sync

#### Distraction-Free Design
- **Hidden navigation** and unnecessary UI elements
- **Minimalist controls** that fade when not needed
- **Clean typography** without visual clutter
- **Optimal spacing** for stage visibility

## Usage Instructions

### Getting Started
1. Navigate to any song with ChordPro content
2. Click "Performance Mode" or press **F11**
3. Choose your preferred theme based on lighting conditions
4. Adjust font size for optimal visibility
5. Use keyboard shortcuts for hands-free operation

### Best Practices for Live Performance

#### Before Going On Stage
1. **Test visibility** from your performance position
2. **Set appropriate theme** for venue lighting
3. **Adjust font size** for your typical viewing distance
4. **Practice keyboard shortcuts** for quick adjustments

#### During Performance
1. **Use auto-hide** - move mouse to show controls, stay still to hide
2. **Theme switching** - press F1-F4 if lighting changes
3. **Font adjustment** - use Ctrl +/- if needed
4. **Quick exit** - press Esc to return to normal mode

#### For Different Venues
- **Bright venues**: Use Stage Bright theme
- **Dark/intimate venues**: Use Stage Dark theme  
- **Accessibility needs**: Use High Contrast theme
- **Practice/rehearsal**: Use Practice theme

### Multi-Monitor Setup

The Performance Mode is designed to work with multiple monitors:

1. **Primary display**: Full performance interface
2. **Secondary display**: Can show controls or other information
3. **Projection setup**: Performance Mode scales well for projectors
4. **Extended desktop**: Drag performance window to desired screen before going fullscreen

## Accessibility Features

### Visual Accessibility
- **High contrast ratios** meeting WCAG 2.1 AA standards
- **Scalable typography** up to 48px
- **Color blind friendly** theme options
- **Reduced motion support** for vestibular disorders

### Motor Accessibility  
- **Complete keyboard navigation** without mouse dependency
- **Large touch targets** for touch screen devices
- **Sticky modifier keys** support
- **Voice control compatibility**

### Cognitive Accessibility
- **Simple, predictable controls** 
- **Clear visual hierarchy**
- **Consistent keyboard shortcuts**
- **Help overlay** always available

## Technical Requirements

### Browser Support
- **Chrome/Chromium** 71+ (recommended)
- **Firefox** 64+
- **Safari** 12+
- **Edge** 79+

### System Requirements
- **Screen resolution**: 1024x768 minimum, 1920x1080+ recommended
- **RAM**: 4GB minimum for smooth operation
- **Internet**: Not required once page is loaded

### Known Limitations
- **iOS Safari**: Limited fullscreen API support
- **Some TVs**: May not support fullscreen API
- **Older browsers**: Graceful degradation to windowed mode

## Troubleshooting

### Fullscreen Not Working
1. Check browser fullscreen permissions
2. Try F11 key instead of button
3. Update browser to latest version
4. Some browsers require user gesture first

### Text Too Small/Large
1. Use Ctrl +/- to adjust font size
2. Check zoom level in browser (should be 100%)
3. Adjust distance from screen
4. Consider different theme for better contrast

### Controls Not Hiding
1. Stop moving mouse for 5 seconds
2. Press H to manually toggle
3. Check if in fullscreen mode
4. Restart performance mode if needed

### Poor Visibility
1. Try different theme (F1-F4)
2. Increase font size (Ctrl +)
3. Check ambient lighting conditions
4. Adjust screen brightness if possible

## Integration with Other Features

### Audio Synchronization
- **Chord highlighting** works with audio playback
- **Position tracking** shows current position in song
- **Auto-scroll** keeps current chord visible

### Transposition
- **Real-time chord updates** during performance
- **Key signature changes** reflected immediately  
- **Preserve settings** between sessions

### Collaboration
- **Multi-user support** with presence indicators
- **Real-time updates** from other users
- **Shared performance settings**

## Development Notes

The Performance Mode is built with:
- **React TypeScript** for type safety
- **CSS Custom Properties** for dynamic theming
- **Fullscreen API** with cross-browser polyfills
- **Event-driven architecture** for responsive controls
- **Accessibility-first design** following WCAG guidelines

### Extension Points
- **Custom themes** can be added via CSS variables
- **Additional keyboard shortcuts** via event system
- **Plugin architecture** for venue-specific features
- **API integration** for lighting control systems

---

*For technical support or feature requests, please refer to the ChordMe documentation or open an issue on GitHub.*