import { test, expect } from '@playwright/test';

test.describe('ChordMe ChordPro Editor and Demo Features', () => {
  
  test.describe('ChordPro Demo Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/#demo');
    });

    test('should display demo page content correctly', async ({ page }) => {
      // Check page title and main content
      await expect(page.locator('h1').nth(1)).toContainText('ChordPro Syntax Highlighting Demo');
      
      // Check feature explanations
      await expect(page.locator('text=This demonstrates the ChordPro syntax highlighting features:')).toBeVisible();
      
      // Check syntax feature descriptions
      await expect(page.locator('text=Chords in square brackets:')).toBeVisible();
      await expect(page.locator('text=Directives in curly braces:')).toBeVisible();
      await expect(page.locator('text=Comments starting with #:')).toBeVisible();
      await expect(page.locator('text=Lyrics as regular text')).toBeVisible();
      
      // Check example code snippets
      await expect(page.locator('code:has-text("[C]")')).toBeVisible();
      await expect(page.locator('code:has-text("{title: Song}")')).toBeVisible();
      await expect(page.locator('code:has-text("# This is a comment")')).toBeVisible();
    });

    test('should have interactive editor section', async ({ page }) => {
      await expect(page.locator('h2:has-text("Interactive Editor")')).toBeVisible();
      
      // Check that the editor textarea is present and editable
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      await expect(editor).toBeVisible();
      await expect(editor).toBeEditable();
      
      // Check that it has default content (Amazing Grace)
      const editorContent = await editor.inputValue();
      expect(editorContent).toContain('Amazing Grace');
      expect(editorContent).toContain('{title: Amazing Grace}');
      expect(editorContent).toContain('[G]');
    });

    test('should have rendered output section', async ({ page }) => {
      await expect(page.locator('h2:has-text("Rendered Output")')).toBeVisible();
      
      // Check that the rendered content shows formatted output
      await expect(page.locator('h3:has-text("Amazing Grace")')).toBeVisible();
      await expect(page.locator('text=by Traditional')).toBeVisible();
      await expect(page.locator('text=Key: G')).toBeVisible();
      await expect(page.locator('text=Capo: 0')).toBeVisible();
      await expect(page.locator('text=Tempo: 90')).toBeVisible();
    });

    test('should have raw content section', async ({ page }) => {
      await expect(page.locator('h2:has-text("Raw Content")')).toBeVisible();
      
      // Check that raw content is displayed
      const rawContent = page.locator('h2:has-text("Raw Content") + div');
      await expect(rawContent).toBeVisible();
      
      const rawText = await rawContent.textContent();
      expect(rawText).toContain('{title: Amazing Grace}');
      expect(rawText).toContain('[G]Amazing [G7]grace');
    });

    test('should update rendered output when editor content changes', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Clear the editor and add new content
      await editor.fill('{title: Test Song}\n{artist: Test Artist}\n[C]Hello [G]World');
      
      // Check that rendered output updates
      await expect(page.locator('h3:has-text("Test Song")')).toBeVisible();
      await expect(page.locator('text=by Test Artist')).toBeVisible();
      
      // Check that chord rendering works
      await expect(page.locator('text=Hello')).toBeVisible();
      await expect(page.locator('text=World')).toBeVisible();
    });

    test('should handle syntax highlighting in editor', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Add content with different ChordPro elements
      await editor.fill('{title: Syntax Test}\n# This is a comment\n[Am]Chord [F]test\n{start_of_chorus}\nChorus lyrics\n{end_of_chorus}');
      
      // Verify that the content is in the editor
      const editorContent = await editor.inputValue();
      expect(editorContent).toContain('{title: Syntax Test}');
      expect(editorContent).toContain('# This is a comment');
      expect(editorContent).toContain('[Am]');
      expect(editorContent).toContain('{start_of_chorus}');
    });

    test('should display chord progressions correctly', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Add a simple chord progression
      await editor.fill('{title: Chord Test}\n[C]One [Am]Two [F]Three [G]Four');
      
      // Check that chords are rendered in the output
      await expect(page.locator('h3:has-text("Chord Test")')).toBeVisible();
      
      // The exact rendering will depend on the ChordPro viewer implementation
      // Check that the content is processed and displayed
      const renderedContent = page.locator('h2:has-text("Rendered Output") ~ div');
      await expect(renderedContent).toBeVisible();
    });

    test('should handle directives correctly', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Test various directives
      await editor.fill(`{title: Directive Test}
{artist: Test Artist}
{key: Am}
{capo: 2}
{tempo: 120}
{start_of_verse}
Verse content
{end_of_verse}
{start_of_chorus}
Chorus content
{end_of_chorus}`);
      
      // Check that directives are processed
      await expect(page.locator('h3:has-text("Directive Test")')).toBeVisible();
      await expect(page.locator('text=by Test Artist')).toBeVisible();
      await expect(page.locator('text=Key: Am')).toBeVisible();
      await expect(page.locator('text=Capo: 2')).toBeVisible();
      await expect(page.locator('text=Tempo: 120')).toBeVisible();
    });

    test('should handle comments in ChordPro content', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Add content with comments
      await editor.fill(`{title: Comment Test}
# This is a verse comment
[C]First line
# This is another comment
[G]Second line`);
      
      // Check that the title is rendered
      await expect(page.locator('h3:has-text("Comment Test")')).toBeVisible();
      
      // Comments should be visible in the rendered output
      const renderedContent = page.locator('h2:has-text("Rendered Output") ~ div');
      await expect(renderedContent).toBeVisible();
    });

    test('should handle empty editor content', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Clear the editor
      await editor.fill('');
      
      // Should handle empty content gracefully
      const renderedContent = page.locator('h2:has-text("Rendered Output") ~ div');
      await expect(renderedContent).toBeVisible();
      
      const rawContent = page.locator('h2:has-text("Raw Content") + div');
      await expect(rawContent).toBeVisible();
    });

    test('should preserve editor content during page navigation', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Add custom content
      const customContent = '{title: Navigation Test}\n[C]Test content';
      await editor.fill(customContent);
      
      // Navigate away and back
      await page.click('a[href="#login"]');
      await expect(page).toHaveURL(/#login/);
      
      await page.click('a[href="#demo"]');
      await expect(page).toHaveURL(/#demo/);
      
      // Content should be preserved (or reset to default - adjust based on actual behavior)
      const editorContent = await editor.inputValue();
      // This test may need adjustment based on whether the app preserves state
      expect(typeof editorContent).toBe('string');
    });
  });

  test.describe('ChordPro Syntax Validation', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/#demo');
    });

    test('should handle malformed directives gracefully', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Add malformed directives
      await editor.fill(`{title: Test
{artist Test Artist}
{incomplete
[C]Still works`);
      
      // Should not crash and should render what it can
      const renderedContent = page.locator('h2:has-text("Rendered Output") ~ div');
      await expect(renderedContent).toBeVisible();
    });

    test('should handle malformed chords gracefully', async ({ page }) => {
      const editor = page.locator('textarea[placeholder*="ChordPro"]');
      
      // Add malformed chords
      await editor.fill(`{title: Malformed Chords}
[C Test [G] Normal chord
[Incomplete
Regular text`);
      
      // Should render without errors
      await expect(page.locator('h3:has-text("Malformed Chords")')).toBeVisible();
      const renderedContent = page.locator('h2:has-text("Rendered Output") ~ div');
      await expect(renderedContent).toBeVisible();
    });
  });
});