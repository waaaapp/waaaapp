const tabsContainer = document.getElementById('tabs-container');
const webviewContainer = document.getElementById('webview-container');
const addTabBtn = document.getElementById('add-tab-btn');
const renameTabBtn = document.getElementById('rename-tab-btn');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const exitBtn = document.getElementById('exit-btn');
const helpBtn = document.getElementById('help-btn');

let tabs = [];
let activeTabId = null;

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

async function init() {
  tabs = await window.electronAPI.getStoreValue('tabs') || [];
  activeTabId = await window.electronAPI.getStoreValue('activeTabId') || null;

  if (tabs.length === 0) {
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
  tabEl.dataset.tabId = tab.id;

  const tabNameEl = document.createElement('span');
  tabNameEl.className = 'tab-name';
  tabNameEl.textContent = tab.name;
  tabEl.appendChild(tabNameEl);

  const closeBtn = document.createElement('span');
  closeBtn.className = 'close-tab';
  closeBtn.innerHTML = '&times;';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTab(tab.id);
  });
  tabEl.appendChild(closeBtn);

  if (!tab.isHelp) {
    tabEl.addEventListener('dblclick', () => {
      renameTab(tab.id);
    });
  }

  tabEl.addEventListener('click', () => {
    activateTab(tab.id);
  });

  tabsContainer.appendChild(tabEl);
}

function createWebviewElement(tab) {
  const webviewEl = document.createElement('webview');
  webviewEl.dataset.tabId = tab.id;
  if (tab.isHelp) {
    webviewEl.src = 'https://waaaapp.com/apphelp.html';
  } else {
    webviewEl.partition = `persist:whatsapp_tab_${tab.id}`;
    webviewEl.src = 'https://web.whatsapp.com';
    webviewEl.useragent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';
  }

  webviewContainer.appendChild(webviewEl);
}

async function activateTab(tabId) {
  activeTabId = tabId;
  await window.electronAPI.setStoreValue('activeTabId', activeTabId);

  document.querySelectorAll('.tab').forEach(tabEl => {
    if (tabEl.dataset.tabId === tabId) {
      tabEl.classList.add('active');
    } else {
      tabEl.classList.remove('active');
    }
  });

  document.querySelectorAll('webview').forEach(webviewEl => {
    if (webviewEl.dataset.tabId === tabId) {
      webviewEl.classList.add('active');
    } else {
      webviewEl.classList.remove('active');
    }
  });
}

async function closeTab(tabId) {
    const tab = tabs.find(tab => tab.id === tabId);
    if (!tab) return;

    const tabIndex = tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return;

    const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"]`);
    const webviewEl = document.querySelector(`webview[data-tab-id="${tabId}"]`);
    if (tabEl) tabEl.remove();
    if (webviewEl) webviewEl.remove();

    tabs.splice(tabIndex, 1);
    await window.electronAPI.setStoreValue('tabs', tabs);

    if (tabs.length > 0) {
        if (activeTabId === tabId) {
            const newActiveTabId = tabs[Math.max(0, tabIndex - 1)].id;
            activateTab(newActiveTabId);
        }
    } else {
        activeTabId = null;
        await window.electronAPI.setStoreValue('activeTabId', null);
        addTab();
    }
}

async function renameTab(tabId) {
    const tab = tabs.find(tab => tab.id === tabId);
    if (!tab || tab.isHelp) return;

    const newName = prompt('Enter new tab name:', tab.name);
    if (newName) {
        tab.name = newName;
        await window.electronAPI.setStoreValue('tabs', tabs);
        const tabEl = document.querySelector(`.tab[data-tab-id="${tabId}"] .tab-name`);
        if (tabEl) {
            tabEl.textContent = newName;
        }
    }
}

async function createHelpTab() {
  const existingHelpTab = tabs.find(tab => tab.isHelp);
  if (existingHelpTab) {
    activateTab(existingHelpTab.id);
    return;
  }

  const newTab = {
    id: 'help_tab',
    name: 'Help',
    isHelp: true,
  };

  tabs.push(newTab);
  await window.electronAPI.setStoreValue('tabs', tabs);

  createTabElement(newTab);
  createWebviewElement(newTab);
  activateTab(newTab.id);
}

addTabBtn.addEventListener('click', addTab);
renameTabBtn.addEventListener('click', () => {
    if(activeTabId) {
        renameTab(activeTabId)
    }
});
exportBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.exportProfile();
    alert(result.message);
});
importBtn.addEventListener('click', async () => {
    const result = await window.electronAPI.importProfile();
    alert(result.message);
});
exitBtn.addEventListener('click', () => window.electronAPI.exitApp());

helpBtn.addEventListener('click', createHelpTab);

init();