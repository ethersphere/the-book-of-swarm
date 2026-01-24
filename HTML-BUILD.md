# Building the HTML Version of The Book of Swarm

This document explains how to build a static HTML version of The Book of Swarm that can be hosted on Swarm decentralized storage or any static web server.

## Prerequisites

### 1. TeX Distribution

You need a TeX distribution with LuaLaTeX support. We recommend **TinyTeX** for a minimal installation:

**macOS (via Homebrew):**
```bash
brew install --cask tinytex
```

**Or install TinyTeX directly:**
```bash
curl -sL "https://yihui.org/tinytex/install-bin-unix.sh" | sh
```

**Linux:**
```bash
wget -qO- "https://yihui.org/tinytex/install-bin-unix.sh" | sh
```

After installation, add TinyTeX to your PATH:
```bash
# macOS
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"

# Linux
export PATH="$HOME/.TinyTeX/bin/x86_64-linux:$PATH"
```

### 2. Required TeX Packages

Install the required LaTeX packages using `tlmgr`:

```bash
tlmgr update --self
tlmgr install \
    make4ht \
    tex4ht \
    luaxml \
    luacode \
    dvisvgm \
    glossaries \
    glossaries-extra \
    xcolor-solarized \
    nextpage \
    todonotes \
    doclicense \
    biblatex \
    biber \
    enumitem \
    tcolorbox \
    environ \
    etoolbox \
    pgf \
    tikz-cd
```

### 3. pdf2svg (Optional but Recommended)

For converting PDF figures to SVG (better quality in browsers):

**macOS:**
```bash
brew install pdf2svg
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt-get install pdf2svg
```

### 4. Python 3

Required for post-processing HTML files. Most systems have this pre-installed.

```bash
python3 --version  # Should be 3.6+
```

### 5. Node.js (Optional - for testing)

Required only if you want to run the automated test suite:

```bash
node --version  # Should be 16+
```

**macOS:**
```bash
brew install node
```

**Linux (via NodeSource):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Building

### Quick Build

Simply run the build script from the repository root:

```bash
./build-html.sh
```

This will:
1. Clean the `dist/` output directory
2. Convert PDF figures to SVG (if pdf2svg is available)
3. Run make4ht to convert LaTeX to HTML5
4. Build the glossary and index
5. Post-process HTML files (add sidebar navigation, fix theme toggle, clean up artifacts)
6. Copy CSS and JavaScript assets
7. Build the search index from HTML content

### Output

The build creates a `dist/` directory with:

```
dist/
├── index.html              # Redirects to main.html
├── main.html               # Title page and table of contents
├── contentsname.html       # Contents
├── listfigurename.html     # List of figures
├── Prolegomena.html        # Prolegomena chapter
├── Acknowledgments.html    # Acknowledgments
├── Prelude.html            # Part I
├── Theevolution.html       # Chapter 1
├── Designandarchitecture.html  # Part II
├── Network.html            # Chapter 2
├── Incentives.html         # Chapter 3
├── BuildingontheDISC.html  # Chapter 4
├── Persistence.html        # Chapter 5
├── Developerinterface.html # Chapter 6
├── Indexes.html            # Part III
├── bibliography.html       # Bibliography
├── glossarytitle.html      # Glossary
├── glossarytitle2.html     # Acronyms
├── main.css                # Generated CSS from tex4ht
├── swarm-book.css          # Custom Swarm styling
├── theme-toggle.js         # Light/dark mode toggle
├── search.js               # Search functionality
├── search-index.json       # Pre-built search index
├── fig/                    # Figures (SVG or PDF)
│   ├── *.svg
│   └── ...
└── doclicense-CC-by-nc-sa-88x31.svg  # License image
```

## Preview Locally

Start a local web server to preview:

```bash
cd dist
python3 -m http.server 8080
```

Then open http://localhost:8080/ in your browser.

## Features

### Sidebar Navigation

The sidebar provides hierarchical navigation with:
- Collapsible chapter sections (click the arrow to expand/collapse)
- Current page highlighting
- Resizable width (drag the edge to resize, double-click to reset)
- Mobile-friendly hamburger menu toggle

### Search

The search box in the sidebar header allows full-text search across all content. Type to search and click results to navigate directly to matches. The search index is pre-built during the build process.

### Light/Dark Theme

Click the sun/moon button in the bottom-right corner to toggle between light and dark modes. The preference is saved in localStorage.

### Click-to-Magnify Images

Click any figure to open it in a lightbox for closer inspection. Press Escape or click outside to close.

### Responsive Design

The layout adapts to different screen sizes, from mobile phones to large displays.

### Math Rendering

Mathematical equations are rendered using MathJax 3, which loads from CDN.

## Customization

### Styling

