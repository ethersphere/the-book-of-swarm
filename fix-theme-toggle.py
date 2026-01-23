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

# Navigation structure for the book
NAV_STRUCTURE = [
    {"title": "Home", "href": "main.html", "type": "home"},
    {"title": "Contents", "href": "contentsname.html", "type": "chapter"},
    {"title": "Figures", "href": "listfigurename.html", "type": "chapter"},
    {"title": "Prolegomena", "href": "Prolegomena.html", "type": "chapter"},
    {"title": "Acknowledgments", "href": "Acknowledgments.html", "type": "chapter"},
    {"title": "Part I: Prelude", "href": "Prelude.html", "type": "part"},
    {"title": "1. The Evolution", "href": "Theevolution.html", "type": "chapter"},
    {"title": "Part II: Design", "href": "Designandarchitecture.html", "type": "part"},
    {"title": "2. Network", "href": "Network.html", "type": "chapter"},
    {"title": "3. Incentives", "href": "Incentives.html", "type": "chapter"},
    {"title": "4. Building on DISC", "href": "BuildingontheDISC.html", "type": "chapter"},
    {"title": "5. Persistence", "href": "Persistence.html", "type": "chapter"},
    {"title": "6. Developer Interface", "href": "Developerinterface.html", "type": "chapter"},
    {"title": "Part III: Indexes", "href": "Indexes.html", "type": "part"},
    {"title": "Glossary", "href": "glossarytitle.html", "type": "chapter"},
    {"title": "Index", "href": "glossarytitle1.html", "type": "chapter"},
    {"title": "Acronyms", "href": "glossarytitle2.html", "type": "chapter"},
]

def get_top_nav_html():
    """Generate mobile menu toggle and overlay (no top nav bar)."""
    return '''<button class="menu-toggle" aria-label="Toggle menu">☰</button>
<div class="sidebar-overlay"></div>
'''

def get_sidebar_html(current_file):
    """Generate the sidebar navigation HTML."""
    items = []
    for nav in NAV_STRUCTURE:
        css_class = "part-item" if nav["type"] == "part" else "chapter-item"
        active = "active" if nav["href"] == current_file else ""
        items.append(f'<li><a href="{nav["href"]}" class="{css_class} {active}">{nav["title"]}</a></li>')

    nav_items = "\n    ".join(items)

    return f'''<aside class="sidebar">
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

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove any existing navigation elements
    content = re.sub(r"<nav[^>]*class=['\"]book-nav['\"][^>]*>.*?</nav>", "", content, flags=re.DOTALL)
    content = re.sub(r"<nav[^>]*class=['\"]top-nav['\"][^>]*>.*?</nav>", "", content, flags=re.DOTALL)
    content = re.sub(r"<aside[^>]*class=['\"]sidebar['\"][^>]*>.*?</aside>", "", content, flags=re.DOTALL)
    content = re.sub(r"<div[^>]*class=['\"]sidebar-overlay['\"][^>]*>.*?</div>", "", content, flags=re.DOTALL)
    content = re.sub(r"<script[^>]*theme-toggle[^>]*></script>", "", content)
    content = re.sub(r"<p>\s*</p>", "", content)

    # Fix accented characters in small caps names
    content = fix_small_caps_accents(content)

    # Fix index page numbers to be styled as references
    content = fix_index_hyperlinks(content, filename)

    # Clean up multiple newlines
    content = re.sub(r"\n\s*\n\s*\n", "\n\n", content)

    # Add top nav after <body>
    top_nav = get_top_nav_html()
    sidebar = get_sidebar_html(filename)
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
