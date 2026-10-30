// NOXiden Renderer Client Script
// Full Monaco Editor, Side-by-Side Diff Review, Native Terminal & Agent Loop Engine

let normalEditor = null;
let diffEditor = null;
let currentWorkspacePath = null;
let activeFilePath = null;
let activeDiffFilePath = null;
let isSideBySide = true;

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

// Terminal Elements
const terminalDrawer = document.getElementById('terminalDrawer');
const btnToggleTerminal = document.getElementById('btnToggleTerminal');
const btnCloseTerminal = document.getElementById('btnCloseTerminal');
const btnClearTerminal = document.getElementById('btnClearTerminal');
const terminalOutput = document.getElementById('terminalOutput');
const terminalInput = document.getElementById('terminalInput');
const terminalExecStatus = document.getElementById('terminalExecStatus');

// Settings Elements
const settingsModal = document.getElementById('settingsModal');
const btnHeaderSettings = document.getElementById('btnHeaderSettings');
const btnActivitySettings = document.getElementById('btnActivitySettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnCancelSettings = document.getElementById('btnCancelSettings');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const btnTestConnection = document.getElementById('btnTestConnection');
const settingProviderId = document.getElementById('settingProviderId');
const settingBaseUrl = document.getElementById('settingBaseUrl');
const settingApiKey = document.getElementById('settingApiKey');
const settingModelName = document.getElementById('settingModelName');
const testResultMsg = document.getElementById('testResultMsg');

// Git & Metrics Elements
const footerGitBranch = document.getElementById('footerGitBranch');
const footerGitStatus = document.getElementById('footerGitStatus');
const footerMetrics = document.getElementById('footerMetrics');
const metricsDisplay = document.getElementById('metricsDisplay');
const tokenCounter = document.getElementById('tokenCounter');

let currentGitFiles = new Map(); // path -> statusCode

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

const initialWelcomeText = `# Welcome to NOXiden IDE

NOXiden is an installable native desktop development environment built for local-first autonomy and high-performance pairing.

### Core Capabilities
- **Monaco Engine:** Native syntax parsing, tokenization, and code navigation.
- **Side-by-Side Diff Review:** Inspect and approve AI agent edits before touching disk.
- **Native Terminal Execution:** Approved shell execution in local workspace.
- **Provider Agnostic:** Local GPU inference (Ollama / custom fine-tuned model) + Cloud API keys.

Use "Open Folder" in the top bar to inspect your project.
`;

// Initialize Monaco Editor via AMD loader
require.config({ paths: { vs: './vs' } });

require(['vs/editor/editor.main'], function () {
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

  normalEditor = monaco.editor.create(editorContainer, {
    value: initialWelcomeText,
    language: 'markdown',
    theme: 'noxiden-dark',
    automaticLayout: true,
    fontSize: 13,
    fontFamily: "'Consolas', 'Fira Code', 'Cascadia Code', monospace",
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    tabSize: 2
  });

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

// Git Status & Diff Inspection
async function showGitDiffWithHead(filePath, fileName) {
  if (!window.noxiden) return;
  try {
    footerStatus.innerText = `Loading Git diff for ${fileName}...`;
    const diff = await window.noxiden.getGitDiffWithHead(filePath);
    openDiffReview(filePath, diff.original, diff.modified);
    diffFileName.innerText = `${fileName} (HEAD ⇄ Working Tree)`;
    footerStatus.innerText = `Comparing ${fileName} with Git HEAD`;
  } catch (err) {
    footerStatus.innerText = `Diff error: ${err.message}`;
  }
}

async function refreshGitStatus() {
  if (!window.noxiden || !window.noxiden.getGitStatus) return;
  try {
    const gitStatus = await window.noxiden.getGitStatus();
    if (footerGitBranch) {
      footerGitBranch.innerText = gitStatus.isRepo ? `⎇ ${gitStatus.branch || 'detached'}` : '⎇ (no git)';
    }
    if (footerGitStatus) {
      footerGitStatus.innerText = !gitStatus.isRepo ? 'No Git' : (gitStatus.files.length === 0 ? 'Clean' : `${gitStatus.files.length} modified`);
    }
    currentGitFiles = new Map(gitStatus.files.map((f) => [f.path, f.statusCode]));
  } catch (err) {
    console.error('Git status error:', err);
  }
}

function updateMetricsUI(metrics) {
  if (!metrics) return;
  const tps = metrics.tokensPerSec ? `${metrics.tokensPerSec} t/s` : '';
  const tokens = metrics.totalTokens ? `${metrics.totalTokens} tokens` : '';
  const latency = `${metrics.latencyMs}ms`;
  const prov = `[${metrics.provenance}]`;

  if (metricsDisplay) {
    metricsDisplay.style.display = 'inline';
    metricsDisplay.innerText = `${latency} • ${tps || tokens} ${prov}`;
  }

  if (footerMetrics) {
    footerMetrics.style.display = 'inline';
    footerMetrics.innerText = `${latency} • ${tps ? tps + ' • ' : ''}${prov}`;
  }

  if (tokenCounter && metrics.totalTokens) {
    tokenCounter.innerText = `${metrics.totalTokens} tokens`;
  }
}

// Accept and Apply Diff
btnAcceptDiff.addEventListener('click', async () => {
  if (!activeDiffFilePath || !diffEditor || !window.noxiden) return;

  const modifiedModel = diffEditor.getModel().modified;
  const newContent = modifiedModel.getValue();

  footerStatus.innerText = 'Applying changes to disk...';
  const res = await window.noxiden.writeFile(activeDiffFilePath, newContent);

  if (res.success) {
    if (activeFilePath === activeDiffFilePath && normalEditor) {
      normalEditor.setValue(newContent);
    }

    appendMessage('system', `✓ Changes accepted and applied to: ${activeDiffFilePath.split(/[\\/]/).pop()}`);
    closeDiffReview();
    footerStatus.innerText = 'Changes applied successfully';
    await refreshGitStatus();
    if (currentWorkspacePath) {
      const tree = await window.noxiden.getWorkspaceTree(currentWorkspacePath);
      renderTree(tree, fileTree);
    }
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

// Test Diff button
btnTestDiff.addEventListener('click', () => {
  const sampleOriginal = `// NOXiden Agent Core Service\nexport class AgentService {\n  private timeoutMs = 5000;\n\n  public executeTask(taskName: string): boolean {\n    console.log("Running task:", taskName);\n    return true;\n  }\n}`;
  const sampleProposed = `// NOXiden Agent Core Service\nexport class AgentService {\n  private timeoutMs = 10000; // Increased timeout for deep analysis\n\n  public executeTask(taskName: string): boolean {\n    console.log("Running task with security validation:", taskName);\n    this.validateTaskSecurity(taskName);\n    return true;\n  }\n\n  private validateTaskSecurity(taskName: string): void {\n    // Validate workspace boundary\n  }\n}`;
  openDiffReview('src/core/agent/service.ts', sampleOriginal, sampleProposed);
});

// Terminal Operations
function appendTerminalOutput(text) {
  terminalOutput.innerText += '\n' + text;
  terminalOutput.scrollTop = terminalOutput.scrollHeight;
}

function openTerminal() {
  terminalDrawer.classList.remove('collapsed');
}

btnToggleTerminal.addEventListener('click', () => {
  terminalDrawer.classList.toggle('collapsed');
});

btnCloseTerminal.addEventListener('click', () => {
  terminalDrawer.classList.add('collapsed');
});

btnClearTerminal.addEventListener('click', () => {
  terminalOutput.innerText = 'NOXiden Native Process Shell initialized.';
});

terminalInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const cmd = terminalInput.value.trim();
    if (!cmd || !window.noxiden) return;
    terminalInput.value = '';
    appendTerminalOutput(`> ${cmd}`);
    terminalExecStatus.innerText = 'RUNNING';

    const res = await window.noxiden.executeManualCommand(cmd);
    terminalExecStatus.innerText = res.exitCode === 0 ? 'EXIT 0' : `EXIT ${res.exitCode}`;
    if (res.stdout) appendTerminalOutput(res.stdout);
    if (res.stderr) appendTerminalOutput(res.stderr);
    await refreshGitStatus();
    if (currentWorkspacePath) {
      const tree = await window.noxiden.getWorkspaceTree(currentWorkspacePath);
      renderTree(tree, fileTree);
    }
  }
});

// Open Workspace Dialog
btnOpenWorkspace.addEventListener('click', async () => {
  if (!window.noxiden) return;
  const selected = await window.noxiden.openWorkspaceDialog();
  if (selected) {
    currentWorkspacePath = selected;
    workspaceLabel.innerHTML = `<span>📁 ${selected.split(/[\\/]/).pop()}</span>`;
    footerStatus.innerText = `Workspace loaded: ${selected}`;
    
    await refreshGitStatus();
    const tree = await window.noxiden.getWorkspaceTree(selected);
    renderTree(tree, fileTree);
    fileCount.innerText = `${tree.length} items`;
  }
});

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
      const gitCode = currentGitFiles.get(item.path);
      if (gitCode) {
        const badge = document.createElement('span');
        badge.className = `git-badge ${gitCode === '??' ? 'untracked' : gitCode}`;
        badge.innerText = gitCode;
        badge.title = `Git status: ${gitCode} — click to view diff against HEAD`;
        badge.addEventListener('click', async (e) => {
          e.stopPropagation();
          await showGitDiffWithHead(item.path, item.name);
        });
        el.appendChild(badge);
      }

      el.addEventListener('click', async () => {
        document.querySelectorAll('.tree-item').forEach((t) => t.classList.remove('active'));
        el.classList.add('active');
        await openFile(item.path, item.name);
      });
      container.appendChild(el);
    }
  });
}

