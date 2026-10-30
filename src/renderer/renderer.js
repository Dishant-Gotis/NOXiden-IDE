// NOXiden Renderer Client Script
// Full Monaco Editor & Side-by-Side Diff Review Engine

let normalEditor = null;
let diffEditor = null;
let currentWorkspacePath = null;
let activeFilePath = null;
let activeDiffFilePath = null;
let isSideBySide = true;
const messages = [];

// DOM Elements
const editorContainer = document.getElementById('editorContainer');
const diffReviewContainer = document.getElementById('diffReviewContainer');
const diffEditorWrapper = document.getElementById('diffEditorWrapper');
const diffFileName = document.getElementById('diffFileName');
const btnAcceptDiff = document.getElementById('btnAcceptDiff');
const btnRejectDiff = document.getElementById('btnRejectDiff');
const btnToggleSideBySide = document.getElementById('btnToggleSideBySide');
const btnTestDiff = document.getElementById('btnTestDiff');

const btnOpenWorkspace = document.getElementById('btnOpenWorkspace');
const workspaceLabel = document.getElementById('workspaceLabel');
const fileTree = document.getElementById('fileTree');
const fileCount = document.getElementById('fileCount');
const activeTabLabel = document.getElementById('activeTabLabel');
const modelSelect = document.getElementById('modelSelect');
const chatHistory = document.getElementById('chatHistory');
const agentInput = document.getElementById('agentInput');
const btnSendPrompt = document.getElementById('btnSendPrompt');
const footerStatus = document.getElementById('footerStatus');

// Language detector
function detectLanguage(filePath) {
  if (!filePath) return 'plaintext';
  const ext = filePath.split('.').pop().toLowerCase();
  const map = {
    rs: 'rust',
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    py: 'python',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    ps1: 'powershell',
    sql: 'sql',
    toml: 'ini'
  };
  return map[ext] || 'plaintext';
}

// Initial default content
const initialWelcomeText = `# Welcome to NOXiden IDE

NOXiden is an installable native desktop development environment built for local-first autonomy and high-performance pairing.

### Core Capabilities
- **Monaco Engine:** Native syntax parsing, tokenization, and code navigation.
- **Side-by-Side Diff Review:** Inspect and approve AI agent edits before touching disk.
- **Provider Agnostic:** Local GPU inference (Ollama / custom fine-tuned model) + Cloud fallback.
- **Workspace Security:** Safe sandboxed filesystem boundaries.

Use "Open Folder" in the top bar to inspect your project.
`;

// Initialize Monaco Editor via AMD loader
require.config({ paths: { vs: './vs' } });

require(['vs/editor/editor.main'], function () {
  // Define custom dark theme matching NOXiden design tokens
  monaco.editor.defineTheme('noxiden-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
      { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
      { token: 'string', foreground: '34d399' },
      { token: 'number', foreground: 'f59e0b' },
      { token: 'type', foreground: '38bdf8' }
    ],
    colors: {
      'editor.background': '#161622',
      'editor.foreground': '#f1f5f9',
      'editorCursor.foreground': '#6366f1',
      'editor.lineHighlightBackground': '#1e1e2f',
      'editorLineNumber.foreground': '#475569',
      'editorLineNumber.activeForeground': '#94a3b8',
      'editor.selectionBackground': '#3730a3',
      'diffEditor.insertedTextBackground': '#10b98125',
      'diffEditor.removedTextBackground': '#ef444425'
    }
  });

  // Standard Editor
  normalEditor = monaco.editor.create(editorContainer, {
    value: initialWelcomeText,
    language: 'markdown',
    theme: 'noxiden-dark',
    automaticLayout: true,
    fontSize: 13,
    fontFamily: "'Consolas', 'Fira Code', 'Cascadia Code', monospace",
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    tabSize: 2,
    renderLineHighlight: 'all'
  });

  // Side-by-Side Diff Editor
  diffEditor = monaco.editor.createDiffEditor(diffEditorWrapper, {
    enableSplitViewResizing: true,
    renderSideBySide: true,
    theme: 'noxiden-dark',
    automaticLayout: true,
    readOnly: false,
    originalEditable: false,
    fontSize: 13,
    fontFamily: "'Consolas', 'Fira Code', 'Cascadia Code', monospace"
  });

  footerStatus.innerText = 'Monaco Core Initialized';
});

// Save on Ctrl+S / Cmd+S
window.addEventListener('keydown', async (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (activeFilePath && normalEditor && window.noxiden) {
      footerStatus.innerText = 'Saving...';
      const content = normalEditor.getValue();
      const res = await window.noxiden.writeFile(activeFilePath, content);
      if (res.success) {
        footerStatus.innerText = `Saved: ${activeFilePath.split(/[\\/]/).pop()}`;
        setTimeout(() => (footerStatus.innerText = 'Ready'), 2000);
      } else {
        footerStatus.innerText = `Save Failed: ${res.error}`;
      }
    }
  }
});

