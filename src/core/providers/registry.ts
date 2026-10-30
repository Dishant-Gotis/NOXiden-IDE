import { ProviderConfig } from '../../shared/types';
import { OpenAICompatibleAdapter } from './openai-compatible';
import { ModelProviderAdapter } from './types';

export class ProviderRegistry {
  private providers: Map<string, ProviderConfig> = new Map();
  private adapters: Map<string, ModelProviderAdapter> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults(): void {
    const defaults: ProviderConfig[] = [
      {
        id: 'ollama_local',
        name: 'Ollama (Local GPU)',
        type: 'ollama',
        baseUrl: 'http://localhost:11434',
        defaultModel: 'qwen2.5-coder:7b',
        availableModels: ['qwen2.5-coder:7b', 'deepseek-coder:6.7b', 'llama3:8b'],
        isLocal: true,
        contextWindow: 32768
      },
      {
        id: 'noxiden_finetuned_local',
        name: 'NOXiden Fine-Tuned Model (Local Inference)',
        type: 'local_custom',
        baseUrl: 'http://localhost:8000/v1',
        defaultModel: 'noxiden-coder-v1',
        availableModels: ['noxiden-coder-v1', 'custom-checkpoint'],
        isLocal: true,
        contextWindow: 65536
      },
      {
        id: 'huggingface_endpoint',
        name: 'Hugging Face Dedicated Inference Endpoint',
        type: 'huggingface',
        baseUrl: 'https://api-inference.huggingface.co/v1',
        defaultModel: 'tgi',
        availableModels: ['tgi', 'custom-lora-checkpoint'],
        isLocal: false,
        contextWindow: 32768
      },
      {
        id: 'openai_cloud',
        name: 'OpenAI (Cloud API)',
        type: 'openai_compatible',
        baseUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4o',
        availableModels: ['gpt-4o', 'gpt-4o-mini', 'o1-mini'],
        isLocal: false,
        contextWindow: 128000
      }
    ];

    for (const conf of defaults) {
      this.saveProvider(conf);
    }
  }

  public getProviders(maskSecrets = true): ProviderConfig[] {
    return Array.from(this.providers.values()).map((p) => {
      if (maskSecrets && p.apiKey) {
        return {
          ...p,
          apiKey: '••••••••' + p.apiKey.slice(-4)
        };
      }
      return { ...p };
    });
  }

  public getProviderConfig(id: string): ProviderConfig | undefined {
    return this.providers.get(id);
  }

  public getAdapter(id: string): ModelProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  public saveProvider(config: ProviderConfig): void {
    const existing = this.providers.get(config.id);
    let resolvedApiKey = config.apiKey;
    if (existing && config.apiKey && config.apiKey.startsWith('••••••••')) {
      resolvedApiKey = existing.apiKey;
    }

    const updatedConfig: ProviderConfig = {
      ...config,
      apiKey: resolvedApiKey
    };

    this.providers.set(config.id, updatedConfig);

    const adapter = new OpenAICompatibleAdapter(updatedConfig);
    this.adapters.set(config.id, adapter);
  }
}
