#!/usr/bin/env python3
"""
Post-process HTML files for Book of Swarm.
- Adds top navigation bar
- Adds sidebar with table of contents
- Adds theme toggle and back-to-top buttons
- Wraps content in proper layout containers
"""

import sys
import re
import os

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
    """Generate the top navigation bar HTML."""
    return '''<nav class="top-nav">
  <a href="main.html" class="nav-brand">
    <span class="nav-brand-icon">S</span>
    <span>Book of Swarm</span>
  </a>
  <div class="nav-links">
    <a href="main.html" class="nav-link">Home</a>
    <a href="contentsname.html" class="nav-link">Contents</a>
    <a href="glossarytitle.html" class="nav-link">Glossary</a>
  </div>
  <div class="nav-controls">
    <button class="menu-toggle" aria-label="Toggle menu">☰</button>
  </div>
</nav>
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
  <div class="sidebar-section">
    <div class="sidebar-title">Navigation</div>
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
