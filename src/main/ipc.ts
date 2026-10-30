import { dialog, ipcMain } from 'electron';
import { AgentOrchestrator } from '../core/agent/orchestrator';
import { ProviderRegistry } from '../core/providers/registry';
import { ChatMessage, ProviderConfig } from '../shared/types';
import { GitService } from './git-service';
import { SearchService } from './search-service';
import { TerminalExecutor } from './terminal-executor';
import { WorkspaceService } from './workspace-service';

export function setupIpcHandlers(
  workspaceService: WorkspaceService,
  providerRegistry: ProviderRegistry,
  terminalExecutor: TerminalExecutor
): void {
  const searchService = new SearchService(workspaceService);
  const orchestrator = new AgentOrchestrator(
    workspaceService,
    terminalExecutor,
    providerRegistry,
    searchService
  );
  const gitService = new GitService(workspaceService);

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
        toolCalls: response.toolCalls,
        metrics: response.metrics
      };
    }
  );

  // Full Agentic Task Loop with real tool execution & human approval gates
  ipcMain.handle(
    'agent:run-task',
    async (event, userPrompt: string, providerId: string, modelName: string) => {
      return await orchestrator.runTask(
        userPrompt,
        providerId,
        modelName,
        (stepEvent) => {
          event.sender.send('agent:step', stepEvent);
        }
      );
    }
  );

  // --- Terminal Execution Handlers (with Explicit Approval Gate) ---
  ipcMain.handle(
    'terminal:propose-command',
    async (_event, command: string, cwd?: string, explanation?: string) => {
      return terminalExecutor.proposeCommand(command, cwd, explanation);
    }
  );

  ipcMain.handle('terminal:approve-and-run', async (_event, proposalId: string) => {
    return await terminalExecutor.approveAndExecute(proposalId);
  });

  ipcMain.handle('terminal:reject', async (_event, proposalId: string, reason?: string) => {
    return terminalExecutor.rejectCommand(proposalId, reason);
  });

  ipcMain.handle('terminal:run-manual', async (_event, command: string) => {
    return await terminalExecutor.executeManual(command);
  });

  // --- Git Subsystem Handlers ---
  ipcMain.handle('git:get-status', async () => {
    return await gitService.getStatus();
  });

  ipcMain.handle('git:diff-with-head', async (_event, filePath: string) => {
    const headContent = await gitService.getFileHeadContent(filePath);
    let workingContent = '';
    try {
      workingContent = await workspaceService.readFile(filePath);
    } catch {
      workingContent = '';
    }
    return {
      original: headContent,
      modified: workingContent
    };
  });

  ipcMain.handle('git:stage-file', async (_event, filePath: string) => {
    try {
      await gitService.stageFile(filePath);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  ipcMain.handle('git:unstage-file', async (_event, filePath: string) => {
    try {
      await gitService.unstageFile(filePath);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  ipcMain.handle('git:staged-diff', async () => {
    return await gitService.getStagedDiff();
  });

  ipcMain.handle('git:commit', async (_event, message: string) => {
    return await gitService.commit(message);
  });

  // --- Search & Symbol Indexing Handlers ---
  ipcMain.handle(
    'search:find-in-files',
    async (_event, query: string, isRegex = false, maxResults = 100) => {
      return await searchService.searchInFiles(query, isRegex, maxResults);
    }
  );

  ipcMain.handle('search:find-symbols', async (_event, query?: string) => {
    return await searchService.findSymbols(query);
  });
}