// Chat message rendering with Diff Proposal & Terminal Proposal cards
function appendMessage(role, text, options = {}) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.innerText = text;

  // Diff Proposal Card
  if (options.diffProposal) {
    const diff = options.diffProposal;
    const card = document.createElement('div');
    card.className = 'diff-proposal-card';
    card.innerHTML = `
      <div class="diff-proposal-title">
        <span>Proposed Edit</span>
        <span style="color: var(--badge-local);">${diff.filePath}</span>
      </div>
      <button class="btn-review-diff" style="background: var(--accent); color: #fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; width:100%; font-size:11px; font-weight:600;">🔍 Review Side-by-Side Diff</button>
    `;

    card.querySelector('button').addEventListener('click', () => {
      openDiffReview(diff.filePath, diff.original, diff.proposed);
    });

    bubble.appendChild(card);
  }

  // Terminal Command Proposal Card (Approval Gate)
  if (options.commandProposal) {
    const cmd = options.commandProposal;
    const riskClass = cmd.riskLevel === 'high_risk' ? 'risk-high' : cmd.riskLevel === 'safe' ? 'risk-safe' : 'risk-standard';
    const riskLabel = cmd.riskLevel.toUpperCase();

    const card = document.createElement('div');
    card.className = 'cmd-proposal-card';
    card.innerHTML = `
      <div class="cmd-proposal-title">
        <span>Terminal Execution Request</span>
        <span class="${riskClass}">[${riskLabel}]</span>
      </div>
      <div class="cmd-code-block">${cmd.command}</div>
      <div class="cmd-actions">
        <button class="btn-action-small" id="runCmd_${cmd.id}" style="background-color:#10b981; color:#fff;">▶ Approve & Run</button>
        <button class="btn-action-small" id="rejCmd_${cmd.id}" style="background-color:#ef4444; color:#fff;">✕ Reject</button>
      </div>
    `;

    card.querySelector(`#runCmd_${cmd.id}`).addEventListener('click', async () => {
      openTerminal();
      appendTerminalOutput(`[APPROVED] Running: ${cmd.command}`);
      terminalExecStatus.innerText = 'RUNNING';

      card.querySelector('.cmd-actions').innerHTML = `<span style="font-size:11px; color:#10b981;">✓ Approved & Dispatched</span>`;

      try {
        const res = await window.noxiden.approveAndRunCommand(cmd.id);
        terminalExecStatus.innerText = res.exitCode === 0 ? 'EXIT 0' : `EXIT ${res.exitCode}`;
        if (res.stdout) appendTerminalOutput(res.stdout);
        if (res.stderr) appendTerminalOutput(res.stderr);
        appendMessage('system', `Command "${cmd.command}" finished with exit code ${res.exitCode} (${res.durationMs}ms)`);
        await refreshGitStatus();
        if (currentWorkspacePath) {
          const tree = await window.noxiden.getWorkspaceTree(currentWorkspacePath);
          renderTree(tree, fileTree);
        }
      } catch (err) {
        terminalExecStatus.innerText = 'ERROR';
        appendTerminalOutput(`Error: ${err.message}`);
      }
    });

    card.querySelector(`#rejCmd_${cmd.id}`).addEventListener('click', async () => {
      await window.noxiden.rejectCommand(cmd.id, 'User rejected');
      card.querySelector('.cmd-actions').innerHTML = `<span style="font-size:11px; color:#ef4444;">✕ Rejected by User</span>`;
      appendMessage('system', `Command "${cmd.command}" was rejected.`);
    });

    bubble.appendChild(card);
  }

  chatHistory.appendChild(bubble);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Agent Loop Runner
