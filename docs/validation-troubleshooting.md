---
layout: default
lang: en
title: ChordPro Validation Troubleshooting Guide
---

# ChordPro Validation Troubleshooting Guide

This guide helps you diagnose and fix common issues with ChordMe's ChordPro validation system.

## Quick Diagnosis

### Is Validation Working?

**Check these indicators:**
- ✅ Status bar shows validation counts or "No validation issues"
- ✅ Error highlighting appears when you type invalid content
- ✅ Hover tooltips show error descriptions
- ❌ No visual feedback when typing errors

If validation isn't working, see [Validation Not Responding](#validation-not-responding).

### Common Error Patterns

#### Red Errors (Critical Issues)

**Invalid Chord Notation:**
```
[X] [123] [lowercase] [H]
```
**Fix:** Use standard chord notation (A-G uppercase)

**Security Issues:**
```
<script>alert('test')</script>
```
**Fix:** Remove script tags and dangerous HTML

**Malformed Directives:**
```
{incomplete {empty: }
```
**Fix:** Ensure proper `{directive: value}` format

#### Yellow Warnings (Recommendations)

**Unknown Directives:**
```
{custom_directive: value}
```
**Fix:** Use standard ChordPro directives or disable strict mode

**Bracket Mismatches:**
```
[C [G] {title: test
```
**Fix:** Balance all opening and closing brackets

**Common Typos:**
```
{titel: Song} {artis: Name}
```
**Fix:** Check spelling (`title`, `artist`)

## Detailed Troubleshooting

### Validation Not Responding

#### Symptoms
- No error highlighting appears
- Status bar doesn't update
- No tooltips on invalid content

#### Possible Causes & Solutions

**1. Validation Disabled**
- **Check:** Status bar for validation toggle
- **Fix:** Click validation toggle to enable
- **Location:** Bottom of editor, validation status bar

**2. JavaScript Errors**
- **Check:** Browser developer console (F12)
- **Fix:** Refresh page, clear cache, update browser
- **Look for:** Red error messages mentioning validation

**3. Browser Compatibility**
- **Check:** Browser version and JavaScript support
- **Fix:** Update to modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- **Alternative:** Try different browser

**4. Performance Issues**
- **Check:** Document size and complexity
- **Fix:** Try with smaller document first
- **Solution:** Switch to "Minimal" validation mode

### False Error Reports

#### Symptoms
- Valid ChordPro content shows errors
- Correct chords marked as invalid
- Known directives flagged as unknown

#### Solutions

**1. Check Validation Level**
```
Settings → Validation → Mode: Relaxed
```
- Strict mode is very restrictive
- Relaxed mode allows more flexibility

**2. Language Mismatch**
```
Spanish content with English validation:
[Do] [Re] [Mi] ← May show as errors
```
- **Fix:** Change language to Spanish
- **Location:** Language selector or validation settings

**3. Custom Directives**
```
{verse1} {custom_section}
```
- **Fix:** Disable strict mode for custom directives
- **Alternative:** Add custom rules in settings

### Performance Problems

#### Symptoms
- Slow typing response
- Delayed error highlighting
- Browser freezing during validation

#### Solutions

**1. Reduce Validation Scope**
```
Settings → Validation → Checks:
☑ Chord syntax (keep)
☑ Security (keep)  
☐ Typo detection (disable)
☐ Empty elements (disable)
```

**2. Switch Validation Mode**
```
Strict Mode → Relaxed Mode → Minimal Mode
```
- Each level reduces processing requirements

**3. Document Optimization**
```
Large document (5000+ lines)
↓
Split into smaller files (500-1000 lines each)
```

**4. Browser Performance**
- Close other tabs using memory
- Clear browser cache and restart
- Check available system memory

### Language-Specific Issues

#### Spanish Chord Notation Problems

**Issue:** Spanish chords show as errors
```
[Do] [Re] [Mi] ← Red underlines
```

**Solutions:**
1. **Change Language:**
   ```
   Language Selector → Español
   ```

2. **Manual Language Setting:**
   ```
   Validation Settings → Language → Spanish
   ```

3. **Check Auto-Detection:**
   ```
   Settings → Auto-detect language: ☑ Enabled
   ```

#### Translation Problems

**Issue:** Error messages in wrong language

**Solutions:**
1. **Browser Language:**
   ```
   Browser Settings → Language → Set to desired language
   ```

2. **ChordMe Language:**
   ```
   Top Navigation → Language Selector
   ```

3. **Cache Issues:**
   ```
   Clear browser cache → Reload page
   ```

### Security Validation Issues

#### Legitimate Content Flagged

**Issue:** Valid HTML or text flagged as security risk
```
Song about <heart> gets flagged
```

**Solutions:**
1. **Escape Special Characters:**
   ```
   <heart> → &lt;heart&gt;
   ```

2. **Disable Security Checking:**
   ```
   Settings → Security Check: ☐ Disabled
   ```
   ⚠️ **Warning:** Only do this for trusted content

3. **Use Alternative Notation:**
   ```
   <heart> → (heart)
   [script] → [chord-script]
   ```

### Advanced Debugging

#### Enable Debug Mode

**For Development/Testing:**
```javascript
// Open browser console (F12)
localStorage.setItem('chordme-debug', 'true');
location.reload();
```

**Debug Information Includes:**
- Validation timing data
- Detailed error logs
- Performance metrics
- Language detection info

#### Manual Testing

**Test Basic Functionality:**
```
1. Type: [C] {title: Test}
   Expected: No errors

2. Type: [X] {unknown}
   Expected: 2 errors highlighted

3. Hover over errors
   Expected: Tooltip with description
```

**Test Language Features:**
```
1. Change language to Spanish
2. Type: [Do] [Re] [Mi]
   Expected: No errors (auto-converted)

3. Type: {titulo: Test}
   Expected: No errors (recognized alias)
```

### Common Fixes Summary

| Problem | Quick Fix | Settings Location |
|---------|-----------|-------------------|
| No validation | Enable validation toggle | Status bar |
| Too many warnings | Switch to Relaxed mode | Settings → Mode |
| Spanish chords errors | Change language to Spanish | Language selector |
| Performance slow | Disable typo detection | Settings → Checks |
| Custom directives errors | Disable strict mode | Settings → Strict Mode |
| Security false positives | Disable security check | Settings → Security |

### Getting Additional Help

#### Before Contacting Support

**Gather This Information:**
1. Browser name and version
2. Document content (if shareable)
3. Validation settings configuration
4. Console error messages (if any)
5. Steps to reproduce the issue

#### Report Issues

**GitHub Repository:**
- Open issue with detailed description
- Include browser/system information
- Attach screenshots if helpful

**Community Forum:**
- Search for similar issues first
- Provide context and examples
- Help others with similar problems

#### Emergency Workarounds

**If validation completely broken:**
1. Disable all validation: Settings → Toggle off
2. Use external ChordPro validator temporarily
3. Work in plain text mode until fixed
4. Save work frequently as backup

**If browser incompatible:**
1. Try different browser (Chrome, Firefox, Safari)
2. Use mobile version if available
3. Download content for offline editing
4. Contact support for compatibility info

---

**Related Documentation:**
- [User Guide - ChordPro Validation](user-guide.md#chordpro-validation)
- [ChordPro Format Reference](chordpro-format.md)
- [Validation Rules Reference](validation-rules-reference.md)

**Language:** **English** | [Español](validation-troubleshooting-es.md)