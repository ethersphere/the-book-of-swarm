#!/usr/bin/env node
/**
 * HTML Site Tests for The Book of Swarm
 *
 * Comprehensive test suite to validate the generated HTML site.
 * Run after building with ./build-html.sh
 *
 * Usage:
 *   npm test                    # Run all tests
 *   npm test -- --quick         # Quick smoke test (first 3 pages only)
 *   npm test -- --screenshots   # Generate screenshots of each page
 *   npm test -- --verbose       # Show detailed output
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Configuration
const CONFIG = {
  port: 8080,
  distDir: path.join(__dirname, '..', 'dist'),
  screenshotDir: path.join(__dirname, '..', 'test-screenshots'),
  timeout: 30000,
  viewport: { width: 1920, height: 1080 }
};

// All pages to test
const ALL_PAGES = [
  'main.html',
  'contentsname.html',
  'listfigurename.html',
  'Prolegomena.html',
  'Acknowledgments.html',
  'Prelude.html',
  'Theevolution.html',
  'Designandarchitecture.html',
  'Network.html',
  'Incentives.html',
  'BuildingontheDISC.html',
  'Persistence.html',
  'Developerinterface.html',
  'Indexes.html',
  'glossarytitle.html',
  'glossarytitle1.html',
  'glossarytitle2.html'
];

// Quick test pages (subset for fast validation)
const QUICK_PAGES = ['main.html', 'Network.html', 'Incentives.html'];

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  quick: args.includes('--quick'),
  screenshots: args.includes('--screenshots'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
HTML Site Tests for The Book of Swarm

Usage: npm test [options]

Options:
  --quick        Run quick smoke test (3 pages only)
  --screenshots  Generate screenshots of each page
  --verbose      Show detailed output for each check
  --help, -h     Show this help message

Examples:
  npm test                     # Full test suite
  npm test -- --quick          # Quick validation
  npm test -- --screenshots    # Generate screenshots
`);
  process.exit(0);
}

const PAGES = options.quick ? QUICK_PAGES : ALL_PAGES;

// Test results collector
class TestResults {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
    this.errors = [];
    this.warnings_list = [];
  }

  pass(msg) {
    this.passed++;
    if (options.verbose) console.log(`  ✓ ${msg}`);
  }

  fail(msg, details = null) {
    this.failed++;
    this.errors.push({ msg, details });
    console.log(`  ✗ ${msg}`);
    if (details && options.verbose) console.log(`    ${details}`);
  }

  warn(msg) {
    this.warnings++;
    this.warnings_list.push(msg);
    if (options.verbose) console.log(`  ⚠ ${msg}`);
  }

  summary() {
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`✓ Passed:   ${this.passed}`);
    console.log(`✗ Failed:   ${this.failed}`);
    console.log(`⚠ Warnings: ${this.warnings}`);

    if (this.errors.length > 0) {
      console.log('\nFailed tests:');
      this.errors.forEach(e => console.log(`  - ${e.msg}`));
    }

    if (this.warnings_list.length > 0 && options.verbose) {
      console.log('\nWarnings:');
      this.warnings_list.forEach(w => console.log(`  - ${w}`));
    }

    return this.failed === 0;
  }
}

// Simple static file server
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(CONFIG.distDir, req.url === '/' ? 'index.html' : req.url);

      // Handle query strings and fragments
      filePath = filePath.split('?')[0].split('#')[0];

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.pdf': 'application/pdf'
      };

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
          res.end(data);
        }
      });
    });

    server.listen(CONFIG.port, () => {
      resolve(server);
    });

    server.on('error', reject);
  });
}

// Test: Page loads successfully
async function testPageLoads(page, pageName, results) {
  const url = `http://localhost:${CONFIG.port}/${pageName}`;

  try {
    const response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout
    });

    if (response && response.status() === 200) {
      results.pass(`${pageName} loads (HTTP 200)`);
      return true;
    } else {
      results.fail(`${pageName} failed to load`, `Status: ${response?.status()}`);
      return false;
    }
  } catch (error) {
    results.fail(`${pageName} load error`, error.message);
    return false;
  }
}

// Test: Required elements present
async function testRequiredElements(page, pageName, results) {
  // Theme toggle
  const themeToggle = await page.$('#theme-toggle');
  if (themeToggle) {
    results.pass(`${pageName}: Theme toggle present`);
  } else {
    results.fail(`${pageName}: Missing theme toggle button`);
  }

  // Sidebar
  const sidebar = await page.$('.sidebar');
  if (sidebar) {
    results.pass(`${pageName}: Sidebar present`);
  } else {
    results.fail(`${pageName}: Missing sidebar navigation`);
  }

  // Main content area
  const mainContent = await page.$('.main-content');
  if (mainContent) {
    results.pass(`${pageName}: Main content area present`);
  } else {
    results.warn(`${pageName}: Missing .main-content wrapper (may be OK)`);
  }
}

// Test: All images load
async function testImages(page, pageName, results) {
  const images = await page.$$eval('img', imgs =>
    imgs.map(img => ({
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt') || '',
      naturalWidth: img.naturalWidth,
      complete: img.complete
    }))
  );

  let broken = 0;
  let missingAlt = 0;

  for (const img of images) {
    // Skip lightbox placeholder
    if (!img.src || img.src === '') continue;

    if (img.complete && img.naturalWidth === 0) {
      results.fail(`${pageName}: Broken image`, img.src);
      broken++;
    }

    // Check for alt text (accessibility)
    if (!img.alt || img.alt === 'PIC' || img.alt === '[Picture]') {
      missingAlt++;
    }
  }

  const realImages = images.filter(i => i.src && i.src !== '').length;

  if (broken === 0 && realImages > 0) {
    results.pass(`${pageName}: All ${realImages} images loaded`);
  }

  if (missingAlt > 0) {
    results.warn(`${pageName}: ${missingAlt} images missing descriptive alt text`);
  }
}

// Test: No JavaScript errors
async function testNoJSErrors(page, pageName, results) {
  const errors = [];

  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('404')) {
      errors.push(msg.text());
    }
  });

  // Wait a moment for any async errors
  await page.waitForTimeout(500);

  if (errors.length === 0) {
    results.pass(`${pageName}: No JavaScript errors`);
  } else {
    errors.forEach(err => {
      results.fail(`${pageName}: JS error`, err);
    });
  }
}

// Test: Theme toggle functionality
async function testThemeToggle(page, pageName, results) {
  const themeToggle = await page.$('#theme-toggle');
  if (!themeToggle) return;

  // Get initial theme
  const initialTheme = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme')
  );

  // Click toggle
  await themeToggle.click();
  await page.waitForTimeout(100);

  // Get new theme
  const newTheme = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme')
  );

  if (initialTheme !== newTheme) {
    results.pass(`${pageName}: Theme toggle works (${initialTheme} → ${newTheme})`);
  } else {
    results.fail(`${pageName}: Theme toggle did not change theme`);
  }

  // Toggle back
  await themeToggle.click();
}

// Test: Internal links
async function testInternalLinks(page, pageName, results, allLinks) {
  const links = await page.$$eval('a[href]', anchors =>
    anchors.map(a => ({
      href: a.getAttribute('href'),
      text: a.textContent.trim().substring(0, 50)
    }))
  );

  for (const link of links) {
    if (!link.href) continue;
    if (link.href.startsWith('#')) continue;
    if (link.href.startsWith('javascript:')) continue;
    if (link.href.startsWith('mailto:')) continue;
    if (link.href.startsWith('http://') || link.href.startsWith('https://')) continue;

    allLinks.add(JSON.stringify({ href: link.href, source: pageName }));
  }

  results.pass(`${pageName}: Found ${links.length} links`);
}

// Test: MathJax loaded (for pages with math)
async function testMathJax(page, pageName, results) {
  const hasMath = await page.evaluate(() => {
    return document.querySelector('.mathjax-inline, .mathjax-display, .MathJax') !== null;
  });

  if (hasMath) {
    const mathJaxLoaded = await page.evaluate(() => {
      return typeof MathJax !== 'undefined';
    });

    if (mathJaxLoaded) {
      results.pass(`${pageName}: MathJax loaded for math content`);
    } else {
      results.warn(`${pageName}: Has math content but MathJax may not be fully loaded`);
    }
  }
}

// Test: Responsive design (basic check)
async function testResponsiveDesign(page, pageName, results) {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  await page.waitForTimeout(200);

  // Check if sidebar is hidden on mobile (should be toggle-able)
  const sidebarVisible = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return false;
    const style = window.getComputedStyle(sidebar);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });

  // Menu toggle should be visible on mobile
  const menuToggle = await page.$('.menu-toggle');

  if (menuToggle || !sidebarVisible) {
    results.pass(`${pageName}: Responsive design OK (mobile)`);
  } else {
    results.warn(`${pageName}: Sidebar may not be properly hidden on mobile`);
  }

  // Reset viewport
  await page.setViewportSize(CONFIG.viewport);
}

// Verify all collected internal links
async function verifyInternalLinks(page, allLinks, results) {
  console.log('\n--- Verifying internal links ---');

  const checked = new Set();
  let broken = 0;

  for (const linkJson of allLinks) {
    const link = JSON.parse(linkJson);
    const href = link.href.split('#')[0]; // Remove fragment

    if (checked.has(href)) continue;
    checked.add(href);

    try {
      const url = `http://localhost:${CONFIG.port}/${href}`;
      const response = await page.request.get(url);

      if (response.status() !== 200) {
        results.fail(`Broken link: ${link.href}`, `From: ${link.source}, Status: ${response.status()}`);
        broken++;
      }
    } catch (error) {
      results.fail(`Link error: ${link.href}`, `From: ${link.source}, Error: ${error.message}`);
      broken++;
    }
  }

  if (broken === 0) {
    results.pass(`All ${checked.size} internal links valid`);
  }
}

// Take screenshots
async function takeScreenshot(page, pageName) {
  if (!options.screenshots) return;

  if (!fs.existsSync(CONFIG.screenshotDir)) {
    fs.mkdirSync(CONFIG.screenshotDir, { recursive: true });
  }

  const filename = path.join(CONFIG.screenshotDir, `${pageName.replace('.html', '')}.png`);
  await page.screenshot({ path: filename, fullPage: false });
  console.log(`  📸 Screenshot: ${filename}`);
}

// Main test runner
async function runTests() {
  console.log('='.repeat(50));
  console.log('THE BOOK OF SWARM - HTML SITE TESTS');
  console.log('='.repeat(50));
  console.log(`Mode: ${options.quick ? 'Quick' : 'Full'}`);
  console.log(`Pages to test: ${PAGES.length}`);
  console.log(`Screenshots: ${options.screenshots ? 'Yes' : 'No'}`);
  console.log('');

  // Check dist directory exists
  if (!fs.existsSync(CONFIG.distDir)) {
    console.error('Error: dist/ directory not found. Run ./build-html.sh first.');
    process.exit(1);
  }

  // Start server
  console.log('Starting test server...');
  let server;
  try {
    server = await startServer();
    console.log(`Server running on port ${CONFIG.port}\n`);
  } catch (error) {
    if (error.code === 'EADDRINUSE') {
      console.log(`Port ${CONFIG.port} in use, assuming server already running\n`);
      server = null;
    } else {
      throw error;
    }
  }

  const results = new TestResults();
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: CONFIG.viewport });
  const allLinks = new Set();

  try {
    // Test each page
    for (const pageName of PAGES) {
      console.log(`\n--- Testing: ${pageName} ---`);

      const page = await context.newPage();

      // Run tests
      const loaded = await testPageLoads(page, pageName, results);

      if (loaded) {
        await testRequiredElements(page, pageName, results);
        await testImages(page, pageName, results);
        await testNoJSErrors(page, pageName, results);
        await testThemeToggle(page, pageName, results);
        await testInternalLinks(page, pageName, results, allLinks);
        await testMathJax(page, pageName, results);
        await testResponsiveDesign(page, pageName, results);
        await takeScreenshot(page, pageName);
      }

      await page.close();
    }

    // Verify all collected links
    const linkPage = await context.newPage();
    await verifyInternalLinks(linkPage, allLinks, results);
    await linkPage.close();

  } finally {
    await browser.close();
    if (server) server.close();
  }

  // Print summary and exit
  const success = results.summary();
  process.exit(success ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
