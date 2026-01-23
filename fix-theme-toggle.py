#!/usr/bin/env python3
"""
Post-process HTML files for Book of Swarm.
- Adds top navigation bar
- Adds sidebar with table of contents
- Adds theme toggle and back-to-top buttons
- Wraps content in proper layout containers
- Fixes squashed text from tex4ht font handling
- Converts index page numbers to hyperlinks
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

# Common squashed words that need fixing
SQUASHED_FIXES = [
    # Title and headers
    (r'THEBOOKOFSWARM', 'THE BOOK OF SWARM'),
    (r'thebookofswarm', 'the book of swarm'),
    (r'theswarmisheadedtowardus', 'the swarm is headed toward us'),

    # Contents and chapter titles - these appear in TOC
    (r'BitTorrentanditslimits', 'BitTorrent and its limits'),
    (r'Fromtheinternettothewebandback', 'From the internet to the web and back'),
    (r'Towardsfairdataeconomy', 'Towards fair data economy'),
    (r'Datasovereigntyandpersonalinformation', 'Data sovereignty and personal information'),
    (r'Swarmandtheneweconomy', 'Swarm and the new economy'),
    (r'Aboutthestructureofthisbook', 'About the structure of this book'),
    (r'Peer-to-peernetworks', 'Peer-to-peer networks'),
    (r'Thecurrentstateofthedataeconomy', 'The current state of the data economy'),
    (r'Thecurrentstateandissuesofdatasovereignty', 'The current state and issues of data sovereignty'),
    (r'Towardsself-sovereigndata', 'Towards self-sovereign data'),
    (r'Artificialintelligenceandself-sovereigndata', 'Artificial intelligence and self-sovereign data'),
    (r'Theevolutionoftheweb', 'The evolution of the web'),
    (r'Swarmdesignandarchitecture', 'Swarm design and architecture'),
    (r'Buildingonthedistributedimmutablestoreforchunks', 'Building on the distributed immutable store for chunks'),
    (r'Messageexchangeoverswarm', 'Message exchange over swarm'),
    (r'Privatemessagingoverpublicswarm', 'Private messaging over public swarm'),
    (r'Pricingprotocolforchunkretrieval', 'Pricing protocol for chunk retrieval'),
    (r'Chequeoffchaincommitmentstopay', 'Cheque off-chain commitments to pay'),
    (r'Web1\.0', 'Web 1.0'),
    (r'>Web1\.0<', '>Web 1.0<'),

    # Acronyms - these commonly get squashed
    (r'accesscontrol\.', 'access control.'),
    (r'accesscontroltrie\.', 'access control trie.'),
    (r'binarymerkletree\.', 'binary merkle tree.'),
    (r'binarymerkletreechunk\.', 'binary merkle tree chunk.'),
    (r'binarymerkletreehash\.', 'binary merkle tree hash.'),
    (r'distributedhashtable\.', 'distributed hash table.'),
    (r'distributedimmutablestoreforchunks\.', 'distributed immutable store for chunks.'),
    (r'distributedwebapplication\.', 'distributed web application.'),
    (r'ellipticcurveDiffie-Hellman\.', 'elliptic curve Diffie-Hellman.'),
    (r'EthereumNameService\.', 'Ethereum Name Service.'),
    (r'EthereumVirtualMachine\.', 'Ethereum Virtual Machine.'),
    (r'extendedtripleDiffie-Hellmannkeyexchange\.', 'extended triple Diffie-Hellmann key exchange.'),
    (r'proofofcustody\.', 'proof of custody.'),
    (r'proofofwork\.', 'proof of work.'),
    (r'singleownerchunk\.', 'single owner chunk.'),
    (r'transportlayersecurity\.', 'transport layer security.'),
]

def fix_squashed_text(content):
    """Fix squashed text by adding spaces where needed."""
    # Apply specific known fixes
    for pattern, replacement in SQUASHED_FIXES:
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)

    # Fix lowercase letter followed immediately by a number in INDEX ENTRIES ONLY
    # Pattern: after </a> tag, word followed by number(s) before </p>
    # This is for entries like "accesscontrol51,427" -> "accesscontrol 51,427"
    # We need to be careful not to break filenames like main0x.svg
    def fix_index_numbers(match):
        text = match.group(0)
        # Only add space if this looks like an index entry (ends before </p>)
        # and doesn't look like a filename (no .svg, .html, .css, etc)
        if any(ext in text for ext in ['.svg', '.html', '.css', '.js', '.pdf', '.png']):
            return text
        # Add space between word and number
        return re.sub(r'([a-z])(\d{1,3}(?:,\s*\d{1,3})*)\s*(?=</p>)', r'\1 \2', text)

    # Apply to content after </a> tags (index entries)
    content = re.sub(r'</a>[^<]+</p>', fix_index_numbers, content)

    # Fix common squashed patterns in glossary/index entries
    # Pattern: >wordword< where there should be spaces (in index entries after anchor tags)
    # Look for patterns like </a>wordword where camelCase or common word boundaries exist

    # Common word boundaries that get squashed
    word_fixes = [
        # Index entries (preceded by </a>)
        (r'(</a>)access\s*control(?=\s)', r'\1access control'),
        (r'(</a>)anonymous\s*uploads(?=\s)', r'\1anonymous uploads'),
        (r'(</a>)batch\s*depth(?=\s)', r'\1batch depth'),
        (r'(</a>)bzz\s*network\s*ID(?=\s)', r'\1bzz network ID'),
        (r'(</a>)garbage\s*collection(?=\s)', r'\1garbage collection'),
        (r'(</a>)free\s*riding(?=\s)', r'\1free riding'),
        (r'(</a>)future\s*secrecy(?=\s)', r'\1future secrecy'),
        (r'(</a>)deep\s*bin(?=\s)', r'\1deep bin'),
        (r'(</a>)collision\s*slot(?=\s)', r'\1collision slot'),
        (r'(</a>)encrypted\s*reference(?=\s)', r'\1encrypted reference'),
        (r'(</a>)eventual\s*consistency(?=\s)', r'\1eventual consistency'),
        (r'(</a>)content\s*addressed\s*chunk(?=\s)', r'\1content addressed chunk'),

        # Without the anchor prefix for acronyms page
        (r'>accesscontrol\.', r'>access control.'),
        (r'>accesscontroltrie\.', r'>access control trie.'),
        (r'>anonymousuploads', r'>anonymous uploads'),
        (r'>batchdepth', r'>batch depth'),
        (r'>bzznetworkID', r'>bzz network ID'),
        (r'>garbagecollection', r'>garbage collection'),
        (r'>freeriding', r'>free riding'),
        (r'>futuresecrecy', r'>future secrecy'),
        (r'>deepbin', r'>deep bin'),
        (r'>collisionslot', r'>collision slot'),
        (r'>encryptedreference', r'>encrypted reference'),
        (r'>eventualconsistency', r'>eventual consistency'),
        (r'>contentaddressedchunk', r'>content addressed chunk'),
        (r'>distributedimmutablestoreforchunks', r'>distributed immutable store for chunks'),
        (r'>distributedhashtable', r'>distributed hash table'),
        (r'>distributedwebapplication', r'>distributed web application'),
        (r'>binarymerkletree', r'>binary merkle tree'),
        (r'>binarymerkletreechunk', r'>binary merkle tree chunk'),
        (r'>binarymerkletreehash', r'>binary merkle tree hash'),
        (r'>ellipticcurvediffie', r'>elliptic curve diffie'),
        (r'>ethereumnameservice', r'>ethereum name service'),
        (r'>ethereumvirtualmachine', r'>ethereum virtual machine'),
        (r'>singleownerchunk', r'>single owner chunk'),
        (r'>proofofcustody', r'>proof of custody'),
        (r'>proofofwork', r'>proof of work'),
        (r'>transportlayersecurity', r'>transport layer security'),
    ]

    for pattern, replacement in word_fixes:
        content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)

    return content

def fix_index_hyperlinks(content, filename):
    """Convert page numbers in index/glossary to hyperlinks."""
    if 'glossarytitle' not in filename:
        return content

    # Pattern to match: term followed by page numbers like "51, 427, 429, 451"
    # We need to convert each page number to a link
    # The links should point to the appropriate section

    def make_page_links(match):
        """Convert comma-separated page numbers to links."""
        text = match.group(0)
        # Split by comma, keeping the spacing
        parts = re.split(r'(\d+)', text)
        result = []
        for part in parts:
            if part.isdigit():
                # Create a link - unfortunately we can't know exact anchors
                # So we'll make them visually distinct but not functional links
                # In a real scenario, we'd need a mapping from page numbers to HTML anchors
                result.append(f'<span class="page-ref">{part}</span>')
            else:
                result.append(part)
        return ''.join(result)

    # Match sequences of page numbers at end of index entries
    # Pattern: space followed by numbers and commas
    content = re.sub(r'(?<=[a-z\.\)])(\s+)(\d{1,3}(?:\s*,\s*\d{1,3})*)\s*(?=</p>|<br)',
                     lambda m: m.group(1) + make_page_links(m), content)

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

    # Fix squashed text (must be done before adding navigation)
    content = fix_squashed_text(content)

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
