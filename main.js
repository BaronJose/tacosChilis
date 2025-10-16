// --- MENU LOGIC ---
(function () {
    // --- CONFIGURATION ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvCiqSXwFy0Gi34bsv32U2vzn6dzXVbzaHbm6qxA-H2EegRqTG2m7JtmtMHHAW4toNWm0Qtd4wWRhm/pub?output=csv';
    const placeholderImage = 'https://via.placeholder.com/400x300?text=Taco';
    const DESKTOP_BREAKPOINT = 769; // Set the width for desktop view

    // --- DOM ELEMENTS ---
    const menuContainer = document.getElementById('menu');
    const specialsRibbon = document.getElementById('specialsRibbon');
    const refreshBtn = document.getElementById('refreshMenuBtn');

    // --- UTILITY FUNCTIONS ---
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    }

    // --- CORE FUNCTIONS ---
    function loadMenuData() {
        // Show a loading state if needed
        menuContainer.innerHTML = '<div style="text-align:center;padding:30px;">Loading menu...</div>';
        const url = `${SHEET_URL}&cacheBust=${Date.now()}`;

        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                // FIX: Centralize the function calls after data is loaded
                const processedData = processData(results.data);
                renderMenu(processedData.categories);
                updateSpecialsRibbon(processedData.specials);
                updateLayout(true); // Force initial layout check
            },
            error: function () {
                menuContainer.innerHTML = '<div style="color:red;text-align:center;padding:30px;">Error loading menu. Please try again.</div>';
            }
        });
    }

    function processData(data) {
        const categories = {};
        const specials = [];

        data.forEach(function (row) {
            // Normalize all header keys to lowercase for consistency
            const item = {};
            for (const key in row) {
                item[key.toLowerCase()] = row[key];
            }

            const category = item.category;
            if (!category || !item.item) return; // Skip rows without a category or item name

            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(item);

            if (item.special && item.special.toLowerCase() === 'yes') {
                specials.push(item);
            }
        });

        return { categories, specials };
    }

    // FIX: Completely rewritten renderMenu function to be correct and efficient.
    function renderMenu(categories) {
        let html = '';
        Object.keys(categories).forEach(function (cat) {
            html += '<section class="menu-section">';
            html += `<div class="menu-category">
                        <button class="menu-category-button" aria-expanded="false">
                            <span>${escapeHtml(cat)}</span>
                            <span class="chev">▼</span>
                        </button>
                     </div>`;
            html += '<div class="menu-items"><div class="items-wrapper">';

            categories[cat].forEach(function (item) {
                const isSpecial = item.special && item.special.toLowerCase() === 'yes';
                const ribbonText = item.ribbon_text || item.ribon_text; // Handles potential typo
                const imgSrc = item.image || placeholderImage;

                html += `<article class="menu-item ${isSpecial ? 'menu-special' : ''}">`;
                if (isSpecial) html += '<span class="menu-special-star" title="Special">★</span>';
                if (ribbonText) html += `<div class="menu-ribbon">${escapeHtml(ribbonText)}</div>`;

                html += `
                    <div class="menu-image">
                        <img loading="lazy" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.item)}">
                    </div>
                    <div class="menu-card">
                        <div class="menu-top">
                            <div class="menu-title">${escapeHtml(item.item)}</div>
                            <div class="price">${item.price ? '$' + escapeHtml(item.price) : ''}</div>
                        </div>
                        ${item.badge ? `<span class="menu-badge">${escapeHtml(item.badge)}</span>` : ''}
                        <div class="menu-desc">${escapeHtml(item.description)}</div>
                    </div>
                </article>`;
            });

            html += '</div></div></section>';
        });

        menuContainer.innerHTML = html;
        updateLayout(true); // Ensure correct open/close state after render
        attachEventListeners();
    }

    function updateSpecialsRibbon(specials) {
        if (!specialsRibbon || specials.length === 0) {
            if (specialsRibbon) specialsRibbon.style.display = 'none';
            return;
        }
        specialsRibbon.style.display = 'block';
        const specialNames = specials.map(item => escapeHtml(item.item)).join(', ');
        specialsRibbon.innerHTML = `<span>Specials:</span><span class="special-list"> ${specialNames}</span>`;
    }

    function updateLayout(force = false) {
        const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;

        // Only proceed if the layout mode (desktop/mobile) has actually changed, or if forced
        const hasLayoutChanged = menuContainer.classList.contains('is-desktop') !== isDesktop;
        if (!force && !hasLayoutChanged) return;

        menuContainer.classList.toggle('is-desktop', isDesktop);

        document.querySelectorAll('.menu-category-button').forEach(btn => {
            const itemsPanel = btn.parentElement.nextElementSibling;
            if (!itemsPanel) return;

            // On desktop, all tabs are forced open
            if (isDesktop) {
                btn.setAttribute('aria-expanded', 'true');
                itemsPanel.classList.add('is-open');
            }
            // On mobile, only close them if the layout is changing from desktop to mobile
            else if (hasLayoutChanged) {
                btn.setAttribute('aria-expanded', 'false');
                itemsPanel.classList.remove('is-open');
            }
        });
    }

    function attachEventListeners() {
        menuContainer.addEventListener('click', function (e) {
            if (window.innerWidth >= DESKTOP_BREAKPOINT) return;
            const button = e.target.closest('.menu-category-button');
            if (button) {
                const itemsPanel = button.parentElement.nextElementSibling;
                const isOpening = !itemsPanel.classList.contains('is-open');
                button.setAttribute('aria-expanded', isOpening);
                itemsPanel.classList.toggle('is-open', isOpening);
            }
        });
    }

    // --- INITIALIZATION ---
    if (refreshBtn) {
        refreshBtn.onclick = function (e) {
            e.preventDefault();
            loadMenuData();
        };
    }

    // Listen for window resize to adjust layout only if width changes
    let resizeTimer;
    let lastWindowWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        if (window.innerWidth === lastWindowWidth) return;
        lastWindowWidth = window.innerWidth;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateLayout, 150);
    });

    // Attach menu click event listener ONCE
    // Attach menu click event listener after each render instead
    // Initial load
    document.addEventListener('DOMContentLoaded', loadMenuData);

})();