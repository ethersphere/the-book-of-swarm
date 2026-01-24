#!/usr/bin/env python3
"""
Post-process HTML files for Book of Swarm.
- Adds top navigation bar
- Adds sidebar with table of contents
- Adds theme toggle and back-to-top buttons
- Wraps content in proper layout containers
- Styles index page numbers
- Fixes accented characters in small caps (tex4ht HTF mapping issue)
"""

import sys
import re
import os

# Names with accented characters that tex4ht drops in small caps
# tex4ht's HTF font mappings for small caps don't include Č, Š, Ž, ě, š, ć etc.
# These are extracted from front/02-acknowledgements.tex
SMALL_CAPS_NAME_FIXES = {
    # Broken name -> Correct name
    "rt Ahlin": "Črt Ahlin",
    "Gregor avcer": "Gregor Žavcer",
    "Vojtch imetka": "Vojtěch Šimetka",
    "Jano Gulja": "Janoš Guljaš",
    "Petar Radovi": "Petar Radović",
    "Svetomir Smiljkovi": "Svetomir Smiljković",
    "Marko Blazevi": "Marko Blazević",
    "Vlado Paji": "Vlado Pajić",
}

# Base navigation items (before TOC content)
# Only items that don't appear in the parsed TOC
NAV_BASE = [
    {"title": "Home", "href": "main.html", "type": "home"},
    {"title": "Contents", "href": "contentsname.html", "type": "chapter"},
    {"title": "Figures", "href": "listfigurename.html", "type": "chapter"},
]

# Cached navigation structure (populated from TOC)
_nav_structure_cache = None

def parse_toc_for_nav(dist_dir):
    """Parse the table of contents HTML to build navigation structure."""
    global _nav_structure_cache
    if _nav_structure_cache is not None:
        return _nav_structure_cache

    toc_path = os.path.join(dist_dir, "contentsname.html")
    if not os.path.exists(toc_path):
        # Fallback if TOC not yet generated
        return NAV_BASE

    with open(toc_path, 'r', encoding='utf-8') as f:
        content = f.read()

    nav_items = list(NAV_BASE)  # Start with base items

    # Parse parts, chapters, and sections from TOC
    # partToc: <span class='partToc'>I  <a href='Prelude.html#prelude'>Prelude</a></span>
    # chapterToc: <span class='chapterToc'>1 <a href='Theevolution.html#the-evolution-'>The evolution </a></span>
    # sectionToc: <span class='sectionToc'>1.1 <a href='Theevolution.html#historical-context-'>Historical context </a></span>

    # Match all TOC entries
    pattern = r"<span class='(partToc|chapterToc|sectionToc|likechapterToc)'>(.*?)<a href='([^']+)'>([^<]+)</a></span>"

    for match in re.finditer(pattern, content, re.DOTALL):
        toc_type = match.group(1)
        number = match.group(2).strip()
        href = match.group(3)
        title = match.group(4).strip()

        # Get just the filename part of href (before #anchor)
        href_file = href.split('#')[0] if '#' in href else href

        if toc_type == 'partToc':
            # Part: "I" + "Prelude" -> "Part I: Prelude"
            nav_items.append({
                "title": f"Part {number}: {title}",
                "href": href_file,
                "type": "part"
            })
        elif toc_type in ('chapterToc', 'likechapterToc'):
            # Chapter: "1" + "The evolution" -> "1. The evolution"
            if number:
                nav_items.append({
                    "title": f"{number} {title}",
                    "href": href_file,
                    "type": "chapter"
                })
            else:
                nav_items.append({
                    "title": title,
                    "href": href_file,
                    "type": "chapter"
                })
        elif toc_type == 'sectionToc':
            # Section: "1.1" + "Historical context" -> "1.1 Historical context"
            nav_items.append({
                "title": f"{number} {title}",
                "href": href,  # Keep full href with anchor for sections
                "type": "section"
            })

    # Fix bibliography link (tex4ht generates garbled filename)
    for item in nav_items:
        if item.get("title") == "Bibliography":
            item["href"] = "bibliography.html"

    # Remove Index page (search replaces its functionality)
    nav_items = [item for item in nav_items if item.get("title") != "Index"]

    _nav_structure_cache = nav_items
    return nav_items

