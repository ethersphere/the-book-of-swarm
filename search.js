// Book of Swarm - Full-text Search
// Lightweight client-side search using pre-built index

(function() {
    'use strict';

    var searchIndex = null;
    var searchInput = null;
    var searchResults = null;
    var searchContainer = null;

    // Load the search index
    function loadIndex() {
        if (searchIndex) return Promise.resolve(searchIndex);

        return fetch('search-index.json')
            .then(function(response) {
                if (!response.ok) throw new Error('Failed to load search index');
                return response.json();
            })
            .then(function(data) {
                searchIndex = data;
                return data;
            })
            .catch(function(err) {
                console.error('Search index load error:', err);
                return null;
            });
    }

    // Perform search
    function search(query) {
        if (!searchIndex || !query || query.length < 2) {
            return [];
        }

        var terms = query.toLowerCase().split(/\s+/).filter(function(t) {
            return t.length >= 2;
        });

        if (terms.length === 0) return [];

        // Find documents matching all terms
        var matchingDocs = null;

        terms.forEach(function(term) {
            var termMatches = new Set();

            // Check inverted index for exact and prefix matches
            Object.keys(searchIndex.index).forEach(function(word) {
                if (word === term || word.startsWith(term)) {
                    searchIndex.index[word].forEach(function(docIdx) {
                        termMatches.add(docIdx);
                    });
                }
            });

            if (matchingDocs === null) {
                matchingDocs = termMatches;
            } else {
                // Intersection - docs must match all terms
                var intersection = new Set();
                matchingDocs.forEach(function(docIdx) {
                    if (termMatches.has(docIdx)) {
                        intersection.add(docIdx);
                    }
                });
                matchingDocs = intersection;
            }
        });

        if (!matchingDocs || matchingDocs.size === 0) {
            return [];
        }

        // Get documents and score them
        var results = [];
        matchingDocs.forEach(function(docIdx) {
            var doc = searchIndex.documents[docIdx];
            var score = 0;

            // Score based on matches in title vs content
            var titleLower = doc.title.toLowerCase();
            var contentLower = doc.content.toLowerCase();

            terms.forEach(function(term) {
                if (titleLower.includes(term)) score += 10;
                var contentMatches = (contentLower.match(new RegExp(term, 'g')) || []).length;
                score += contentMatches;
            });

            results.push({
                doc: doc,
                score: score
            });
        });

        // Sort by score
        results.sort(function(a, b) {
            return b.score - a.score;
        });

        return results.slice(0, 10).map(function(r) { return r.doc; });
    }

    // Highlight matching terms in text
    function highlight(text, query) {
        var terms = query.toLowerCase().split(/\s+/).filter(function(t) {
            return t.length >= 2;
        });

        var result = text;
        terms.forEach(function(term) {
            var regex = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        });
        return result;
    }

    // Render search results
    function renderResults(results, query) {
        if (!searchResults) return;

        if (results.length === 0) {
            if (query && query.length >= 2) {
                searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
            } else {
                searchResults.innerHTML = '';
            }
            searchResults.classList.remove('active');
            return;
        }

        var html = results.map(function(doc) {
            var url = doc.anchor ? doc.file + '#' + doc.anchor : doc.file;
            var preview = highlight(doc.preview, query);
            var title = highlight(doc.title, query);

            return '<a href="' + url + '" class="search-result-item">' +
                '<div class="search-result-title">' + title + '</div>' +
                '<div class="search-result-preview">' + preview + '</div>' +
                '</a>';
        }).join('');

        searchResults.innerHTML = html;
        searchResults.classList.add('active');
    }

    // Debounce function
    function debounce(func, wait) {
        var timeout;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(function() {
                func.apply(context, args);
            }, wait);
        };
    }

    // Handle search input
    var handleSearch = debounce(function() {
        var query = searchInput.value.trim();

        if (query.length < 2) {
            renderResults([], '');
            return;
        }

        loadIndex().then(function() {
            var results = search(query);
            renderResults(results, query);
        });
    }, 150);

    // Create search UI
    function createSearchUI() {
        // Find sidebar
        var sidebar = document.querySelector('.sidebar-section');
        if (!sidebar) return;

        // Create search container
        searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';

        searchContainer.innerHTML =
            '<div class="search-input-wrapper">' +
            '<input type="text" class="search-input" placeholder="Search..." aria-label="Search">' +
            '<span class="search-icon">&#128269;</span>' +
            '</div>' +
            '<div class="search-results"></div>';

        // Insert before the navigation
        sidebar.insertBefore(searchContainer, sidebar.firstChild);

        searchInput = searchContainer.querySelector('.search-input');
        searchResults = searchContainer.querySelector('.search-results');

        // Event listeners
        searchInput.addEventListener('input', handleSearch);

        searchInput.addEventListener('focus', function() {
            if (searchInput.value.trim().length >= 2) {
                searchResults.classList.add('active');
            }
            // Preload index on focus
            loadIndex();
        });

        // Close results when clicking outside
        document.addEventListener('click', function(e) {
            if (!searchContainer.contains(e.target)) {
                searchResults.classList.remove('active');
            }
        });

        // Keyboard navigation
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                searchResults.classList.remove('active');
                searchInput.blur();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                var firstResult = searchResults.querySelector('.search-result-item');
                if (firstResult) firstResult.focus();
            }
        });

        searchResults.addEventListener('keydown', function(e) {
            var items = searchResults.querySelectorAll('.search-result-item');
            var current = document.activeElement;
            var index = Array.prototype.indexOf.call(items, current);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (index < items.length - 1) items[index + 1].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (index > 0) items[index - 1].focus();
                else searchInput.focus();
            } else if (e.key === 'Escape') {
                searchResults.classList.remove('active');
                searchInput.focus();
            }
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createSearchUI);
    } else {
        createSearchUI();
    }
})();
