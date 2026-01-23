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

# Run make4ht conversion (split into chapters with "2" option in book.cfg)
echo -e "${YELLOW}Running LaTeX to HTML conversion...${NC}"

# First, run makeglossaries if .glo file exists from previous run
if [ -f "main.glo" ]; then
    echo -e "${YELLOW}Building glossary...${NC}"
    makeglossaries main 2>/dev/null || true
fi

make4ht -c book.cfg -e build.mk4 -l "$MAIN_FILE" "html5,mathjax,svg" 2>&1 | tee build.log

# Run makeglossaries again after first pass
if [ -f "main.glo" ]; then
    echo -e "${YELLOW}Building glossary (second pass)...${NC}"
    makeglossaries main 2>/dev/null || true
    # Run make4ht again to incorporate glossary
    make4ht -c book.cfg -e build.mk4 -l "$MAIN_FILE" "html5,mathjax,svg" 2>&1 | tee -a build.log
fi

# Move generated files to output directory
echo -e "${YELLOW}Organizing output files...${NC}"
mv *.html "$OUTPUT_DIR/" 2>/dev/null || true
cp swarm-book.css "$OUTPUT_DIR/"
cp theme-toggle.js "$OUTPUT_DIR/"
cp main.css "$OUTPUT_DIR/" 2>/dev/null || true
# Copy any additional CSS files generated
cp main*.css "$OUTPUT_DIR/" 2>/dev/null || true

# Copy any generated images
mv *.svg "$OUTPUT_DIR/" 2>/dev/null || true
mv *.png "$OUTPUT_DIR/" 2>/dev/null || true

# Copy doclicense image
if [ -f ~/Library/TinyTeX/texmf-dist/tex/latex/doclicense/images/doclicense-CC-by-nc-sa-88x31.pdf ]; then
    pdf2svg ~/Library/TinyTeX/texmf-dist/tex/latex/doclicense/images/doclicense-CC-by-nc-sa-88x31.pdf "$OUTPUT_DIR/doclicense-CC-by-nc-sa-88x31.svg" 2>/dev/null || true
fi

# Clean up stray text at beginning of HTML files
for htmlfile in "$OUTPUT_DIR"/*.html; do
    if [ -f "$htmlfile" ]; then
        sed -i '' "s/^<span class='futr8t-x-x-120'>refextract<\/span>//" "$htmlfile" 2>/dev/null || true
    fi
done

# Fix theme toggle - remove all existing nav/script and add clean version before </body>
echo -e "${YELLOW}Fixing theme toggle...${NC}"
for htmlfile in "$OUTPUT_DIR"/*.html; do
    if [ -f "$htmlfile" ]; then
        python3 fix-theme-toggle.py "$htmlfile"
    fi
done

# Fix image references: replace .png/.pdf with .svg for figures
echo -e "${YELLOW}Fixing image references...${NC}"
for htmlfile in "$OUTPUT_DIR"/*.html; do
    if [ -f "$htmlfile" ]; then
        # Replace fig/*.png and fig/*.pdf references with fig/*.svg
        sed -i '' "s|fig/\([^'\"]*\)\.png|fig/\1.svg|g" "$htmlfile" 2>/dev/null || true
        sed -i '' "s|fig/\([^'\"]*\)\.pdf|fig/\1.svg|g" "$htmlfile" 2>/dev/null || true
        # Remove any double hyphens that might have been introduced
        sed -i '' "s|--\.svg|-\.svg|g" "$htmlfile" 2>/dev/null || true
        # Fix trailing hyphen before .svg (from tex4ht quirk)
        sed -i '' "s|-\.svg|.svg|g" "$htmlfile" 2>/dev/null || true
    fi
done

# Rename files to remove status markers from filenames
echo -e "${YELLOW}Cleaning up filenames...${NC}"
cd "$OUTPUT_DIR"
shopt -s nullglob
for file in *statusgreen*.html *statusorange*.html *statusred*.html *statusyellow*.html; do
    if [ -f "$file" ]; then
        newname=$(echo "$file" | sed 's/statusgreen//g; s/statusorange//g; s/statusred//g; s/statusyellow//g')
        if [ "$file" != "$newname" ]; then
            mv "$file" "$newname"
            echo "  Renamed: $file -> $newname"
            # Update references in all HTML files
            for htmlfile in *.html; do
                sed -i '' "s|$file|$newname|g" "$htmlfile" 2>/dev/null || true
            done
        fi
    fi
done
shopt -u nullglob

# Rename garbled bibliography filename (tex4ht MakeUppercase issue)
if [ -f "bibnamemkbothMakeUppercasebibnameMakeUppercasebibname.html" ]; then
    echo "  Renaming bibliography file..."
    mv "bibnamemkbothMakeUppercasebibnameMakeUppercasebibname.html" "bibliography.html"
    # Update references in all HTML files
    for htmlfile in *.html; do
        sed -i '' "s|bibnamemkbothMakeUppercasebibnameMakeUppercasebibname\.html|bibliography.html|g" "$htmlfile" 2>/dev/null || true
    done
fi

cd - > /dev/null

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
