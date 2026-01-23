// Theme toggle and image lightbox for Book of Swarm
// Supports light and dark modes with localStorage persistence

(function() {
  'use strict';

  // === Theme Toggle ===
  function getTheme() {
    return localStorage.getItem('theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }

  // Set initial theme
  setTheme(getTheme());

  // Add click handler to theme toggle button if it exists
  document.addEventListener('DOMContentLoaded', function() {
    var toggle = document.getElementById('theme-toggle');
    if (toggle) {
      toggle.addEventListener('click', function() {
        var currentTheme = getTheme();
        var newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
      });
    }

    // === Image Lightbox ===
    // Create lightbox overlay
    var overlay = document.createElement('div');
    overlay.className = 'lightbox-overlay';
    overlay.innerHTML = '<button class="lightbox-close" aria-label="Close">&times;</button><img src="" alt="">';
    document.body.appendChild(overlay);

    var lightboxImg = overlay.querySelector('img');
    var closeBtn = overlay.querySelector('.lightbox-close');

    // Close lightbox on click
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay || e.target === closeBtn) {
        overlay.classList.remove('active');
      }
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) {
        overlay.classList.remove('active');
      }
    });

    // Add click handlers to all images in figures
    var images = document.querySelectorAll('figure img, .book-figure img, .figure img, img.graphics');
    images.forEach(function(img) {
      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function(e) {
        e.preventDefault();
        lightboxImg.src = this.src;
        lightboxImg.alt = this.alt || 'Figure';
        overlay.classList.add('active');
      });
    });
  });
})();
