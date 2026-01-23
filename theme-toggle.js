// Book of Swarm - Navigation and Theme Toggle
// Supports light/dark modes, sidebar navigation, and image lightbox

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

  // === DOM Ready ===
  document.addEventListener('DOMContentLoaded', function() {

    // === Theme Toggle Button ===
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', function() {
        var currentTheme = getTheme();
        var newTheme = currentTheme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
      });
    }

    // === Mobile Menu Toggle ===
    var menuToggle = document.querySelector('.menu-toggle');
    var sidebar = document.querySelector('.sidebar');
    var sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        if (sidebarOverlay) {
          sidebarOverlay.classList.toggle('active');
        }
      });
    }

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', function() {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
      });
    }

    // === Back to Top Button ===
    var backToTop = document.getElementById('back-to-top');
    if (backToTop) {
      window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
          backToTop.classList.add('visible');
        } else {
          backToTop.classList.remove('visible');
        }
      });

      backToTop.addEventListener('click', function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // === Highlight Active Sidebar Link ===
    var currentPage = window.location.pathname.split('/').pop() || 'main.html';
    var sidebarLinks = document.querySelectorAll('.sidebar-nav a');
    sidebarLinks.forEach(function(link) {
      var href = link.getAttribute('href');
      if (href && (href === currentPage || href.split('#')[0] === currentPage)) {
        link.classList.add('active');
      }
    });

    // === Image Lightbox ===
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

    // === Smooth scroll for anchor links ===
    document.querySelectorAll('a[href^="#"]').forEach(function(anchor) {
      anchor.addEventListener('click', function(e) {
        var targetId = this.getAttribute('href');
        if (targetId && targetId !== '#') {
          var target = document.querySelector(targetId);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });
  });
})();
