import { dialog, ipcMain } from 'electron';
import { ProviderRegistry } from '../core/providers/registry';
import { ChatMessage, ProviderConfig } from '../shared/types';
import { WorkspaceService } from './workspace-service';

export function setupIpcHandlers(
  workspaceService: WorkspaceService,
  providerRegistry: ProviderRegistry
): void {
  // --- Workspace Handlers ---
  ipcMain.handle('workspace:open-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Open Workspace Folder'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    workspaceService.setWorkspaceRoot(selectedPath);
    return selectedPath;
  });

  ipcMain.handle('workspace:get-tree', async (_event, rootPath: string) => {
    if (!workspaceService.getWorkspaceRoot()) {
      workspaceService.setWorkspaceRoot(rootPath);
    }
    return await workspaceService.getDirectoryTree(rootPath);
  });

  ipcMain.handle('workspace:read-file', async (_event, filePath: string) => {
    return await workspaceService.readFile(filePath);
  });

  ipcMain.handle('workspace:write-file', async (_event, filePath: string, content: string) => {
    try {
      await workspaceService.writeFile(filePath, content);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // --- Provider Handlers ---
  ipcMain.handle('provider:list', async () => {
    return providerRegistry.getProviders(true);
  });

  ipcMain.handle('provider:save', async (_event, config: ProviderConfig) => {
    try {
      providerRegistry.saveProvider(config);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  ipcMain.handle('provider:test', async (_event, config: ProviderConfig) => {
    providerRegistry.saveProvider(config);
    const adapter = providerRegistry.getAdapter(config.id);
    if (!adapter) {
      return { success: false, error: 'Adapter not found' };
    }
    return await adapter.testConnection();
  });

  // --- Agent & Chat Handlers ---
  ipcMain.handle(
    'agent:send-message',
    async (_event, providerId: string, model: string, messages: ChatMessage[]) => {
      const adapter = providerRegistry.getAdapter(providerId);
      if (!adapter) {
        throw new Error(`Provider adapter "${providerId}" not found`);
      }

      const response = await adapter.complete({
        model,
        messages
      });

      return {
        reply: response.content,
        toolCalls: response.toolCalls
      };
    }
  );
}

