const { chromium } = require('playwright');

const BASE_URL = 'http://localhost:8080';

const PAGES = [
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

async function auditSite() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

  const issues = {
    brokenLinks: [],
    brokenImages: [],
    jsErrors: [],
    missingElements: [],
    otherIssues: []
  };

  // Collect all links across all pages
  const allLinks = new Set();
  const checkedUrls = new Set();

  console.log('=== Site Audit Report ===\n');

  for (const pageName of PAGES) {
    const url = `${BASE_URL}/${pageName}`;
    console.log(`\n--- Checking: ${pageName} ---`);

    const page = await context.newPage();

    // Capture JS errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        pageErrors.push(`Console error: ${msg.text()}`);
      }
    });

    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      if (!response || response.status() !== 200) {
        issues.brokenLinks.push({ page: pageName, url, status: response?.status() || 'no response' });
        console.log(`  ❌ Page failed to load: ${response?.status() || 'no response'}`);
        await page.close();
        continue;
      }

      console.log(`  ✓ Page loaded successfully`);

      // Check for theme toggle button (has id, not class)
      const themeToggle = await page.$('#theme-toggle');
      if (!themeToggle) {
        issues.missingElements.push({ page: pageName, element: 'theme-toggle button' });
        console.log(`  ❌ Missing theme toggle button`);
      } else {
        console.log(`  ✓ Theme toggle present`);
      }

      // Check for sidebar
      const sidebar = await page.$('.sidebar');
      if (!sidebar) {
        issues.missingElements.push({ page: pageName, element: 'sidebar navigation' });
        console.log(`  ❌ Missing sidebar navigation`);
      } else {
        console.log(`  ✓ Sidebar present`);
      }

      // Collect all links on this page
      const links = await page.$$eval('a[href]', anchors =>
        anchors.map(a => ({
          href: a.getAttribute('href'),
          text: a.textContent.trim().substring(0, 50)
        }))
      );

      console.log(`  Found ${links.length} links`);

      for (const link of links) {
        if (link.href && !link.href.startsWith('#') && !link.href.startsWith('javascript:') && !link.href.startsWith('mailto:')) {
          allLinks.add(JSON.stringify({ ...link, sourcePage: pageName }));
        }
      }

      // Check images
      const images = await page.$$eval('img', imgs =>
        imgs.map(img => ({
          src: img.getAttribute('src'),
          alt: img.getAttribute('alt') || '',
          naturalWidth: img.naturalWidth,
          complete: img.complete
        }))
      );

      let brokenImgCount = 0;
      for (const img of images) {
        // Skip lightbox placeholder images (empty src is intentional)
        if (!img.src || img.src === '') continue;
        if (img.complete && img.naturalWidth === 0) {
          issues.brokenImages.push({ page: pageName, src: img.src, alt: img.alt });
          brokenImgCount++;
        }
      }

      if (brokenImgCount > 0) {
        console.log(`  ❌ ${brokenImgCount} broken images found`);
      } else if (images.length > 0) {
        console.log(`  ✓ All ${images.length} images loaded`);
      }

      // Check for object/embed elements (often used for SVG)
      const objects = await page.$$eval('object', objs =>
        objs.map(obj => ({
          data: obj.getAttribute('data'),
          type: obj.getAttribute('type')
        }))
      );

      if (objects.length > 0) {
        console.log(`  Found ${objects.length} embedded objects`);

        // Check if objects loaded
        for (const obj of objects) {
          if (obj.data) {
            try {
              const objUrl = obj.data.startsWith('http') ? obj.data : `${BASE_URL}/${obj.data}`;
              const objResponse = await page.request.get(objUrl);
              if (objResponse.status() !== 200) {
                issues.brokenImages.push({ page: pageName, src: obj.data, type: 'object' });
              }
            } catch (e) {
              issues.brokenImages.push({ page: pageName, src: obj.data, type: 'object', error: e.message });
            }
          }
        }
      }

      // Report JS errors for this page
      if (pageErrors.length > 0) {
        for (const error of pageErrors) {
          issues.jsErrors.push({ page: pageName, error });
        }
        console.log(`  ❌ ${pageErrors.length} JavaScript errors`);
      } else {
        console.log(`  ✓ No JavaScript errors`);
      }

    } catch (error) {
      issues.otherIssues.push({ page: pageName, error: error.message });
      console.log(`  ❌ Error: ${error.message}`);
    }

    await page.close();
  }

  // Now check all collected links
  console.log('\n\n--- Checking all internal links ---\n');

  const page = await context.newPage();
  let brokenLinkCount = 0;
  let checkedLinkCount = 0;

  for (const linkJson of allLinks) {
    const link = JSON.parse(linkJson);
    let targetUrl = link.href;

    // Skip external links
    if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
      if (!targetUrl.startsWith(BASE_URL)) {
        continue; // Skip external links
      }
    } else {
      // Relative URL
      targetUrl = `${BASE_URL}/${targetUrl}`;
    }

    // Remove hash for checking
    const urlWithoutHash = targetUrl.split('#')[0];

    if (checkedUrls.has(urlWithoutHash)) {
      continue;
    }
    checkedUrls.add(urlWithoutHash);
    checkedLinkCount++;

    try {
      const response = await page.request.get(urlWithoutHash);
      if (response.status() !== 200) {
        issues.brokenLinks.push({
          sourcePage: link.sourcePage,
          href: link.href,
          text: link.text,
          status: response.status()
        });
        brokenLinkCount++;
        console.log(`  ❌ Broken: ${link.href} (from ${link.sourcePage}) - Status: ${response.status()}`);
      }
    } catch (error) {
      issues.brokenLinks.push({
        sourcePage: link.sourcePage,
        href: link.href,
        text: link.text,
        error: error.message
      });
      brokenLinkCount++;
      console.log(`  ❌ Error: ${link.href} (from ${link.sourcePage}) - ${error.message}`);
    }
  }

  console.log(`\nChecked ${checkedLinkCount} unique internal links, ${brokenLinkCount} broken`);

  await page.close();
  await browser.close();

  // Print summary
  console.log('\n\n========== SUMMARY ==========\n');

  if (issues.brokenLinks.length > 0) {
    console.log(`❌ BROKEN LINKS (${issues.brokenLinks.length}):`);
    for (const item of issues.brokenLinks) {
      console.log(`   - ${item.href || item.url} (from ${item.sourcePage || item.page}) - ${item.status || item.error}`);
    }
    console.log('');
  } else {
    console.log('✓ No broken links found\n');
  }

  if (issues.brokenImages.length > 0) {
    console.log(`❌ BROKEN IMAGES (${issues.brokenImages.length}):`);
    for (const item of issues.brokenImages) {
      console.log(`   - ${item.src} (on ${item.page})`);
    }
    console.log('');
  } else {
    console.log('✓ No broken images found\n');
  }

  if (issues.jsErrors.length > 0) {
    console.log(`❌ JAVASCRIPT ERRORS (${issues.jsErrors.length}):`);
    for (const item of issues.jsErrors) {
      console.log(`   - ${item.page}: ${item.error}`);
    }
    console.log('');
  } else {
    console.log('✓ No JavaScript errors found\n');
  }

  if (issues.missingElements.length > 0) {
    console.log(`❌ MISSING ELEMENTS (${issues.missingElements.length}):`);
    for (const item of issues.missingElements) {
      console.log(`   - ${item.page}: missing ${item.element}`);
    }
    console.log('');
  } else {
    console.log('✓ All required elements present\n');
  }

  if (issues.otherIssues.length > 0) {
    console.log(`❌ OTHER ISSUES (${issues.otherIssues.length}):`);
    for (const item of issues.otherIssues) {
      console.log(`   - ${item.page}: ${item.error}`);
    }
    console.log('');
  }

  const totalIssues = issues.brokenLinks.length + issues.brokenImages.length +
                      issues.jsErrors.length + issues.missingElements.length +
                      issues.otherIssues.length;

  if (totalIssues === 0) {
    console.log('🎉 All checks passed! No issues found.');
  } else {
    console.log(`\n⚠️  Total issues found: ${totalIssues}`);
  }

  return issues;
}

auditSite().catch(console.error);
