// Categorize domains into broader categories
function categorizeDomain(domain) {
  if (!domain || domain === 'Misc') return 'Other';
  
  const socialSites = ['twitter.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'tiktok.com'];
  const workSites = ['github.com', 'gitlab.com', 'bitbucket.org', 'atlassian.net', 'slack.com', 'notion.so'];
  const devSites = ['stackoverflow.com', 'stackexchange.com', 'dev.to', 'medium.com', 'css-tricks.com', 'mdn.io'];
  const mediaSites = ['youtube.com', 'vimeo.com', 'netflix.com', 'twitch.tv', 'spotify.com'];
  const shoppingSites = ['amazon.com', 'ebay.com', 'etsy.com', 'aliexpress.com'];
  
  const domainLower = domain.toLowerCase();
  
  if (socialSites.some(site => domainLower.includes(site))) return 'Social';
  if (workSites.some(site => domainLower.includes(site))) return 'Work';
  if (devSites.some(site => domainLower.includes(site))) return 'Development';
  if (mediaSites.some(site => domainLower.includes(site))) return 'Media';
  if (shoppingSites.some(site => domainLower.includes(site))) return 'Shopping';
  
  // If it's a subdomain, try to categorize by the main domain
  const parts = domainLower.split('.');
  if (parts.length > 2) {
    const mainDomain = parts.slice(-2).join('.');
    if (mainDomain !== domainLower) {
      return categorizeDomain(mainDomain);
    }
  }
  
  return 'Other';
}

// Group tabs by category and domain
async function getGroupedTabs() {
  const tabs = await browser.tabs.query({ currentWindow: true });
  
  // If there are only a few tabs, return them in a single group
  if (tabs.length <= 5) {
    return [{
      domain: 'Tabs',
      tabs: tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        active: tab.active
      }))
    }];
  }
  
  const groups = new Map();
  
  for (const tab of tabs) {
    const domain = categorizeDomain(new URL(tab.url).hostname);
    if (!groups.has(domain)) {
      groups.set(domain, []);
    }
    groups.get(domain).push({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      active: tab.active
    });
  }
  
  return Array.from(groups, ([domain, tabs]) => ({ domain, tabs }));
}

// Track overlay state
let isOverlayVisible = false;
let activeTabId = null;

// Toggle overlay
async function toggleOverlay() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) return;
  
  const tab = tabs[0];
  
  if (isOverlayVisible) {
    // Hide overlay
    try {
      await browser.tabs.sendMessage(tab.id, { action: 'hideOverlay' });
      isOverlayVisible = false;
      activeTabId = null;
    } catch (e) {
      console.log('Could not hide overlay:', e);
    }
  } else {
    // Show overlay
    try {
      await browser.tabs.sendMessage(tab.id, { action: 'showOverlay' });
      isOverlayVisible = true;
      activeTabId = tab.id;
    } catch (e) {
      console.log('Failed to show overlay, trying to inject content script...');
      try {
        await browser.tabs.executeScript(tab.id, { file: 'content.js' });
        await browser.tabs.insertCSS(tab.id, { file: 'overlay.css' });
        await browser.tabs.sendMessage(tab.id, { action: 'showOverlay' });
        isOverlayVisible = true;
        activeTabId = tab.id;
      } catch (injectError) {
        console.error('Failed to inject content script:', injectError);
      }
    }
  }
}

// Handle keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  if (command === 'toggle-tab-switcher') {
    toggleOverlay().catch(console.error);
  }
});

// Handle messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'switchTab') {
    browser.tabs.update(message.tabId, { active: true });
    return Promise.resolve({ success: true });
  } else if (message.action === 'getTabs') {
    return browser.tabs.query({ currentWindow: true });
  } else if (message.action === 'overlayClosed') {
    isOverlayVisible = false;
    activeTabId = null;
    return Promise.resolve({ success: true });
  }
  return Promise.resolve({ success: false });
});

// Clean up when tab is closed
browser.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activeTabId) {
    isOverlayVisible = false;
    activeTabId = null;
  }
});

console.log('Tab Switcher background script loaded');