def get_top_nav_html():
    """Generate mobile menu toggle and overlay (no top nav bar)."""
    return '''<button class="menu-toggle" aria-label="Toggle menu">☰</button>
<div class="sidebar-overlay"></div>
'''

def get_sidebar_html(current_file, dist_dir):
    """Generate the sidebar navigation HTML with collapsible sections."""
    nav_structure = parse_toc_for_nav(dist_dir)

    items = []
    sections_buffer = []
    in_chapter = False

    def flush_sections():
        """Add buffered sections as a collapsible group and close chapter li."""
        nonlocal sections_buffer, in_chapter
        if sections_buffer:
            section_items = "\n      ".join(sections_buffer)
            items.append(f'<ul class="section-list">\n      {section_items}\n    </ul>')
            sections_buffer = []
        if in_chapter:
            items.append('</li>')
            in_chapter = False

    for nav in nav_structure:
        nav_file = nav["href"].split('#')[0] if '#' in nav["href"] else nav["href"]
        active = "active" if nav_file == current_file else ""

        if nav["type"] == "part":
            flush_sections()
            items.append(f'<li><a href="{nav["href"]}" class="part-item {active}">{nav["title"]}</a></li>')

        elif nav["type"] == "chapter":
            flush_sections()
            # Check if this chapter has sections (will be expanded if current)
            has_sections = any(
                n["type"] == "section" and n["href"].split('#')[0] == nav_file
                for n in nav_structure
            )
            expanded = "expanded" if nav_file == current_file and has_sections else ""
            toggle = '<span class="chapter-toggle">›</span>' if has_sections else ''
            items.append(f'<li class="chapter-container {expanded}"><a href="{nav["href"]}" class="chapter-item {active}">{toggle}{nav["title"]}</a>')
            in_chapter = True
            if not has_sections:
                items.append('</li>')
                in_chapter = False

        elif nav["type"] == "home":
            flush_sections()
            items.append(f'<li><a href="{nav["href"]}" class="chapter-item {active}">{nav["title"]}</a></li>')

        elif nav["type"] == "section":
            sections_buffer.append(f'<li><a href="{nav["href"]}" class="section-item {active}">{nav["title"]}</a></li>')

    flush_sections()

    nav_items = "\n    ".join(items)

    return f'''<aside class="sidebar">
  <div class="sidebar-resize-handle"></div>
  <div class="sidebar-header">
    <a href="main.html" class="sidebar-brand">
      <span class="sidebar-brand-icon">S</span>
      <span>Book of Swarm</span>
    </a>
  </div>
  <div class="sidebar-section">
    <div class="sidebar-title">Contents</div>
    <ul class="sidebar-nav">
    {nav_items}
    </ul>
  </div>
</aside>
'''

def get_floating_buttons_html():
    """Generate the floating action buttons HTML."""
    return '''<div class="book-nav">
  <button id="back-to-top" aria-label="Back to top">↑</button>
  <button id="theme-toggle" aria-label="Toggle dark mode">
    <span class="theme-icon"></span>
  </button>
</div>
<script src="theme-toggle.js"></script>
<script src="search.js"></script>
'''


def fix_small_caps_accents(content):
    """
    Fix accented characters in small caps that tex4ht drops.

    tex4ht's HTF (HyperText Font) mappings for small caps fonts don't include
    Central European characters like Č, Š, Ž, ě, ć. This causes names like
    "Črt Ahlin" to appear as "rt Ahlin" in the HTML output.

    This function replaces the broken names with the correct versions.
    Works with both tex4ht's font class (ec-lmcsc-*) and custom small-caps class.
    """
    for broken, correct in SMALL_CAPS_NAME_FIXES.items():
        # Match within any span containing the broken text (handles ec-lmcsc-* and small-caps)
        # Handle potential newlines in the content (tex4ht sometimes breaks across lines)
        # Convert broken name to allow whitespace between words
        broken_pattern = r"\s+".join(re.escape(word) for word in broken.split())
        pattern = f"(<span class=['\"][^'\"]*['\"]>){broken_pattern}(\\s*</span>)"
        replacement = f"\\1{correct}\\2"
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    return content


