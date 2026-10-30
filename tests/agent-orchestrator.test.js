const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { AgentOrchestrator } = require('../dist/core/agent/orchestrator.js');
const { WorkspaceService } = require('../dist/main/workspace-service.js');
const { TerminalExecutor } = require('../dist/main/terminal-executor.js');
const { ProviderRegistry } = require('../dist/core/providers/registry.js');

test('AgentOrchestrator - Tool definitions & Guarded Execution Loop', async (t) => {
  const workspaceDir = path.resolve(__dirname, 'fixtures', 'agent-workspace');
  fs.mkdirSync(workspaceDir, { recursive: true });

  const workspace = new WorkspaceService();
  workspace.setWorkspaceRoot(workspaceDir);

  const terminal = new TerminalExecutor(workspace);
  const providers = new ProviderRegistry();
  const orchestrator = new AgentOrchestrator(workspace, terminal, providers);

  await t.test('declares valid agent tools matching OpenAI function calling schema', () => {
    const tools = orchestrator.getToolDefinitions();
    assert.strictEqual(tools.length, 5);

    const names = tools.map((t) => t.function.name);
    assert.ok(names.includes('read_file'));
    assert.ok(names.includes('write_file'));
    assert.ok(names.includes('list_directory'));
    assert.ok(names.includes('run_command'));
    assert.ok(names.includes('search_in_files'));
  });

  await t.test('mock task execution with write_file emits diff proposal approval event', async () => {
    // Setup a mock provider that calls write_file
    const mockProviderConfig = {
      id: 'mock_test_provider',
      name: 'Mock Provider',
      type: 'openai_compatible',
      baseUrl: 'http://localhost:9999',
      defaultModel: 'mock-model',
      availableModels: ['mock-model'],
      isLocal: true,
      contextWindow: 16000
    };

    providers.saveProvider(mockProviderConfig);

    // Override adapter complete to simulate tool call
    const adapter = providers.getAdapter('mock_test_provider');
    let callCount = 0;
    adapter.complete = async (req) => {
      callCount++;
      if (callCount === 1) {
        return {
          content: 'I will write the file',
          toolCalls: [
            {
              id: 'call_write_1',
              name: 'write_file',
              arguments: {
                filePath: path.join(workspaceDir, 'hello.txt'),
                content: 'Hello from NOXiden Agent!'
              }
            }
          ],
          latencyMs: 10
        };
      }
      return {
        content: 'Task completed!',
        latencyMs: 10
      };
    };

    const emittedEvents = [];
    await orchestrator.runTask(
      'Create hello.txt',
      'mock_test_provider',
      'mock-model',
      (evt) => emittedEvents.push(evt),
      3
    );

    const approvalEvent = emittedEvents.find(
      (e) => e.type === 'approval_required' && e.diffProposal
    );
    assert.ok(approvalEvent);
    assert.strictEqual(approvalEvent.diffProposal.proposed, 'Hello from NOXiden Agent!');
  });

  // Cleanup
  fs.rmSync(workspaceDir, { recursive: true, force: true });
});
