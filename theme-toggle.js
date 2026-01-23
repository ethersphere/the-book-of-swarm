// Theme toggle for Book of Swarm
// Supports light and dark modes with localStorage persistence

(function() {
  'use strict';

  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  function getTheme() {
    return localStorage.getItem('theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  toggle.addEventListener('click', function() {
    var currentTheme = getTheme();
    var newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  });

  // Set initial theme
  setTheme(getTheme());
})();
