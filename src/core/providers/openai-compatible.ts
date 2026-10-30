import { ProviderConfig, ToolCall } from '../../shared/types';
import { CompletionRequest, CompletionResponse, ModelProviderAdapter } from './types';

export class OpenAICompatibleAdapter implements ModelProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly isLocal: boolean;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.isLocal = config.isLocal;
  }

  public async testConnection(): Promise<{ success: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const url = `${this.normalizeBaseUrl(this.config.baseUrl)}/models`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          success: false,
          latencyMs,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      return {
        success: true,
        latencyMs
      };
    } catch (err: unknown) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        latencyMs,
        error: `Connection failed: ${errorMsg}`
      };
    }
  }

  public async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();
    const url = `${this.normalizeBaseUrl(this.config.baseUrl)}/chat/completions`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const payload: Record<string, unknown> = {
      model: request.model || this.config.defaultModel,
      messages: request.messages.map((m) => {
        const msg: Record<string, unknown> = {
          role: m.role,
          content: m.content
        };
        if (m.toolCalls && m.toolCalls.length > 0) {
          msg.tool_calls = m.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }));
        }
        if (m.toolCallId) {
          msg.tool_call_id = m.toolCallId;
        }
        return msg;
      }),
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096
    };

    if (request.tools && request.tools.length > 0) {
      payload.tools = request.tools;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Provider Error (${this.name} ${response.status}): ${errorBody || response.statusText}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
          }>;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const choice = json.choices?.[0]?.message;
    const messageContent = choice?.content || '';

    let parsedToolCalls: ToolCall[] | undefined;
    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      parsedToolCalls = choice.tool_calls.map((tc) => {
        let args = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = { raw: tc.function.arguments };
        }
        return {
          id: tc.id,
          name: tc.function.name,
          arguments: args
        };
      });
    }

    const promptTokens = json.usage?.prompt_tokens;
    const completionTokens = json.usage?.completion_tokens;
    const totalTokens = json.usage?.total_tokens;

    let tokensPerSec: number | undefined;
    if (completionTokens && latencyMs > 0) {
      tokensPerSec = Number(((completionTokens / latencyMs) * 1000).toFixed(1));
    }

    return {
      content: messageContent,
      toolCalls: parsedToolCalls,
      promptTokens,
      completionTokens,
      totalTokens,
      latencyMs,
      metrics: {
        latencyMs,
        tokensPerSec,
        promptTokens,
        completionTokens,
        totalTokens,
        provenance: json.usage ? 'provider_reported' : 'locally_measured'
      }
    };
  }

  private normalizeBaseUrl(url: string): string {
    let clean = url.trim().replace(/\/+$/, '');
    if (!clean.endsWith('/v1') && !clean.includes('/api/')) {
      clean = `${clean}/v1`;
    }
    return clean;
  }
}