if (window.noxiden && window.noxiden.onAgentStep) {
  window.noxiden.onAgentStep((stepEvent) => {
    if (stepEvent.type === 'thinking') {
      footerStatus.innerText = stepEvent.content || 'Thinking...';
    } else if (stepEvent.type === 'tool_call') {
      appendMessage('system', `⚙️ Agent calling tool: ${stepEvent.toolCall.name}`);
    } else if (stepEvent.type === 'approval_required') {
      if (stepEvent.diffProposal) {
        appendMessage('assistant', `I proposed an edit for "${stepEvent.diffProposal.filePath}". Please review the side-by-side diff.`, {
          diffProposal: stepEvent.diffProposal
        });
        openDiffReview(stepEvent.diffProposal.filePath, stepEvent.diffProposal.original, stepEvent.diffProposal.proposed);
      } else if (stepEvent.commandProposal) {
        appendMessage('assistant', `I need to execute a terminal command. Please approve or reject below:`, {
          commandProposal: stepEvent.commandProposal
        });
      }
    } else if (stepEvent.type === 'done') {
      if (stepEvent.content) {
        appendMessage('assistant', stepEvent.content);
      }
      footerStatus.innerText = 'Task completed';
      if (stepEvent.metrics) {
        updateMetricsUI(stepEvent.metrics);
      }
      refreshGitStatus();
    } else if (stepEvent.type === 'error') {
      appendMessage('system', `Error: ${stepEvent.content}`);
    }
  });
}

