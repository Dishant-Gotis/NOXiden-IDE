import { contextBridge, ipcRenderer } from 'electron';
import { ChatMessage, NoxidenAPI, ProviderConfig } from '../shared/types';

const api: NoxidenAPI = {
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

  approveAction: async (actionId: string) => {
    return await ipcRenderer.invoke('agent:approve-action', actionId);
  },

  rejectAction: async (actionId: string, reason?: string) => {
    return await ipcRenderer.invoke('agent:reject-action', actionId, reason);
  }
};

contextBridge.exposeInMainWorld('noxiden', api);

