const tabsContainer = document.getElementById('tabs-container');
const webviewContainer = document.getElementById('webview-container');
const addTabBtn = document.getElementById('add-tab-btn');
const deleteTabBtn = document.getElementById('delete-tab-btn');
const renameTabBtn = document.getElementById('rename-tab-btn');

let tabs = [];
let activeTabId = null;

async function init() {
  tabs = await window.electronAPI.getStoreValue('tabs') || [];
  activeTabId = await window.electronAPI.getStoreValue('activeTabId') || null;

  if (tabs.length === 0) {
    // If there are no tabs, create an initial one
    addTab();
  } else {
    renderTabs();
  }
}

function renderTabs() {
  tabsContainer.innerHTML = '';
  webviewContainer.innerHTML = '';

  tabs.forEach(tab => {
    createTabElement(tab);
    createWebviewElement(tab);
  });

  if (activeTabId) {
    activateTab(activeTabId);
  }
}

function createTabElement(tab) {
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.textContent = tab.name;
  tabEl.dataset.tabId = tab.id;

  tabEl.addEventListener('click', () => {
    activateTab(tab.id);
  });

  tabsContainer.appendChild(tabEl);
}

function createWebviewElement(tab) {
  const webviewEl = document.createElement('webview');
  webviewEl.dataset.tabId = tab.id;
  webviewEl.partition = `persist:whatsapp_tab_${tab.id}`;
  webviewEl.src = 'https://web.whatsapp.com';
  webviewEl.useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';


  webviewContainer.appendChild(webviewEl);
}

async function activateTab(tabId) {
  activeTabId = tabId;
  await window.electronAPI.setStoreValue('activeTabId', activeTabId);

  // Activate tab
  document.querySelectorAll('.tab').forEach(tabEl => {
    if (tabEl.dataset.tabId === tabId) {
      tabEl.classList.add('active');
    } else {
      tabEl.classList.remove('active');
    }
  });

  // Activate webview
  document.querySelectorAll('webview').forEach(webviewEl => {
    if (webviewEl.dataset.tabId === tabId) {
      webviewEl.classList.add('active');
    } else {
      webviewEl.classList.remove('active');
    }
  });
}

async function addTab() {
  const newTab = {
    id: `tab_${Date.now()}`,
    name: `Tab ${tabs.length + 1}`,
  };

  tabs.push(newTab);
  await window.electronAPI.setStoreValue('tabs', tabs);

  createTabElement(newTab);
  createWebviewElement(newTab);
  activateTab(newTab.id);
}

async function deleteTab() {
    if (!activeTabId) return;

    const tabIndex = tabs.findIndex(tab => tab.id === activeTabId);
    if (tabIndex === -1) return;

    // Remove tab and webview elements
    const tabEl = document.querySelector(`.tab[data-tab-id="${activeTabId}"]`);
    const webviewEl = document.querySelector(`webview[data-tab-id="${activeTabId}"]`);
    if (tabEl) tabEl.remove();
    if (webviewEl) webviewEl.remove();

    // Remove from tabs array
    tabs.splice(tabIndex, 1);
    await window.electronAPI.setStoreValue('tabs', tabs);

    // Activate another tab or clear if no tabs left
    if (tabs.length > 0) {
        const newActiveTabId = tabs[Math.max(0, tabIndex - 1)].id;
        activateTab(newActiveTabId);
    } else {
        activeTabId = null;
        await window.electronAPI.setStoreValue('activeTabId', null);
        addTab(); // create a new tab if all are deleted
    }
}

async function renameTab() {
    if (!activeTabId) return;

    const tab = tabs.find(tab => tab.id === activeTabId);
    if (!tab) return;

    const newName = prompt('Enter new tab name:', tab.name);
    if (newName) {
        tab.name = newName;
        await window.electronAPI.setStoreValue('tabs', tabs);
        const tabEl = document.querySelector(`.tab[data-tab-id="${activeTabId}"]`);
        if (tabEl) {
            tabEl.textContent = newName;
        }
    }
}


addTabBtn.addEventListener('click', addTab);
deleteTabBtn.addEventListener('click', deleteTab);
renameTabBtn.addEventListener('click', renameTab);


init();