#!/usr/bin/env node
/**
 * Build full-text search index for Book of Swarm
 * Creates a Lunr.js compatible index from HTML content
 */

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const OUTPUT_FILE = path.join(DIST_DIR, 'search-index.json');

// Content pages to index (skip navigation pages, glossary, etc.)
const CONTENT_FILES = [
    'Theevolution.html',
    'Network.html',
    'Incentives.html',
    'BuildingontheDISC.html',
    'Persistence.html',
    'Developerinterface.html',
    'Prolegomena.html',
    'Acknowledgments.html'
];

function stripHtml(html) {
    return html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '') // Remove sidebar
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#\d+;/g, ' ')
        .replace(/&[a-z]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractSections(html, filename) {
    const sections = [];

    // Find all headings with their IDs and content
    // Match h2, h3, h4 headings
    const headingRegex = /<h([234])[^>]*(?:id=['"]([^'"]+)['"])?[^>]*>([\s\S]*?)<\/h\1>/gi;

    let lastIndex = 0;
    let lastHeading = { level: 2, id: '', title: 'Introduction', index: 0 };
    const headings = [];

    let match;
    while ((match = headingRegex.exec(html)) !== null) {
        const level = parseInt(match[1]);
        const id = match[2] || '';
        const titleHtml = match[3];
        const title = stripHtml(titleHtml).replace(/^\d+(\.\d+)*\s*/, '').trim(); // Remove section numbers

        if (title && title.length > 1) {
            headings.push({
                level,
                id,
                title,
                index: match.index
            });
        }
    }

    // Extract content between headings
    for (let i = 0; i < headings.length; i++) {
        const current = headings[i];
        const next = headings[i + 1];

        const startIndex = current.index;
        const endIndex = next ? next.index : html.length;

        const sectionHtml = html.substring(startIndex, endIndex);
        const content = stripHtml(sectionHtml);

        // Only index sections with meaningful content
        if (content.length > 50) {
            sections.push({
                id: `${filename}#${current.id}`,
                file: filename,
                anchor: current.id,
                title: current.title,
                content: content.substring(0, 1000), // Limit content size
                preview: content.substring(0, 200).trim() + '...'
            });
        }
    }

    // If no sections found, index the whole page
    if (sections.length === 0) {
        const content = stripHtml(html);
        if (content.length > 50) {
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].replace(' - Book of Swarm', '').trim() : filename;

            sections.push({
                id: filename,
                file: filename,
                anchor: '',
                title: title,
                content: content.substring(0, 1000),
                preview: content.substring(0, 200).trim() + '...'
            });
        }
    }

    return sections;
}

function buildIndex() {
    const documents = [];

    for (const file of CONTENT_FILES) {
        const filepath = path.join(DIST_DIR, file);
        if (fs.existsSync(filepath)) {
            console.log(`Processing ${file}...`);
            const html = fs.readFileSync(filepath, 'utf-8');
            const sections = extractSections(html, file);
            console.log(`  Found ${sections.length} sections`);
            documents.push(...sections);
        } else {
            console.log(`  Skipping ${file} (not found)`);
        }
    }

    console.log(`\nTotal: ${documents.length} searchable sections`);

    // Create the index data structure
    const indexData = {
        documents: documents,
        // Pre-build a simple inverted index for faster search
        index: buildInvertedIndex(documents)
    };

    const json = JSON.stringify(indexData);
    fs.writeFileSync(OUTPUT_FILE, json);

    console.log(`Index size: ${(json.length / 1024).toFixed(1)} KB`);
    console.log(`Wrote to ${OUTPUT_FILE}`);
}

function buildInvertedIndex(documents) {
    const index = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has',
        'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
        'that', 'this', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we', 'our',
        'you', 'your', 'he', 'she', 'his', 'her', 'which', 'who', 'whom', 'what', 'where', 'when',
        'how', 'why', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
        'no', 'not', 'only', 'same', 'so', 'than', 'too', 'very', 'can', 'just', 'into', 'also']);

    documents.forEach((doc, docIndex) => {
        const text = (doc.title + ' ' + doc.content).toLowerCase();
        const words = text.match(/\b[a-z]{3,}\b/g) || [];

        const seen = new Set();
        words.forEach(word => {
            if (!stopWords.has(word) && !seen.has(word)) {
                seen.add(word);
                if (!index[word]) {
                    index[word] = [];
                }
                index[word].push(docIndex);
            }
        });
    });

    return index;
}

buildIndex();
