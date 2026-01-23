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
5. Post-process HTML files (fix theme toggle, clean up artifacts)
6. Copy CSS and JavaScript assets

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
├── glossarytitle.html      # Glossary
├── glossarytitle1.html     # Index
├── glossarytitle2.html     # Acronyms
├── main.css                # Generated CSS from tex4ht
├── swarm-book.css          # Custom Swarm styling
├── theme-toggle.js         # Light/dark mode toggle
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

## Testing with Playwright (Optional)

For automated visual testing and screenshots, you can use Playwright:

```bash
# Install Playwright
npm install playwright
npx playwright install chromium

# Take a screenshot
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('http://localhost:8080/main.html');
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  console.log('Screenshot saved');
})();
"
```

This is useful for:
- Verifying CSS changes without a browser
- Debugging layout issues programmatically
- Automated testing of the build output

## License

The Book of Swarm is licensed under Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported (CC BY-NC-SA 3.0).