// Send Prompt / Run Agent Task
async function handleSend() {
  const text = agentInput.value.trim();
  if (!text || !window.noxiden) return;

  const [providerId, modelName] = modelSelect.value.split(':');

  appendMessage('user', text);
  agentInput.value = '';
  footerStatus.innerText = `Agent executing with ${modelName}...`;

  try {
    const res = await window.noxiden.runAgentTask(text, providerId, modelName);
    footerStatus.innerText = 'Ready';
    if (res.metrics) {
      updateMetricsUI(res.metrics);
    }
    await refreshGitStatus();
    if (currentWorkspacePath) {
      const tree = await window.noxiden.getWorkspaceTree(currentWorkspacePath);
      renderTree(tree, fileTree);
    }
  } catch (err) {
    appendMessage('system', `Task Error: ${err.message}`);
    footerStatus.innerText = 'Task failed';
  }
}

btnSendPrompt.addEventListener('click', handleSend);
agentInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Settings Modal Logic
function openSettings() {
  testResultMsg.style.display = 'none';
  settingsModal.style.display = 'flex';
  loadProviderIntoForm(settingProviderId.value);
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

btnHeaderSettings.addEventListener('click', openSettings);
btnActivitySettings.addEventListener('click', openSettings);
btnCloseSettings.addEventListener('click', closeSettings);
btnCancelSettings.addEventListener('click', closeSettings);

async function loadProviderIntoForm(id) {
  if (!window.noxiden) return;
  const providers = await window.noxiden.getProviders();
  const found = providers.find((p) => p.id === id);
  if (found) {
    settingBaseUrl.value = found.baseUrl;
    settingApiKey.value = found.apiKey || '';
    settingModelName.value = found.defaultModel;
  }
}

settingProviderId.addEventListener('change', () => {
  loadProviderIntoForm(settingProviderId.value);
});

btnTestConnection.addEventListener('click', async () => {
  if (!window.noxiden) return;
  testResultMsg.style.display = 'block';
  testResultMsg.style.color = '#38bdf8';
  testResultMsg.innerText = 'Testing connection...';

  const config = {
    id: settingProviderId.value,
    name: settingProviderId.options[settingProviderId.selectedIndex].text,
    type: settingProviderId.value === 'huggingface_endpoint' ? 'huggingface' : (settingProviderId.value.includes('local') ? 'local_custom' : 'openai_compatible'),
    baseUrl: settingBaseUrl.value.trim(),
    apiKey: settingApiKey.value.trim(),
    defaultModel: settingModelName.value.trim(),
    availableModels: [settingModelName.value.trim()],
    isLocal: settingProviderId.value.includes('local'),
    contextWindow: 65536
  };

  const res = await window.noxiden.testProviderConnection(config);
  if (res.success) {
    testResultMsg.style.color = '#10b981';
    testResultMsg.innerText = `✓ Connection successful! (${res.latencyMs}ms latency)`;
  } else {
    testResultMsg.style.color = '#ef4444';
    testResultMsg.innerText = `✕ Connection failed: ${res.error}`;
  }
});

btnSaveSettings.addEventListener('click', async () => {
  if (!window.noxiden) return;

  const config = {
    id: settingProviderId.value,
    name: settingProviderId.options[settingProviderId.selectedIndex].text,
    type: settingProviderId.value === 'huggingface_endpoint' ? 'huggingface' : (settingProviderId.value.includes('local') ? 'local_custom' : 'openai_compatible'),
    baseUrl: settingBaseUrl.value.trim(),
    apiKey: settingApiKey.value.trim(),
    defaultModel: settingModelName.value.trim(),
    availableModels: [settingModelName.value.trim()],
    isLocal: settingProviderId.value.includes('local'),
    contextWindow: 65536
  };

  const res = await window.noxiden.saveProvider(config);
  if (res.success) {
    appendMessage('system', `✓ Provider configuration updated for ${config.name}`);
    closeSettings();
    footerStatus.innerText = 'Provider settings saved';
  } else {
    alert(`Failed to save settings: ${res.error}`);
  }
});

// Periodic or initial git check
setTimeout(() => {
  refreshGitStatus();
}, 600);