def fix_index_hyperlinks(content, filename):
    """
    Style page numbers in index/glossary as references.

    Note: In the HTML version, PDF page numbers can't be directly linked since
    they don't correspond to HTML anchors. The page numbers are kept for reference
    but styled differently to indicate they're print page references.
    """
    if 'glossarytitle' not in filename:
        return content

    def style_page_numbers(match):
        """Wrap page numbers in styled spans and add space before first number."""
        text = match.group(0)
        # Split by comma, keeping the spacing
        parts = re.split(r'(\d+)', text)
        result = []
        for i, part in enumerate(parts):
            if part.isdigit():
                # Add space before first number if missing
                if i == 1 and result and result[-1] and not result[-1].endswith(' '):
                    result.append(' ')
                # Style as a page reference (non-clickable, just visual)
                result.append(f'<span class="page-ref" title="Page {part} in print edition">{part}</span>')
            else:
                result.append(part)
        return ''.join(result)

    # Match sequences of page numbers at end of index entries
    content = re.sub(r'(?<=[a-z\.\)])(\s*)(\d{1,3}(?:\s*,\s*\d{1,3})*)\s*(?=</p>|<br)',
                     lambda m: style_page_numbers(m), content)

    return content


def fix_html(filepath):
    """Process a single HTML file."""
    filename = os.path.basename(filepath)
    dist_dir = os.path.dirname(filepath)

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove any existing navigation elements
    content = re.sub(r"<nav[^>]*class=['\"]book-nav['\"][^>]*>.*?</nav>", "", content, flags=re.DOTALL)
    content = re.sub(r"<nav[^>]*class=['\"]top-nav['\"][^>]*>.*?</nav>", "", content, flags=re.DOTALL)
    content = re.sub(r"<aside[^>]*class=['\"]sidebar['\"][^>]*>.*?</aside>", "", content, flags=re.DOTALL)
    content = re.sub(r"<div[^>]*class=['\"]sidebar-overlay['\"][^>]*>.*?</div>", "", content, flags=re.DOTALL)
    content = re.sub(r"<button[^>]*class=['\"]menu-toggle['\"][^>]*>.*?</button>", "", content, flags=re.DOTALL)
    content = re.sub(r"<script[^>]*theme-toggle[^>]*></script>", "", content)
    content = re.sub(r"<script[^>]*search\.js[^>]*></script>", "", content)
    content = re.sub(r"<div[^>]*class=['\"]book-nav['\"][^>]*>.*?</div>", "", content, flags=re.DOTALL)
    content = re.sub(r"<p>\s*</p>", "", content)

    # Remove existing main-content wrappers (to allow re-running)
    content = re.sub(r"<main[^>]*class=['\"]main-content['\"][^>]*>\s*<div[^>]*class=['\"]content-wrapper['\"][^>]*>", "", content)
    content = re.sub(r"</div>\s*</main>", "", content)

    # Fix accented characters in small caps names
    content = fix_small_caps_accents(content)

    # Fix index page numbers to be styled as references
    content = fix_index_hyperlinks(content, filename)

    # Remove duplicate Bibliography entry in TOC (tex4ht generates two)
    # Keep only the one pointing to bibliography.html, remove the one pointing to Developerinterface.html#bibliography
    content = re.sub(r"<br\s*/>\s*<span[^>]*class=['\"]chapterToc['\"][^>]*>\s*<a[^>]*href=['\"]Developerinterface\.html#bibliography['\"][^>]*>Bibliography</a></span>", "", content)

    # Clean up multiple newlines
    content = re.sub(r"\n\s*\n\s*\n", "\n\n", content)

    # Add top nav after <body>
    top_nav = get_top_nav_html()
    sidebar = get_sidebar_html(filename, dist_dir)
    content = re.sub(
        r'(<body[^>]*>)',
        r'\1\n' + top_nav + sidebar + '<main class="main-content"><div class="content-wrapper">',
        content
    )

    # Add closing wrappers and floating buttons before </body>
    floating_buttons = get_floating_buttons_html()
    content = content.replace(
        "</body>",
        '</div></main>\n' + floating_buttons + '</body>'
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        fix_html(sys.argv[1])
