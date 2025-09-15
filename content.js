// 2D Spatial Tab Switcher
let overlay = null;
let tabs = [];
let selectedIndex = 0;
let groups = new Map();

// Create a minimal overlay
function createOverlay() {
    if (overlay) return;

    overlay = document.createElement('div');
    overlay.id = 'spatial-tab-switcher';
    overlay.innerHTML = `
        <div class="spatial-container"></div>
    `;
    
    document.documentElement.appendChild(overlay);
    overlay.addEventListener('keydown', handleKeyDown);
    overlay.tabIndex = -1;
    
    // Load tabs immediately
    loadTabs();
    
    // Focus and show
    setTimeout(() => {
        overlay.classList.add('visible');
        overlay.focus();
    }, 10);
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

// Group tabs by domain
function groupTabs() {
    groups.clear();
    tabs.forEach(tab => {
        try {
            const domain = new URL(tab.url).hostname.replace('www.', '');
            if (!groups.has(domain)) {
                groups.set(domain, []);
            }
            groups.get(domain).push(tab);
        } catch (e) {
            // Skip invalid URLs
        }
    });
}

// Render tab groups in 2D space
function renderGroups() {
    if (!overlay) return;
    
    const container = overlay.querySelector('.spatial-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Position groups in a circle
    const groupArray = Array.from(groups.entries());
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const radius = Math.min(centerX, centerY) * 0.7;
    
    groupArray.forEach(([domain, tabs], i) => {
        const angle = (i / groupArray.length) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radius - 100;
        const y = centerY + Math.sin(angle) * radius - 100;
        
        const groupEl = document.createElement('div');
        groupEl.className = 'tab-group';
        groupEl.style.left = `${x}px`;
        groupEl.style.top = `${y}px`;
        
        // Add domain label
        const domainEl = document.createElement('div');
        domainEl.className = 'domain-label';
        domainEl.textContent = domain;
        groupEl.appendChild(domainEl);
        
        // Position tabs in a smaller circle around the group center
        tabs.forEach((tab, tabIndex) => {
            const tabAngle = (tabIndex / tabs.length) * Math.PI * 2;
            const tabX = 50 + Math.cos(tabAngle) * 30;
            const tabY = 50 + Math.sin(tabAngle) * 30;
            
            const tabEl = document.createElement('div');
            tabEl.className = `tab ${tab.active ? 'active' : ''}`;
            tabEl.style.left = `${tabX}px`;
            tabEl.style.top = `${tabY}px`;
            tabEl.title = tab.title;
            
            // Add favicon or first letter as fallback
            if (tab.favIconUrl) {
                const favicon = document.createElement('img');
                favicon.src = tab.favIconUrl;
                favicon.className = 'tab-favicon';
                tabEl.appendChild(favicon);
            } else {
                tabEl.textContent = tab.title ? tab.title[0].toUpperCase() : '?';
            }
            
            tabEl.addEventListener('click', (e) => {
                e.stopPropagation();
                browser.runtime.sendMessage({
                    action: 'switchTab',
                    tabId: tab.id
                });
                closeOverlay();
            });
            
            groupEl.appendChild(tabEl);
        });
        
        container.appendChild(groupEl);
    });
}

// Handle keyboard navigation
function handleKeyDown(e) {
    if (e.key === 'Escape') {
        e.preventDefault();
        closeOverlay();
    }
    // Add more navigation as needed
}

// Close the overlay
function closeOverlay() {
    if (overlay && overlay.parentNode) {
        overlay.remove();
        overlay = null;
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
});

// Close overlay when clicking outside
document.addEventListener('click', (e) => {
    if (overlay && !overlay.contains(e.target)) {
        closeOverlay();
    }
});
