let selectedGroupIndex = 0;
let selectedTabIndex = 0;
let groupedTabs = [];
let overlay = null;

// Create and show the overlay
function createOverlay() {
  // Remove existing overlay if it exists
  const existingOverlay = document.getElementById('tab-switcher-overlay');
  if (existingOverlay) {
    document.body.removeChild(existingOverlay);
  }
  
  overlay = document.createElement('div');
  overlay.id = 'tab-switcher-overlay';
  overlay.innerHTML = `
    <div class="overlay-bg"></div>
    <div class="overlay-content">
      <div class="tab-groups"></div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Close on ESC
  document.addEventListener('keydown', handleKeyDown);
  
  // Close when clicking on background
  overlay.querySelector('.overlay-bg').addEventListener('click', closeOverlay);
  
  // Focus the overlay to ensure key events work
  overlay.focus();
}

// Render a single tab
function renderTab(tab, groupIndex, tabIndex, isNested = false) {
  return `
    <div class="tab ${isNested ? 'nested-tab' : ''}" 
         data-tab-id="${tab.id}" 
         data-group-index="${groupIndex}" 
         data-tab-index="${tabIndex}"
         ${tab.active ? 'data-active' : ''}>
      <div class="tab-favicon" style="background-image: url('${tab.favIconUrl || ''}')"></div>
      <div class="tab-title">${tab.title || tab.url}</div>
      ${isNested ? `<div class="tab-domain">${tab.domain}</div>` : ''}
    </div>
  `;
}

// Render a group of tabs
function renderGroup(group, groupIndex, isNested = false) {
  if (group.isCategory) {
    return `
      <div class="tab-group category-group" data-group-index="${groupIndex}">
        <h3 class="group-title">${group.domain}</h3>
        <div class="tabs-container">
          ${group.groups.map((subgroup, subIndex) => 
            `<div class="subgroup" data-subgroup-index="${subIndex}">
              <h4 class="subgroup-title">${subgroup.domain}</h4>
              <div class="tabs-container">
                ${subgroup.tabs.map((tab, tabIndex) => 
                  renderTab(tab, groupIndex, `${subIndex}-${tabIndex}`, true)
                ).join('')}
              </div>
            </div>`
          ).join('')}
        </div>
      </div>
    `;
  }
  
  return `
    <div class="tab-group ${isNested ? 'nested-group' : ''}" data-group-index="${groupIndex}">
      <h3 class="group-title">${group.domain}</h3>
      <div class="tabs-container">
        {group.tabs.map((tab, tabIndex) => 
          renderTab(tab, groupIndex, tabIndex, isNested)
        ).join('')}
      </div>
    </div>
  `;
}

// Update the overlay with tab groups
function updateOverlay(groups) {
  if (!overlay) createOverlay();
  
  // Flatten the groups structure for easier navigation
  groupedTabs = [];
  const flattenedGroups = [];
  
  groups.forEach(group => {
    if (group.isCategory) {
      // For categories, add all nested tabs to the flattened structure
      group.groups.forEach(subgroup => {
        subgroup.tabs.forEach(tab => {
          groupedTabs.push({
            ...tab,
            groupIndex: flattenedGroups.length,
            tabIndex: groupedTabs.length
          });
        });
      });
      flattenedGroups.push(group);
    } else {
      // For regular groups, just add the tabs
      group.tabs.forEach(tab => {
        groupedTabs.push({
          ...tab,
          groupIndex: flattenedGroups.length,
          tabIndex: groupedTabs.length
        });
      });
      flattenedGroups.push(group);
    }
  });
  
  // Reset selection
  selectedGroupIndex = 0;
  selectedTabIndex = 0;
  
  // Render the groups
  const groupsContainer = overlay.querySelector('.tab-groups');
  groupsContainer.innerHTML = flattenedGroups.map((group, idx) => 
    renderGroup(group, idx)
  ).join('');
  
  updateSelection();
}

// Update the selected tab visually
function updateSelection() {
  // Remove all selected states
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('selected');
  });
  
  // Add selected state to current tab
  const selectedTab = document.querySelector(`.tab[data-group-index="${selectedGroupIndex}"][data-tab-index="${selectedTabIndex}"]`);
  if (selectedTab) {
    selectedTab.classList.add('selected');
    selectedTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

// Handle keyboard navigation
function handleKeyDown(e) {
  if (!overlay) return;
  
  const groupCount = groupedTabs.length;
  const tabCount = groupCount > 0 ? groupedTabs[selectedGroupIndex].tabs.length : 0;
  
  switch(e.key) {
    case 'Escape':
      closeOverlay();
      break;
      
    case 'ArrowLeft':
      e.preventDefault();
      selectedTabIndex = (selectedTabIndex - 1 + tabCount) % tabCount;
      updateSelection();
      break;
      
    case 'ArrowRight':
      e.preventDefault();
      selectedTabIndex = (selectedTabIndex + 1) % tabCount;
      updateSelection();
      break;
      
    case 'ArrowUp':
      e.preventDefault();
      selectedGroupIndex = (selectedGroupIndex - 1 + groupCount) % groupCount;
      selectedTabIndex = Math.min(selectedTabIndex, groupedTabs[selectedGroupIndex].tabs.length - 1);
      updateSelection();
      break;
      
    case 'ArrowDown':
      e.preventDefault();
      selectedGroupIndex = (selectedGroupIndex + 1) % groupCount;
      selectedTabIndex = Math.min(selectedTabIndex, groupedTabs[selectedGroupIndex].tabs.length - 1);
      updateSelection();
      break;
      
    case 'Enter':
      e.preventDefault();
      const tab = groupedTabs[selectedGroupIndex].tabs[selectedTabIndex];
      if (tab) {
        browser.tabs.update(tab.id, { active: true });
        closeOverlay();
      }
      break;
  }
}

// Close the overlay
function closeOverlay() {
  if (overlay) {
    document.removeEventListener('keydown', handleKeyDown);
    overlay.remove();
    overlay = null;
  }
}

// Handle tab clicks
function handleTabClick(e) {
  const tabElement = e.target.closest('.tab');
  if (tabElement) {
    e.preventDefault();
    e.stopPropagation();
    
    const groupIndex = parseInt(tabElement.dataset.groupIndex);
    const tabIndex = parseInt(tabElement.dataset.tabIndex);
    const tab = groupedTabs[groupIndex]?.tabs[tabIndex];
    
    if (tab) {
      // Update the active tab in the background script
      browser.runtime.sendMessage({
        action: 'switchTab',
        tabId: tab.id
      }).then(closeOverlay);
    }
  }
}

// Add event delegation for tab clicks
document.addEventListener('click', handleTabClick, true);

// Listen for messages from background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === 'showOverlay') {
    if (overlay) {
      closeOverlay();
      setTimeout(() => updateOverlay(message.tabs), 100);
    } else {
      updateOverlay(message.tabs);
    }
  }
});

// Close overlay when switching tabs
browser.tabs.onActivated.addListener(() => {
  if (overlay) {
    closeOverlay();
  }
});
