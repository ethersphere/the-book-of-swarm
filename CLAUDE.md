# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "The Book of Swarm" - a LaTeX book by Viktor Trón about Swarm, a decentralized storage and communication infrastructure for Web 3.0. The repository supports two output formats:

1. **PDF** - Traditional LaTeX compilation (main branch)
2. **Static HTML** - For hosting on Swarm storage (html-build branch)

## Quick Commands

### Build HTML version (html-build branch)
```bash
./build-html.sh                          # Build to dist/
cd dist && python3 -m http.server 8080   # Preview at http://localhost:8080/
```

### Build PDF version (main branch)
```bash
latexmk -pdf main.tex
```

## HTML Build Documentation

See **[HTML-BUILD.md](HTML-BUILD.md)** for complete instructions including:
- Prerequisites and installation
- Required TeX packages
- Build process details
- Customization options
- Troubleshooting guide
- Deploying to Swarm

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

## HTML Build System Files

| File | Purpose |
|------|---------|
| `build-html.sh` | Main build orchestration script |
| `build.mk4` | make4ht Lua build configuration |
| `book.cfg` | tex4ht HTML configuration |
| `swarm-book.css` | Custom CSS (ethswarm.org style) |
| `theme-toggle.js` | Theme toggle and lightbox JS |
| `fix-theme-toggle.py` | HTML post-processing script |

## Git Branches

- `master` - Main branch with PDF-focused workflow
- `html-build` - HTML build system and static site generation
