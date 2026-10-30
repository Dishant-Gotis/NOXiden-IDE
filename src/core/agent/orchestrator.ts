import { SearchService } from '../../main/search-service';
import { TerminalExecutor } from '../../main/terminal-executor';
import { WorkspaceService } from '../../main/workspace-service';
import { ChatMessage, MetricSummary, ToolCall } from '../../shared/types';
import { ProviderRegistry } from '../providers/registry';

export interface AgentStepEvent {
  step: number;
  type: 'thinking' | 'tool_call' | 'approval_required' | 'tool_result' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  toolResult?: unknown;
  metrics?: MetricSummary;
  diffProposal?: {
    filePath: string;
    original: string;
    proposed: string;
  };
  commandProposal?: {
    id: string;
    command: string;
    riskLevel: string;
  };
}

export class AgentOrchestrator {
  private workspaceService: WorkspaceService;
  private terminalExecutor: TerminalExecutor;
  private providerRegistry: ProviderRegistry;
  private searchService?: SearchService;

  constructor(
    workspaceService: WorkspaceService,
    terminalExecutor: TerminalExecutor,
    providerRegistry: ProviderRegistry,
    searchService?: SearchService
  ) {
    this.workspaceService = workspaceService;
    this.terminalExecutor = terminalExecutor;
    this.providerRegistry = providerRegistry;
    this.searchService = searchService;
  }