Edit `swarm-book.css` to customize:
- Colors (CSS variables in `:root` and `[data-theme="dark"]`)
- Typography
- Layout and spacing
- Figure presentation

### Build Configuration

- `book.cfg` - tex4ht configuration (HTML structure, environments)
- `build.mk4` - make4ht build steps (passes, post-processing)
- `fix-theme-toggle.py` - Python post-processor for HTML cleanup

## Deploying to Swarm

After building, upload the `dist/` directory to Swarm:

```bash
# Using swarm-cli
swarm-cli upload dist/ --stamp <your-postage-stamp>

# Or using bee-js
# See https://docs.ethswarm.org/
```

The static HTML site requires no server-side processing and works directly from Swarm's decentralized storage.

## Troubleshooting

### "make4ht not found"

Add TinyTeX to your PATH:
```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
```

### "Package not found" errors

Install missing packages:
```bash
tlmgr install <package-name>
```

### Glossary not appearing

The glossary requires multiple LaTeX passes. The build script handles this automatically, but if running manually:
```bash
makeglossaries main
make4ht -c book.cfg -e build.mk4 main.tex "html5,mathjax"
```

### Figures not displaying

- Ensure pdf2svg is installed for best results
- Check that `dist/fig/` contains the converted SVG files
- PDF figures will work but may have lower quality

### Theme toggle not working

Clear your browser cache and localStorage, then reload. The JavaScript requires the button element to exist when the page loads.

## Build System Files

| File | Purpose |
|------|---------|
| `build-html.sh` | Main build orchestration script |
| `build.mk4` | make4ht Lua build configuration |
| `book.cfg` | tex4ht HTML configuration |
| `swarm-book.css` | Custom CSS styling |
| `theme-toggle.js` | Theme toggle and lightbox JavaScript |
| `fix-theme-toggle.py` | HTML post-processing script |
| `search.js` | Search functionality JavaScript |
| `build-search-index.js` | Generates search-index.json from HTML |

## Automated Testing

The project includes a comprehensive test suite using Playwright for automated validation of the generated HTML site.

### Setup

Install testing dependencies:

```bash
npm install
```

This will install Playwright and automatically download the Chromium browser.

### Running Tests

**Full test suite** (recommended after builds):
```bash
npm test
```

**Quick smoke test** (tests 3 key pages only):
```bash
npm run test:quick
```

**Verbose output** (shows all check details):
```bash
npm run test:verbose
```

**Generate screenshots**:
```bash
npm run test:screenshots
```

**Full test with screenshots and verbose**:
```bash
npm run test:full
```

**Build and test** (complete workflow):
```bash
npm run build:test
```

### What the Tests Check

The test suite validates:

| Check | Description |
|-------|-------------|
| **Page Loading** | All 17 HTML pages load successfully (HTTP 200) |
| **Required Elements** | Theme toggle button and sidebar navigation present |
| **Images** | All images load correctly (no broken images) |
| **JavaScript Errors** | No console errors on any page |
| **Theme Toggle** | Light/dark mode toggle works correctly |
| **Internal Links** | All internal links point to valid pages |
| **MathJax** | Math rendering library loads on pages with equations |
| **Search** | Search functionality works and returns results |
| **Responsive Design** | Basic mobile viewport compatibility |
| **Accessibility** | Checks for missing alt text on images (warnings) |

### Test Output

Tests provide a summary like:

```
==================================================
TEST SUMMARY
==================================================
✓ Passed:   142
✗ Failed:   0
⚠ Warnings: 3
```

Exit code 0 = all tests passed, exit code 1 = failures detected.

### Legacy Audit Script

A simpler audit script is also available:

```bash
# Start the preview server first
npm run serve &

# Run the audit
npm run audit
```

### Screenshots

When running with `--screenshots`, images are saved to `test-screenshots/`:

```
test-screenshots/
├── main.png
├── Network.png
├── Incentives.png
└── ...
```

This is useful for:
- Visual regression testing
- Verifying CSS changes without opening a browser
- Documentation and debugging

### NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm test` | `node tests/test-html.js` | Run full test suite |
| `npm run test:quick` | `... --quick` | Quick smoke test (3 pages) |
| `npm run test:screenshots` | `... --screenshots` | Generate page screenshots |
| `npm run test:verbose` | `... --verbose` | Show detailed output |
| `npm run test:full` | `... --verbose --screenshots` | Full test with all options |
| `npm run audit` | `node site-audit.js` | Run legacy audit script |
| `npm run serve` | `python3 -m http.server 8080` | Start preview server |
| `npm run build` | `./build-html.sh` | Build HTML site |
| `npm run build:test` | Build + test | Complete build and test workflow |

## License

The Book of Swarm is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported (CC BY-NC-SA 3.0).
