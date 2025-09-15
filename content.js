// 2D Spatial Tab Switcher - Optimized
let overlay = null;
let tabs = [];
let groups = new Map();
let rafId = null;

// Performance optimization: Cache DOM elements
const elements = {
    container: null,
    groups: new Map()
};

// Create a minimal overlay
function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'spatial-tab-switcher';
    overlay.innerHTML = `
        <div class="spatial-container"></div>
    `;
    
    document.documentElement.appendChild(overlay);
    elements.container = overlay.querySelector('.spatial-container');
    
    // Use passive event listeners for better scrolling performance
    overlay.addEventListener('keydown', handleKeyDown, { passive: true });
    overlay.tabIndex = -1;
    
    // Load tabs immediately
    loadTabs();
    
    // Use requestAnimationFrame for smoother animations
    rafId = requestAnimationFrame(() => {
        overlay.classList.add('visible');
        overlay.focus();
    });
}

// Load tabs and group by domain
async function loadTabs() {
    try {
        tabs = await browser.runtime.sendMessage({ action: 'getTabs' });
        groupTabs();
        renderGroups();
    } catch (e) {
        console.error('Error loading tabs:', e);
    }
}

// Group tabs by domain using a more efficient approach
function groupTabs() {
    const domainMap = new Map();
    
    // Process tabs in a single pass
    for (const tab of tabs) {
        try {
            const url = new URL(tab.url);
            const domain = url.hostname.replace('www.', '');
            
            if (!domainMap.has(domain)) {
                domainMap.set(domain, []);
            }
            domainMap.get(domain).push(tab);
        } catch (e) {
            // Skip invalid URLs
            continue;
        }
    }
    
    // Convert to array and sort by domain for consistent ordering
    groups = new Map([...domainMap.entries()].sort());
}

// Create tab element with optimized event handling
function createTabElement(tab) {
    const tabEl = document.createElement('div');
    tabEl.className = `tab ${tab.active ? 'active' : ''}`;
    tabEl.dataset.tabId = tab.id;
    tabEl.title = tab.title;
    
    // Create close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        browser.tabs.remove(parseInt(tabEl.dataset.tabId, 10));
        tabEl.remove();
    });
    
    // Add favicon or first letter as fallback
    if (tab.favIconUrl) {
        const favicon = document.createElement('img');
        favicon.src = tab.favIconUrl;
        favicon.className = 'tab-favicon';
        favicon.loading = 'lazy';
        tabEl.appendChild(favicon);
    } else {
        tabEl.textContent = tab.title ? tab.title[0].toUpperCase() : '?';
    }
    
    tabEl.appendChild(closeBtn);
    
    // Use event delegation for better performance
    tabEl.addEventListener('click', (e) => {
        if (e.target === closeBtn) return;
        e.stopPropagation();
        browser.runtime.sendMessage({
            action: 'switchTab',
            tabId: parseInt(tabEl.dataset.tabId, 10)
        }).then(() => closeOverlay());
    });
    
    return tabEl;
}

// Render tab groups with optimized DOM operations
function renderGroups() {
    if (!elements.container) return;
    
    // Clear existing content
    elements.container.textContent = '';
    elements.groups.clear();
    
    // Calculate positions
    const groupArray = Array.from(groups.entries());
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const radius = Math.min(centerX, centerY) * 0.7;
    
    // Use document fragment for batch DOM updates
    const fragment = document.createDocumentFragment();
    
    groupArray.forEach(([domain, tabs], i) => {
        const angle = (i / groupArray.length) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius - 100;
        const y = centerY + Math.sin(angle) * radius - 100;
        
        const groupEl = document.createElement('div');
        groupEl.className = 'tab-group';
        groupEl.style.transform = `translate(${x}px, ${y}px)`;
        
        // Add domain label
        const domainEl = document.createElement('div');
        domainEl.className = 'domain-label';
        domainEl.textContent = domain;
        groupEl.appendChild(domainEl);
        
        // Create tab elements
        const tabsContainer = document.createElement('div');
        tabsContainer.className = 'tabs-container';
        
        tabs.forEach((tab, tabIndex) => {
            const tabEl = createTabElement(tab);
            const tabAngle = (tabIndex / tabs.length) * Math.PI * 2;
            const tabX = 50 + Math.cos(tabAngle) * 30;
            const tabY = 50 + Math.sin(tabAngle) * 30;
            
            tabEl.style.transform = `translate(${tabX}px, ${tabY}px)`;
            tabsContainer.appendChild(tabEl);
        });
        
        groupEl.appendChild(tabsContainer);
        fragment.appendChild(groupEl);
        elements.groups.set(domain, groupEl);
    });
    
    elements.container.appendChild(fragment);
}

// Handle keyboard navigation
function handleKeyDown(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay();
    }
}

// Close the overlay and clean up
function closeOverlay() {
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    
    if (overlay && overlay.parentNode) {
        overlay.remove();
        overlay = null;
        elements.container = null;
        elements.groups.clear();
        browser.runtime.sendMessage({ action: 'overlayClosed' });
    }
}

// Listen for messages from background script
browser.runtime.onMessage.addListener((message) => {
    if (message.action === 'showOverlay') {
        createOverlay();
    } else if (message.action === 'hideOverlay') {
        closeOverlay();
    }
    return false;
});

// Close overlay when clicking outside
if (document.body) {
    document.body.addEventListener('click', (e) => {
        if (overlay && !overlay.contains(e.target)) {
            closeOverlay();
        }
    }, { passive: true });
}

// Handle tab updates
browser.tabs.onRemoved.addListener((tabId) => {
    const tabElement = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    if (tabElement) {
        tabElement.remove();
    }
});
