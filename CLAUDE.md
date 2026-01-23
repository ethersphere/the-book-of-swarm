# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "The Book of Swarm" - a LaTeX book by Viktor Trón about Swarm, a decentralized storage and communication infrastructure for Web 3.0. The primary goal is to convert this book into a **static HTML website** that can be served from Swarm storage.

## Build Commands

### Build HTML version
```bash
./build-html.sh
```

### Preview locally
```bash
cd dist && python3 -m http.server 8080
# Open http://localhost:8080/
```

### Install TeX dependencies (if needed)
```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
tlmgr install make4ht tex4ht luaxml glossaries glossaries-extra
```

### Manual conversion (single file)
```bash
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
make4ht -c book.cfg -e build.mk4 main.tex "html5,mathjax"
```

## Build System Files

- `build-html.sh` - Main build script for HTML generation
- `build.mk4` - make4ht build configuration (Lua)
- `book.cfg` - tex4ht configuration for HTML output
- `swarm-book.css` - Swarm-styled CSS (ethswarm.org aesthetic)
- `theme-toggle.js` - Light/dark mode toggle

## Target Design Style (ethswarm.org)

- **Colors**: Orange/amber accents (#F7931A), dark mode support
- **Theme**: Light/dark toggle with localStorage persistence
- **Typography**: System sans-serif fonts, clean and readable
- **Layout**: Responsive, card-based chapters, clear navigation

## Source Document Structure

- `main.tex` - Master document with preamble and structure
- `intro.tex` - Introduction chapter (Web history)
- `parts.tex` - Main content (design and architecture)
- `glossary.tex` - Glossary entries (~100+ terms)
- `acronyms.tex` - Acronym definitions
- `refs.bib` - BibTeX bibliography
- `front/` - Front matter (quotes, prolegomena, acknowledgements)
- `fig/` - Figures (PDFs and TikZ `.tex` files)
- `style/` - Custom LaTeX style files for code listings

## LaTeX Conventions

### Glossary Terms
- `\gloss{term}` → linked glossary reference (italic on first use)
- `\glossplural{term}` → plural form
- `\glossupper{term}` → capitalized

### Math Notation
- `\PO` - Proximity order (rendered as italics)
- `\concat` / `\Concat` - Concatenation operator (⊕)
- `\defeq` - Definition equals
- `\xor` - XOR operator

### Status Markers (stripped in HTML output)
- `\statusgreen`, `\statusorange`, `\statusred` - draft markers
- `\wip{}`, `\green{}`, `\yellow{}`, `\red{}` - todo markers

## Conversion Pipeline

1. **make4ht** converts LaTeX → HTML5 with MathJax
2. **book.cfg** configures document structure and styling hooks
3. **build.mk4** post-processes HTML to clean up artifacts
4. **swarm-book.css** applies Swarm visual styling
5. **pdf2svg** (optional) converts PDF figures to SVG

## Output Structure

```
dist/
├── index.html          # Redirect to main content
├── main.html           # Main book content
├── *.html              # Chapter files (if split)
├── swarm-book.css      # Styling
├── theme-toggle.js     # Theme switcher
└── fig/                # Figures (SVG or PDF)
```

## Known Issues

- Glossary requires multiple LaTeX passes to resolve
- Some complex TikZ figures may not convert perfectly
- PDF figures need pdf2svg for best results (install via `brew install pdf2svg`)
