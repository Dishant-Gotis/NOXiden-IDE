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

export type ProviderType = 'openai_compatible' | 'anthropic' | 'gemini' | 'ollama' | 'local_custom';

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

export interface AgentTaskState {
  taskId: string;
  status: 'idle' | 'planning' | 'executing' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
  pendingApproval?: ToolExecutionRequest;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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
  sendMessage: (providerId: string, model: string, messages: ChatMessage[]) => Promise<{ reply: string; toolCalls?: ToolCall[] }>;
  approveAction: (actionId: string) => Promise<{ success: boolean; error?: string }>;
  rejectAction: (actionId: string, reason?: string) => Promise<{ success: boolean }>;
}

