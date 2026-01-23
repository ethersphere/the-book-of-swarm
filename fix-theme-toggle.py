#!/usr/bin/env python3
"""Fix theme toggle in HTML files - remove duplicates and add clean version."""

import sys
import re

def fix_theme_toggle(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove any existing book-nav elements (handles both quote styles)
    content = re.sub(r"<nav[^>]*class=['\"]book-nav['\"][^>]*>.*?</nav>", "", content, flags=re.DOTALL)

    # Remove any existing theme-toggle script tags
    content = re.sub(r"<script[^>]*theme-toggle[^>]*></script>", "", content)

    # Remove empty p tags that may be left over
    content = re.sub(r"<p>\s*</p>", "", content)

    # Clean up multiple newlines
    content = re.sub(r"\n\s*\n\s*\n", "\n\n", content)

    # Add clean theme toggle before </body>
    nav_html = '''<nav class="book-nav">
  <button id="theme-toggle" aria-label="Toggle dark mode">
    <span class="theme-icon"></span>
  </button>
</nav>
<script src="theme-toggle.js"></script>
'''
    content = content.replace("</body>", nav_html + "</body>")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        fix_theme_toggle(sys.argv[1])
