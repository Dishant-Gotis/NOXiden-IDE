import { contextBridge, ipcRenderer } from 'electron';
import { AgentStepEvent } from '../core/agent/orchestrator';
import {
  ChatMessage,
  GitWorkspaceStatus,
  MetricSummary,
  NoxidenAPI,
  ProviderConfig,
  SearchResult,
  SymbolDefinition
} from '../shared/types';

export interface ExtendedNoxidenAPI extends NoxidenAPI {
  runAgentTask: (
    prompt: string,
    providerId: string,
    model: string
  ) => Promise<{ success: boolean; finalReply: string; metrics?: MetricSummary }>;
  onAgentStep: (callback: (event: AgentStepEvent) => void) => () => void;
}

const api: ExtendedNoxidenAPI = {
  openWorkspaceDialog: async () => {
    return await ipcRenderer.invoke('workspace:open-dialog');
  },

  getWorkspaceTree: async (rootPath: string) => {
    return await ipcRenderer.invoke('workspace:get-tree', rootPath);
  },

  readFile: async (filePath: string) => {
    return await ipcRenderer.invoke('workspace:read-file', filePath);
  },

  writeFile: async (filePath: string, content: string) => {
    return await ipcRenderer.invoke('workspace:write-file', filePath, content);
  },

  getProviders: async () => {
    return await ipcRenderer.invoke('provider:list');
  },

  saveProvider: async (config: ProviderConfig) => {
    return await ipcRenderer.invoke('provider:save', config);
  },

  testProviderConnection: async (config: ProviderConfig) => {
    return await ipcRenderer.invoke('provider:test', config);
  },

  sendMessage: async (providerId: string, model: string, messages: ChatMessage[]) => {
    return await ipcRenderer.invoke('agent:send-message', providerId, model, messages);
  },

  runAgentTask: async (prompt: string, providerId: string, model: string) => {
    return await ipcRenderer.invoke('agent:run-task', prompt, providerId, model);
  },

  onAgentStep: (callback: (event: AgentStepEvent) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, stepEvent: AgentStepEvent) => {
      callback(stepEvent);
    };
    ipcRenderer.on('agent:step', handler);
    return () => {
      ipcRenderer.removeListener('agent:step', handler);
    };
  },

  approveAction: async (actionId: string) => {
    return await ipcRenderer.invoke('agent:approve-action', actionId);
  },

  rejectAction: async (actionId: string, reason?: string) => {
    return await ipcRenderer.invoke('agent:reject-action', actionId, reason);
  },

  proposeCommand: async (command: string, cwd?: string, explanation?: string) => {
    return await ipcRenderer.invoke('terminal:propose-command', command, cwd, explanation);
  },

  approveAndRunCommand: async (proposalId: string) => {
    return await ipcRenderer.invoke('terminal:approve-and-run', proposalId);
  },

  rejectCommand: async (proposalId: string, reason?: string) => {
    return await ipcRenderer.invoke('terminal:reject', proposalId, reason);
  },

  executeManualCommand: async (command: string) => {
    return await ipcRenderer.invoke('terminal:run-manual', command);
  },

  getGitStatus: async (): Promise<GitWorkspaceStatus> => {
    return await ipcRenderer.invoke('git:get-status');
  },

  getGitDiffWithHead: async (filePath: string): Promise<{ original: string; modified: string }> => {
    return await ipcRenderer.invoke('git:diff-with-head', filePath);
  },

  stageGitFile: async (filePath: string): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:stage-file', filePath);
  },

  unstageGitFile: async (filePath: string): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:unstage-file', filePath);
  },

  getGitStagedDiff: async (): Promise<string> => {
    return await ipcRenderer.invoke('git:staged-diff');
  },

  commitGit: async (message: string): Promise<{ success: boolean; hash?: string; error?: string }> => {
    return await ipcRenderer.invoke('git:commit', message);
  },

  searchInFiles: async (
    query: string,
    isRegex = false,
    maxResults = 100
  ): Promise<SearchResult> => {
    return await ipcRenderer.invoke('search:find-in-files', query, isRegex, maxResults);
  },

  findSymbols: async (query?: string): Promise<SymbolDefinition[]> => {
    return await ipcRenderer.invoke('search:find-symbols', query);
  }
};

contextBridge.exposeInMainWorld('noxiden', api);
