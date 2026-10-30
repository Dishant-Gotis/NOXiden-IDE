// NOXiden Renderer Client Script
// Interacts with Main process via window.noxiden (secure contextBridge)

let currentWorkspacePath = null;
let activeFilePath = null;
const messages = [];

// DOM Elements
const btnOpenWorkspace = document.getElementById('btnOpenWorkspace');
const workspaceLabel = document.getElementById('workspaceLabel');
const fileTree = document.getElementById('fileTree');
const fileCount = document.getElementById('fileCount');
const activeTabLabel = document.getElementById('activeTabLabel');
const codeEditor = document.getElementById('codeEditor');
const lineNumbers = document.getElementById('lineNumbers');
const modelSelect = document.getElementById('modelSelect');
const chatHistory = document.getElementById('chatHistory');
const agentInput = document.getElementById('agentInput');
const btnSendPrompt = document.getElementById('btnSendPrompt');
const footerStatus = document.getElementById('footerStatus');

// Update line numbers on input
function updateLineNumbers() {
  const lines = codeEditor.value.split('\n').length;
  let numbers = '';
  for (let i = 1; i <= Math.max(lines, 20); i++) {
    numbers += `${i}<br>`;
  }
  lineNumbers.innerHTML = numbers;
}

codeEditor.addEventListener('input', updateLineNumbers);
updateLineNumbers();

// Auto-save on Ctrl+S
window.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (activeFilePath && window.noxiden) {
      footerStatus.innerText = 'Saving...';
      const res = await window.noxiden.writeFile(activeFilePath, codeEditor.value);
      if (res.success) {
        footerStatus.innerText = `Saved: ${activeFilePath}`;
        setTimeout(() => (footerStatus.innerText = 'Ready'), 2000);
      } else {
        footerStatus.innerText = `Save Failed: ${res.error}`;
      }
    }
  }
});

// Render Directory Tree
function renderTree(items, container, depth = 0) {
  container.innerHTML = '';
  if (!items || items.length === 0) {
    container.innerHTML = '<div style="padding: 10px; color: #64748b;">(Empty folder)</div>';
    return;
  }

  items.forEach((item) => {
    const el = document.createElement('div');
    el.className = `tree-item ${item.isDirectory ? 'directory' : 'file'}`;
    el.style.paddingLeft = `${14 + depth * 14}px`;

    const icon = item.isDirectory ? '📁' : '📄';
    el.innerHTML = `<span>${icon}</span> <span>${item.name}</span>`;

    if (item.isDirectory) {
      let isOpen = false;
      const childContainer = document.createElement('div');
      childContainer.style.display = 'none';

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        isOpen = !isOpen;
        childContainer.style.display = isOpen ? 'block' : 'none';
        el.querySelector('span').innerText = isOpen ? '📂' : '📁';
        if (isOpen && item.children) {
          renderTree(item.children, childContainer, depth + 1);
        }
      });

      container.appendChild(el);
      container.appendChild(childContainer);
    } else {
      el.addEventListener('click', async () => {
        document.querySelectorAll('.tree-item').forEach((t) => t.classList.remove('active'));
        el.classList.add('active');
        await openFile(item.path, item.name);
      });
      container.appendChild(el);
    }
  });
}

// Open File in Editor
async function openFile(filePath, fileName) {
  if (!window.noxiden) return;
  try {
    footerStatus.innerText = `Loading ${fileName}...`;
    const content = await window.noxiden.readFile(filePath);
    codeEditor.value = content;
    activeFilePath = filePath;
    activeTabLabel.innerText = fileName;
    updateLineNumbers();
    footerStatus.innerText = `Viewing: ${fileName}`;
  } catch (err) {
    footerStatus.innerText = `Error: ${err.message}`;
  }
}

// Open Workspace Dialog
btnOpenWorkspace.addEventListener('click', async () => {
  if (!window.noxiden) return;
  const selected = await window.noxiden.openWorkspaceDialog();
  if (selected) {
    currentWorkspacePath = selected;
    workspaceLabel.innerHTML = `<span>📁 ${selected.split(/[\\/]/).pop()}</span>`;
    footerStatus.innerText = `Workspace loaded: ${selected}`;
    
    // Load Tree
    const tree = await window.noxiden.getWorkspaceTree(selected);
    renderTree(tree, fileTree);
    fileCount.innerText = `${tree.length} items`;
  }
});

// Chat message rendering
function appendMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerText = text;
  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Send Chat to Model
async function handleSend() {
  const text = agentInput.value.trim();
  if (!text || !window.noxiden) return;

  const [providerId, modelName] = modelSelect.value.split(':');

  appendMessage('user', text);
  messages.push({
    id: String(Date.now()),
    role: 'user',
    content: text,
    timestamp: Date.now()
  });

  agentInput.value = '';
  footerStatus.innerText = `Waiting for ${modelName}...`;

  try {
    const res = await window.noxiden.sendMessage(providerId, modelName, messages);
    appendMessage('assistant', res.reply || '(Empty response)');
    messages.push({
      id: String(Date.now()),
      role: 'assistant',
      content: res.reply,
      timestamp: Date.now()
    });
    footerStatus.innerText = 'Ready';
  } catch (err) {
    appendMessage('system', `Error: ${err.message}`);
    footerStatus.innerText = 'Model call failed';
  }
}

btnSendPrompt.addEventListener('click', handleSend);
agentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

