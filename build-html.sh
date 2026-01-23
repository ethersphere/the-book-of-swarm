#!/bin/bash
# Build script for converting Book of Swarm to static HTML
# Produces output suitable for hosting on Swarm decentralized storage

set -e

# Configuration
TEX_PATH="$HOME/Library/TinyTeX/bin/universal-darwin"
OUTPUT_DIR="dist"
MAIN_FILE="main.tex"

# Add TeX to PATH
export PATH="$TEX_PATH:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Book of Swarm HTML Build ===${NC}"

# Check dependencies
echo -e "${YELLOW}Checking dependencies...${NC}"
command -v make4ht >/dev/null 2>&1 || { echo -e "${RED}make4ht not found. Install with: tlmgr install make4ht${NC}"; exit 1; }

# Clean previous build
echo -e "${YELLOW}Cleaning previous build...${NC}"
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Convert figures from PDF to SVG (if pdf2svg is available)
if command -v pdf2svg >/dev/null 2>&1; then
    echo -e "${YELLOW}Converting PDF figures to SVG...${NC}"
    mkdir -p "$OUTPUT_DIR/fig"
    for pdf in fig/*.pdf; do
        if [ -f "$pdf" ]; then
            base=$(basename "$pdf" .pdf)
            echo "  Converting: $base.pdf -> $base.svg"
            pdf2svg "$pdf" "$OUTPUT_DIR/fig/$base.svg" 2>/dev/null || echo "  Warning: Failed to convert $base.pdf"
        fi
    done
else
    echo -e "${YELLOW}pdf2svg not found. Figures will remain as PDF.${NC}"
    cp -r fig "$OUTPUT_DIR/"
fi

# Run make4ht conversion
echo -e "${YELLOW}Running LaTeX to HTML conversion...${NC}"
make4ht -c book.cfg -e build.mk4 "$MAIN_FILE" "html5,mathjax" 2>&1 | tee build.log

# Move generated files to output directory
echo -e "${YELLOW}Organizing output files...${NC}"
mv *.html "$OUTPUT_DIR/" 2>/dev/null || true
cp swarm-book.css "$OUTPUT_DIR/"
cp theme-toggle.js "$OUTPUT_DIR/" 2>/dev/null || true
cp main.css "$OUTPUT_DIR/" 2>/dev/null || true

# Copy any generated images
mv *.svg "$OUTPUT_DIR/" 2>/dev/null || true
mv *.png "$OUTPUT_DIR/" 2>/dev/null || true

# Clean up stray text at beginning of HTML files
for htmlfile in "$OUTPUT_DIR"/*.html; do
    if [ -f "$htmlfile" ]; then
        sed -i '' "s/^<span class='futr8t-x-x-120'>refextract<\/span>//" "$htmlfile" 2>/dev/null || true
    fi
done

# Add fixed theme toggle at end of body (before </body>)
for htmlfile in "$OUTPUT_DIR"/*.html; do
    if [ -f "$htmlfile" ] && grep -q "</body>" "$htmlfile"; then
        sed -i '' 's|</body>|<nav class="book-nav"><button id="theme-toggle" aria-label="Toggle dark mode" onclick="(function(){var t=document.documentElement.getAttribute('\''data-theme'\'')==='\'light'\''?'\''dark'\'':'\'light'\'';document.documentElement.setAttribute('\''data-theme'\'',t);localStorage.setItem('\''theme'\'',t);})()"><span class="theme-icon"></span></button></nav></body>|' "$htmlfile" 2>/dev/null || true
    fi
done

# Fix image references: replace .png with .svg for figures
echo -e "${YELLOW}Fixing image references...${NC}"
for htmlfile in "$OUTPUT_DIR"/*.html; do
    if [ -f "$htmlfile" ]; then
        # Replace fig/*.png references with fig/*.svg
        sed -i '' "s|fig/\([^'\"]*\)-.png|fig/\1.svg|g" "$htmlfile" 2>/dev/null || true
        sed -i '' "s|fig/\([^'\"]*\).png|fig/\1.svg|g" "$htmlfile" 2>/dev/null || true
    fi
done

# Create index.html that redirects to main content
if [ -f "$OUTPUT_DIR/main.html" ]; then
    cat > "$OUTPUT_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=main.html">
    <title>The Book of Swarm</title>
</head>
<body>
    <p>Redirecting to <a href="main.html">The Book of Swarm</a>...</p>
</body>
</html>
EOF
fi

# Clean up auxiliary files
echo -e "${YELLOW}Cleaning up auxiliary files...${NC}"
rm -f *.aux *.log *.4ct *.4tc *.dvi *.idv *.lg *.tmp *.xref *.glo *.gls *.glg *.ist 2>/dev/null || true

echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "Output in: ${YELLOW}$OUTPUT_DIR/${NC}"
echo ""
echo "To preview locally:"
echo "  cd $OUTPUT_DIR && python3 -m http.server 8080"
echo ""
echo "Then open: http://localhost:8080/"