  public getToolDefinitions(): unknown[] {
    return [
      {
        type: 'function',
        function: {
          name: 'read_file',
          description: 'Read the text content of a file within the workspace.',
          parameters: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Relative or absolute path of the file to read'
              }
            },
            required: ['filePath']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'write_file',
          description: 'Propose creating or updating a file with new content. Triggers a side-by-side diff review for user approval before writing.',
          parameters: {
            type: 'object',
            properties: {
              filePath: {
                type: 'string',
                description: 'Relative or absolute path of the file to write'
              },
              content: {
                type: 'string',
                description: 'The complete new content of the file'
              }
            },
            required: ['filePath', 'content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'list_directory',
          description: 'List files and directories in the workspace.',
          parameters: {
            type: 'object',
            properties: {
              dirPath: {
                type: 'string',
                description: 'Directory path to list (defaults to workspace root)'
              }
            }
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'run_command',
          description: 'Propose running a terminal command (e.g. npm test, cargo check, git status). Triggers user approval before execution.',
          parameters: {
            type: 'object',
            properties: {
              command: {
                type: 'string',
                description: 'The shell command to execute'
              },
              explanation: {
                type: 'string',
                description: 'Brief reason why this command is necessary'
              }
            },
            required: ['command']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'search_in_files',
          description: 'Search for text or regex across workspace files.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Text pattern or regex to search for'
              },
              isRegex: {
                type: 'boolean',
                description: 'Set to true if query is a regular expression'
              }
            },
            required: ['query']
          }
        }
      }
    ];
  }

  public async runTask(
    userPrompt: string,
    providerId: string,
    modelName: string,
    onStep: (event: AgentStepEvent) => void,
    maxSteps = 8
  ): Promise<{ success: boolean; finalReply: string; metrics?: MetricSummary }> {
    const adapter = this.providerRegistry.getAdapter(providerId);
    if (!adapter) {
      throw new Error(`Provider adapter "${providerId}" not found`);
    }

    const systemPrompt = `You are NOXiden Agent, an expert pair-programming and code-generation assistant operating inside NOXiden native desktop IDE.
You have tools to read files, propose code changes via diff review, list directory trees, and propose terminal commands.
Always inspect files before modifying them.
When editing code, write clean, complete code and verify your changes.
Never assume a file exists without checking.
Keep answers concise, direct, and focused on code.`;

    const messages: ChatMessage[] = [
      {
        id: 'sys_' + Date.now(),
        role: 'system',
        content: systemPrompt,
        timestamp: Date.now()
      },
      {
        id: 'user_' + Date.now(),
        role: 'user',
        content: userPrompt,
        timestamp: Date.now()
      }
    ];

    let step = 0;
    let finalReply = '';
    let lastMetrics: MetricSummary | undefined;

    while (step < maxSteps) {
      step++;
      onStep({ step, type: 'thinking', content: `Agent step ${step}...` });

      const response = await adapter.complete({
        model: modelName,
        messages,
        tools: this.getToolDefinitions()
      });

      lastMetrics = response.metrics;

      if (response.content) {
        finalReply = response.content;
      }

      // Check if model called any tools
      const toolCalls = response.toolCalls || [];

      // If no tool calls, model gave final answer
      if (toolCalls.length === 0) {
        onStep({ step, type: 'done', content: finalReply, metrics: response.metrics });
        break;
      }

      // Record assistant message with tool calls
      messages.push({
        id: 'ast_' + Date.now(),
        role: 'assistant',
        content: response.content || '',
        timestamp: Date.now(),
        toolCalls
      });

      // Execute tool calls
      for (const call of toolCalls) {
        onStep({ step, type: 'tool_call', toolCall: call });

        let resultString = '';

        try {
          if (call.name === 'read_file') {
            const filePath = String(call.arguments.filePath);
            const content = await this.workspaceService.readFile(filePath);
            resultString = content;
            onStep({ step, type: 'tool_result', toolResult: { filePath, bytes: content.length } });
          } else if (call.name === 'list_directory') {
            const dir = String(call.arguments.dirPath || this.workspaceService.getWorkspaceRoot());
            const tree = await this.workspaceService.getDirectoryTree(dir);
            resultString = JSON.stringify(tree.map((t) => ({ name: t.name, isDir: t.isDirectory })));
            onStep({ step, type: 'tool_result', toolResult: resultString });
          } else if (call.name === 'write_file') {
            const filePath = String(call.arguments.filePath);
            const newContent = String(call.arguments.content);
            let originalContent = '';
            try {
              originalContent = await this.workspaceService.readFile(filePath);
            } catch {
              originalContent = '// New file';
            }

            // Emit diff proposal for user review
            onStep({
              step,
              type: 'approval_required',
              diffProposal: {
                filePath,
                original: originalContent,
                proposed: newContent
              }
            });

            resultString = `Diff proposal submitted to user for review on ${filePath}. Awaiting approval.`;
          } else if (call.name === 'run_command') {
            const command = String(call.arguments.command);
            const explanation = String(call.arguments.explanation || '');
            const proposal = this.terminalExecutor.proposeCommand(command, undefined, explanation);

            // Emit command proposal for user review
            onStep({
              step,
              type: 'approval_required',
              commandProposal: {
                id: proposal.id,
                command: proposal.command,
                riskLevel: proposal.riskLevel
              }
            });

            resultString = `Command proposal [${proposal.id}: ${command}] queued for user approval.`;
          } else if (call.name === 'search_in_files') {
            const query = String(call.arguments.query || '');
            const isRegex = Boolean(call.arguments.isRegex);
            if (this.searchService) {
              const res = await this.searchService.searchInFiles(query, isRegex, 25);
              resultString = JSON.stringify(
                res.matches.map((m) => ({
                  file: m.relativePath,
                  line: m.lineNumber,
                  snippet: m.lineContent
                }))
              );
            } else {
              resultString = 'Search service not configured.';
            }
          } else {
            resultString = `Error: Unknown tool "${call.name}"`;
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          resultString = `Tool execution error: ${msg}`;
          onStep({ step, type: 'error', content: resultString });
        }

        // Return tool response to model
        messages.push({
          id: 'tool_' + Date.now(),
          role: 'tool',
          content: resultString,
          timestamp: Date.now(),
          toolCallId: call.id
        });
      }
    }

    return {
      success: true,
      finalReply,
      metrics: lastMetrics
    };
  }
}
