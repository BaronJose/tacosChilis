// --- MENU LOGIC ---
(function () {
    // --- CONFIGURATION ---
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSvCiqSXwFy0Gi34bsv32U2vzn6dzXVbzaHbm6qxA-H2EegRqTG2m7JtmtMHHAW4toNWm0Qtd4wWRhm/pub?output=csv';
    const placeholderImage = 'https://placehold.co/600?text=Image+Soon';
    const DESKTOP_BREAKPOINT = 769;

    // --- DOM ELEMENTS ---
    const menuContainer = document.getElementById('menu');
    const specialsRibbon = document.getElementById('specialsRibbon');
    const refreshBtn = document.getElementById('refreshMenuBtn');

    // --- UTILITY FUNCTIONS ---
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
    }


    function showErrorState(error) {
        let errorMessage = 'Unable to load the menu.';
        let errorDetail = 'Please check your internet connection and try again.';
        let errorType = 'network';

        // Try to determine error type
        if (error) {
            const errorText = String(error).toLowerCase();
            if (errorText.includes('parse') || errorText.includes('csv') || errorText.includes('format')) {
                errorType = 'parsing';
                errorMessage = 'Menu data format error.';
                errorDetail = 'The menu data could not be read. Please contact us if this problem persists.';
            } else if (errorText.includes('network') || errorText.includes('fetch') || errorText.includes('failed')) {
                errorType = 'network';
                errorMessage = 'Connection problem.';
                errorDetail = 'Unable to reach the menu server. Please check your internet connection.';
            }
        }

        const errorHtml = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h2 class="error-title">${escapeHtml(errorMessage)}</h2>
                <p class="error-detail">${escapeHtml(errorDetail)}</p>
                <button class="retry-btn" aria-label="Retry loading menu">
                    <span class="retry-icon">↻</span>
                    Try Again
                </button>
            </div>
        `;
        menuContainer.innerHTML = errorHtml;
        
        // Attach retry button event listener
        const retryButton = menuContainer.querySelector('.retry-btn');
        if (retryButton) {
            retryButton.onclick = function() {
                loadMenuData();
            };
        }
    }

    // --- CORE FUNCTIONS ---
    function loadMenuData() {
        menuContainer.innerHTML = `
        <div class="skeleton-section">
            <div class="skeleton skeleton-header"></div>
            <div class="skeleton-grid">
                <div class="skeleton-card"><div class="skeleton-image"></div><div class="skeleton-text-wrapper"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-short"></div></div></div>
                <div class="skeleton-card"><div class="skeleton-image"></div><div class="skeleton-text-wrapper"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-short"></div></div></div>
                <div class="skeleton-card"><div class="skeleton-image"></div><div class="skeleton-text-wrapper"><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-short"></div></div></div>
            </div>
        </div>`;
        const url = `${SHEET_URL}&cacheBust=${Date.now()}`;

        Papa.parse(url, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: function (results) {
                // Check if we got valid data
                if (!results.data || results.data.length === 0) {
                    showErrorState(new Error('No menu data found'));
                    return;
                }
                try {
                    const processedData = processData(results.data);
                    renderMenu(processedData.categories);
                    setupAnnouncementRibbon(processedData.announcements);
                    updateLayout(true);
                    
                } catch (processingError) {
                    showErrorState(new Error('Error processing menu data: ' + processingError.message));
                }
            },
            error: function (error) {
                showErrorState(error);
            }
        });
    }

    function processData(data) {
        const categories = {};
        const announcements = []; 

        data.forEach(function (row) {
            const item = {};
            for (const key in row) {
                item[key.toLowerCase()] = row[key];
            }

            item.name = item.item;
            item.group = item.groupingname; 
            item.groupImage = item.groupimage; 
            
            // Check for Announcements
            if (item.category && item.category.toLowerCase() === 'announcement') {
                announcements.push(item);
                return; // Skip from being added to the regular menu
            }

            // If category is blank, assign it to "Menu"
            item.category = item.category || 'Menu';

            if (!item.name) return; 

            if (!categories[item.category]) {
                categories[item.category] = {
                    groupedItems: {},
                    individualItems: []
                };
            }

            if (item.group) {
                if (!categories[item.category].groupedItems[item.group]) {
                    categories[item.category].groupedItems[item.group] = {
                        description: item.description,
                        image: item.groupImage,
                        items: []
                    };
                }
                // Store badge and special for EACH item
                categories[item.category].groupedItems[item.group].items.push({
                    name: item.name,
                    price: item.price,
                    badge: item.badge
                    // 'special' is intentionally ignored here per your request
                });
            } else {
                categories[item.category].individualItems.push(item);
            }
        });

        return { categories, announcements };
    }

    function renderMenu(categories) {
        let html = '';
        
        Object.keys(categories).forEach(function (cat) {
            const categoryData = categories[cat];

            html += '<section class="menu-section">';
            html += `<h2 class="category-headline">${escapeHtml(cat)}</h2>`;
            
            // This wrapper holds all items for this category
            html += '<div class="category-content-wrapper">'; 

            // 1. Render all GROUPED items first
            Object.keys(categoryData.groupedItems).forEach(function (groupName) {
                const group = categoryData.groupedItems[groupName];
                const groupImgSrc = group.image || placeholderImage; 

                html += `<div class="menu-group">`;
                html += `<img loading="lazy" src="${escapeHtml(groupImgSrc)}" alt="${escapeHtml(groupName)}" class="group-image" onerror="this.onerror=null; this.src='${placeholderImage}'">`;
                html += `<div class="group-content">`;
                html += `<h3 class="group-title">${escapeHtml(groupName)}</h3>`;
                html += `<p class="group-description">${escapeHtml(group.description)}</p>`;
                html += `<ul class="group-item-list">`;
                
                // Add list items with badge logic
                group.items.forEach(function (item) {
                    html += `
                        <li class="group-item">
                            <div class="group-item-details">
                                <span class="group-item-name">${escapeHtml(item.name)}</span>
                                ${item.badge ? `<span class="group-item-badge">${escapeHtml(item.badge)}</span>` : ''}
                            </div>
                            <div class="group-item-extras">
                                <span class="group-item-price">${item.price ? '$' + escapeHtml(item.price) : ''}</span>
                            </div>
                        </li>
                    `;
                });
                
                html += `</ul></div></div>`; 
            });

            // 2. Render all INDIVIDUAL items
            if (categoryData.individualItems.length > 0) {
                // The individual-item-grid wrapper is used for proper grid flow
                html += '<div class="individual-item-grid">'; 
                
                categoryData.individualItems.forEach(function (item) {
                    const isSpecial = item.special && item.special.toLowerCase() === 'yes';
                    const ribbonText = item.ribbon_text || item.ribon_text;
                    const imgSrc = item.image || placeholderImage;

                    html += `<article class="menu-item ${isSpecial ? 'menu-special' : ''}">`;
                    if (isSpecial) html += '<span class="menu-special-star" title="Special">★</span>';
                    if (ribbonText) html += `<div class="menu-ribbon">${escapeHtml(ribbonText)}</div>`;

                    html += `
                        <div class="menu-image">
                            <img loading="lazy" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(item.name)}" onerror="this.onerror=null; this.src='${placeholderImage}'">
                        </div>
                        <div class="menu-card">
                            <div class="menu-top">
                                <div class="menu-title">${escapeHtml(item.name)}</div>
                                <div class="price">${item.price ? '$' + escapeHtml(item.price) : ''}</div>
                            </div>
                            ${item.badge ? `<span class="menu-badge">${escapeHtml(item.badge)}</span>` : ''}
                            <div class="menu-desc">${escapeHtml(item.description)}</div>
                        </div>
                    </article>`;
                });
                
                html += '</div>'; 
            }

            html += '</div></section>';
        });

        menuContainer.innerHTML = html;
        updateLayout(true);
        
        // Announce menu update to screen readers
        menuContainer.setAttribute('aria-live', 'polite');
    }

    // This is the FADE-IN / FADE-OUT version
    function setupAnnouncementRibbon(announcements) {
        if (!specialsRibbon || announcements.length === 0) {
            if (specialsRibbon) specialsRibbon.style.display = 'none';
            return;
        }

        specialsRibbon.style.display = 'block';
        specialsRibbon.innerHTML = ''; // Clear old content

        announcements.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = 'announcement-item';
            el.textContent = escapeHtml(item.name); 

            if (index === 0) {
                el.classList.add('is-visible');
            }
            specialsRibbon.appendChild(el);
        });

        if (announcements.length < 2) {
            return; // Don't start rotator if only one item
        }

        let currentItemIndex = 0;
        setInterval(() => {
            const items = specialsRibbon.querySelectorAll('.announcement-item');
            
            items[currentItemIndex].classList.remove('is-visible');
            currentItemIndex = (currentItemIndex + 1) % items.length;
            items[currentItemIndex].classList.add('is-visible');

        }, 3000); // 3-second pause
    }

    function updateLayout(force = false) {
        const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
        const hasLayoutChanged = menuContainer.classList.contains('is-desktop') !== isDesktop;
        
        if (!force && !hasLayoutChanged) return;
        menuContainer.classList.toggle('is-desktop', isDesktop);
    }


    // --- INITIALIZATION ---
    if (refreshBtn) {
        refreshBtn.onclick = function (e) {
            e.preventDefault();
            loadMenuData();
        };
    }

    // --- KEYBOARD SHORTCUTS ---
    document.addEventListener('keydown', function(e) {
        // Press 'R' key to refresh menu (when not typing in an input)
        if (e.key === 'r' || e.key === 'R') {
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );
            
            if (!isInputFocused && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                if (refreshBtn) {
                    refreshBtn.focus();
                    loadMenuData();
                }
            }
        }
    });

    let resizeTimer;
    let lastWindowWidth = window.innerWidth;
    window.addEventListener('resize', () => {
        if (window.innerWidth === lastWindowWidth) return;
        lastWindowWidth = window.innerWidth;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(updateLayout, 150);
    });

    document.addEventListener('DOMContentLoaded', loadMenuData);


})();