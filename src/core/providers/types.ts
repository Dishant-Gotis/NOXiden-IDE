import { ChatMessage, MetricSummary, ToolCall } from '../../shared/types';

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  tools?: unknown[];
}

export interface CompletionResponse {
  content: string;
  toolCalls?: ToolCall[];
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs: number;
  metrics: MetricSummary;
}

export interface ModelProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  
  testConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }>;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}
