/**
 * NOXiden IDE - Shared Core Types
 * Used across Main, Preload, and Renderer processes
 */

export interface WorkspaceFile {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  children?: WorkspaceFile[];
}

export type ProviderType = 'openai_compatible' | 'anthropic' | 'gemini' | 'ollama' | 'local_custom' | 'huggingface';

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  defaultModel: string;
  availableModels: string[];
  isLocal: boolean;
  contextWindow: number;
}

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolExecutionRequest {
  id: string;
  toolName: string;
  arguments: Record<string, unknown>;
  description: string;
  requiresApproval: boolean;
}

export interface ToolExecutionResult {
  toolCallId: string;
  success: boolean;
  output: string;
  error?: string;
}

export type CommandRiskLevel = 'safe' | 'standard' | 'high_risk';

export interface CommandProposal {
  id: string;
  command: string;
  cwd?: string;
  riskLevel: CommandRiskLevel;
  explanation?: string;
  status: 'pending' | 'approved' | 'rejected' | 'running' | 'completed' | 'failed' | 'timed_out';
  createdAt: number;
}

export interface CommandExecutionResult {
  proposalId: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export interface GitFileStatus {
  path: string;
  relativePath: string;
  statusCode: string; // 'M' | 'A' | 'D' | '??'
  isStaged: boolean;
}

export interface GitWorkspaceStatus {
  isRepo: boolean;
  branch: string | null;
  files: GitFileStatus[];
}

export interface MetricSummary {
  latencyMs: number;
  tokensPerSec?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  provenance: 'locally_measured' | 'provider_reported' | 'estimated';
}

export interface AgentTaskState {
  taskId: string;
  status: 'idle' | 'planning' | 'executing' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
  pendingApproval?: ToolExecutionRequest;
  metrics?: MetricSummary;
}

export interface SearchMatch {
  filePath: string;
  relativePath: string;
  lineNumber: number;
  column: number;
  lineContent: string;
}

export interface SearchResult {
  query: string;
  totalMatches: number;
  durationMs: number;
  matches: SearchMatch[];
}

export interface SymbolDefinition {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'struct' | 'type' | 'enum';
  filePath: string;
  relativePath: string;
  lineNumber: number;
  signature: string;
  estimatedTokens: number;
}

export interface NoxidenAPI {
  // Workspace operations
  openWorkspaceDialog: () => Promise<string | null>;
  getWorkspaceTree: (rootPath: string) => Promise<WorkspaceFile[]>;
  readFile: (filePath: string) => Promise<string>;
  writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
  
  // Provider operations
  getProviders: () => Promise<ProviderConfig[]>;
  saveProvider: (config: ProviderConfig) => Promise<{ success: boolean; error?: string }>;
  testProviderConnection: (config: ProviderConfig) => Promise<{ success: boolean; latencyMs?: number; error?: string }>;
  
  // Agent & Chat operations
  sendMessage: (providerId: string, model: string, messages: ChatMessage[]) => Promise<{ reply: string; toolCalls?: ToolCall[]; metrics?: MetricSummary }>;
  runAgentTask: (prompt: string, providerId: string, model: string) => Promise<{ success: boolean; finalReply: string; metrics?: MetricSummary }>;
  onAgentStep: (callback: (event: unknown) => void) => () => void;
  approveAction: (actionId: string) => Promise<{ success: boolean; error?: string }>;
  rejectAction: (actionId: string, reason?: string) => Promise<{ success: boolean }>;

  // Terminal & Command Execution operations (with explicit approval gate)
  proposeCommand: (command: string, cwd?: string, explanation?: string) => Promise<CommandProposal>;
  approveAndRunCommand: (proposalId: string) => Promise<CommandExecutionResult>;
  rejectCommand: (proposalId: string, reason?: string) => Promise<{ success: boolean }>;
  executeManualCommand: (command: string) => Promise<CommandExecutionResult>;

  // Git operations
  getGitStatus: () => Promise<GitWorkspaceStatus>;
  getGitDiffWithHead: (filePath: string) => Promise<{ original: string; modified: string }>;
  stageGitFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  unstageGitFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  getGitStagedDiff: () => Promise<string>;
  commitGit: (message: string) => Promise<{ success: boolean; hash?: string; error?: string }>;

  // High-performance search and symbol indexing
  searchInFiles: (query: string, isRegex?: boolean, maxResults?: number) => Promise<SearchResult>;
  findSymbols: (query?: string) => Promise<SymbolDefinition[]>;
}
