document.addEventListener('DOMContentLoaded', function() {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeToggleIcon = document.querySelector('.theme-toggle-icon');
  const themeToggleText = document.querySelector('.theme-toggle-text');
  
  // Check for saved theme preference or default to light mode
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  // Update button text and icon based on current theme
  updateThemeToggle(currentTheme);
  
  themeToggleBtn.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggle(newTheme);
  });
  
  function updateThemeToggle(theme) {
    if (theme === 'dark') {
      themeToggleIcon.textContent = '☀️';
      themeToggleText.textContent = 'Light Mode';
    } else {
      themeToggleIcon.textContent = '🌙';
      themeToggleText.textContent = 'Dark Mode';
    }
  }
});