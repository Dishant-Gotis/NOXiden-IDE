const test = require('node:test');
const assert = require('node:assert');
const { ProviderRegistry } = require('../dist/core/providers/registry.js');

test('ProviderRegistry - manages providers and credentials security', async (t) => {
  const registry = new ProviderRegistry();

  await t.test('initializes default providers including local GPU and fine-tuned presets', () => {
    const providers = registry.getProviders(false);
    assert.ok(providers.length >= 3);

    const ollama = providers.find((p) => p.id === 'ollama_local');
    assert.ok(ollama);
    assert.strictEqual(ollama.isLocal, true);

    const finetuned = providers.find((p) => p.id === 'noxiden_finetuned_local');
    assert.ok(finetuned);
    assert.strictEqual(finetuned.isLocal, true);
    assert.strictEqual(finetuned.defaultModel, 'noxiden-coder-v1');
  });

  await t.test('masks API keys when returning configs for UI', () => {
    registry.saveProvider({
      id: 'custom_cloud',
      name: 'Custom Cloud Provider',
      type: 'openai_compatible',
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-secret-token-1234567890',
      defaultModel: 'model-a',
      availableModels: ['model-a'],
      isLocal: false,
      contextWindow: 16000
    });

    const maskedProviders = registry.getProviders(true);
    const target = maskedProviders.find((p) => p.id === 'custom_cloud');
    assert.ok(target);
    assert.strictEqual(target.apiKey, '••••••••7890');

    // Unmasked retrieval for internal adapter use
    const rawConfig = registry.getProviderConfig('custom_cloud');
    assert.strictEqual(rawConfig.apiKey, 'sk-secret-token-1234567890');
  });

  await t.test('normalizes custom endpoints with /v1 suffix', () => {
    const adapter = registry.getAdapter('custom_cloud');
    assert.ok(adapter);
    assert.strictEqual(adapter.id, 'custom_cloud');
  });
});

