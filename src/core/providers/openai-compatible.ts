import { ProviderConfig } from '../../shared/types';
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

    const payload = {
      model: request.model || this.config.defaultModel,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content
      })),
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096
    };

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
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
    };

    const messageContent = json.choices?.[0]?.message?.content || '';

    return {
      content: messageContent,
      promptTokens: json.usage?.prompt_tokens,
      completionTokens: json.usage?.completion_tokens,
      totalTokens: json.usage?.total_tokens,
      latencyMs
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

