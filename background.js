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
    let domain = 'Misc';
    try {
      const url = new URL(tab.url);
      domain = url.hostname.startsWith('www.') ? 
        url.hostname.substring(4) : url.hostname;
    } catch (e) {
      // Keep 'Misc' for invalid URLs
    }
    
    const category = categorizeDomain(domain);
    
    if (!groups.has(category)) {
      groups.set(category, new Map());
    }
    
    if (!groups.get(category).has(domain)) {
      groups.get(category).set(domain, []);
    }
    
    groups.get(category).get(domain).push({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      active: tab.active,
      domain: domain
    });
  }
  
  // Convert to array of {category, groups} objects
  return Array.from(groups.entries()).map(([category, domainMap]) => {
    const domains = Array.from(domainMap.entries()).map(([domain, tabs]) => ({
      domain,
      tabs
    }));
    
    // If a category has only one domain with few tabs, flatten it
    if (domains.length === 1 && domains[0].tabs.length <= 3) {
      return {
        domain: category,
        tabs: domains[0].tabs,
        isFlattened: true
      };
    }
    
    return {
      domain: category,
      groups: domains,
      isCategory: true
    };
  });
}

// Send message to content script to show overlay
async function showOverlay() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    browser.tabs.sendMessage(tabs[0].id, { 
      action: 'showOverlay',
      tabs: await getGroupedTabs()
    });
  }
}

// Handle messages from content script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'switchTab') {
    browser.tabs.update(message.tabId, { active: true });
    return Promise.resolve({ success: true });
  }
});

// Handle keyboard shortcuts
browser.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-tab-switcher') {
    showOverlay();
  } else if (command === 'next-tab' || command === 'prev-tab') {
    const tabs = await browser.tabs.query({ currentWindow: true });
    const current = tabs.findIndex(tab => tab.active);
    const next = command === 'next-tab' 
      ? (current + 1) % tabs.length 
      : (current - 1 + tabs.length) % tabs.length;
    
    if (tabs[next]) {
      browser.tabs.update(tabs[next].id, { active: true });
    }
  }
});