// Open File in Standard Editor
async function openFile(filePath, fileName) {
  if (!window.noxiden || !normalEditor) return;
  try {
    closeDiffReview();
    footerStatus.innerText = `Loading ${fileName}...`;
    const content = await window.noxiden.readFile(filePath);
    const lang = detectLanguage(filePath);
    
    // Dispose previous model if needed
    const oldModel = normalEditor.getModel();
    const newModel = monaco.editor.createModel(content, lang);
    normalEditor.setModel(newModel);
    if (oldModel) oldModel.dispose();

    activeFilePath = filePath;
    activeTabLabel.innerText = fileName;
    footerStatus.innerText = `Viewing: ${fileName} (${lang})`;
  } catch (err) {
    footerStatus.innerText = `Error: ${err.message}`;
  }
}

// Side-by-Side Diff Review Functions
function openDiffReview(filePath, originalCode, proposedCode) {
  if (!diffEditor) return;

  activeDiffFilePath = filePath;
  diffFileName.innerText = filePath.split(/[\\/]/).pop();

  editorContainer.style.display = 'none';
  diffReviewContainer.style.display = 'flex';

  const lang = detectLanguage(filePath);
  const originalModel = monaco.editor.createModel(originalCode, lang);
  const modifiedModel = monaco.editor.createModel(proposedCode, lang);

  diffEditor.setModel({
    original: originalModel,
    modified: modifiedModel
  });

  footerStatus.innerText = `Reviewing Diff: ${filePath}`;
}

function closeDiffReview() {
  diffReviewContainer.style.display = 'none';
  editorContainer.style.display = 'block';
  activeDiffFilePath = null;
  if (normalEditor) {
    normalEditor.layout();
  }
  footerStatus.innerText = 'Ready';
}

// Accept and Apply Diff
btnAcceptDiff.addEventListener('click', async () => {
  if (!activeDiffFilePath || !diffEditor || !window.noxiden) return;

  const modifiedModel = diffEditor.getModel().modified;
  const newContent = modifiedModel.getValue();

  footerStatus.innerText = 'Applying changes to disk...';
  const res = await window.noxiden.writeFile(activeDiffFilePath, newContent);

  if (res.success) {
    // Update standard editor if active
    if (activeFilePath === activeDiffFilePath && normalEditor) {
      normalEditor.setValue(newContent);
    }

    appendMessage('system', `✓ Changes accepted and applied to: ${activeDiffFilePath.split(/[\\/]/).pop()}`);
    closeDiffReview();
    footerStatus.innerText = 'Changes applied successfully';
  } else {
    footerStatus.innerText = `Failed to apply: ${res.error}`;
  }
});

// Reject Diff
btnRejectDiff.addEventListener('click', () => {
  appendMessage('system', `✕ Diff review rejected for: ${activeDiffFilePath ? activeDiffFilePath.split(/[\\/]/).pop() : 'file'}`);
  closeDiffReview();
});

// Toggle Side-by-Side / Inline view
btnToggleSideBySide.addEventListener('click', () => {
  if (!diffEditor) return;
  isSideBySide = !isSideBySide;
  diffEditor.updateOptions({ renderSideBySide: isSideBySide });
  btnToggleSideBySide.innerText = isSideBySide ? '⇄ Toggle Inline' : '⇄ Toggle Side-by-Side';
});

// Quick Test Diff button (Activity Bar)
btnTestDiff.addEventListener('click', () => {
  const sampleOriginal = `// NOXiden Agent Core Service
export class AgentService {
  private timeoutMs = 5000;

  public executeTask(taskName: string): boolean {
    console.log("Running task:", taskName);
    return true;
  }
}`;

  const sampleProposed = `// NOXiden Agent Core Service
export class AgentService {
  private timeoutMs = 10000; // Increased timeout for deep analysis

  public executeTask(taskName: string): boolean {
    console.log("Running task with security validation:", taskName);
    this.validateTaskSecurity(taskName);
    return true;
  }

  private validateTaskSecurity(taskName: string): void {
    // Validate workspace boundary and policy
  }
}`;

  openDiffReview('src/core/agent/service.ts', sampleOriginal, sampleProposed);
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

// Chat message rendering with Diff Proposal card
function appendMessage(role, text, proposedDiff) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerText = text;

  if (proposedDiff) {
    const card = document.createElement('div');
    card.className = 'diff-proposal-card';
    card.innerHTML = `
      <div class="diff-proposal-title">
        <span>Proposed Edit</span>
        <span style="color: var(--badge-local);">${proposedDiff.filePath}</span>
      </div>
      <button class="btn-review-diff">🔍 Review Side-by-Side Diff</button>
    `;

    card.querySelector('.btn-review-diff').addEventListener('click', () => {
      openDiffReview(proposedDiff.filePath, proposedDiff.original, proposedDiff.proposed);
    });

    bubble.appendChild(card);
  }

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
    appendMessage('assistant', res.reply || '(No text content)');
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
