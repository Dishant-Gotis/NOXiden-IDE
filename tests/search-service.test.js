const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { SearchService } = require('../dist/main/search-service');
const { WorkspaceService } = require('../dist/main/workspace-service');

test('SearchService - Workspace Search & Symbol Indexing', async (t) => {
  const workspaceService = new WorkspaceService();
  const repoRoot = path.resolve(__dirname, '..');
  workspaceService.setWorkspaceRoot(repoRoot);
  const searchService = new SearchService(workspaceService);

  await t.test('searches for literal text across workspace files', async () => {
    const result = await searchService.searchInFiles('NOXiden');
    assert.ok(result.totalMatches > 0);
    assert.strictEqual(result.query, 'NOXiden');
    assert.ok(typeof result.durationMs === 'number');
    assert.ok(result.matches.length > 0);

    const first = result.matches[0];
    assert.ok(first.filePath);
    assert.ok(first.relativePath);
    assert.ok(first.lineNumber > 0);
    assert.ok(first.column > 0);
    assert.ok(first.lineContent.toLowerCase().includes('noxiden'));
  });

  await t.test('executes regex search and captures matches', async () => {
    const result = await searchService.searchInFiles('export\\s+class\\s+[A-Za-z0-9_]+', true);
    assert.ok(result.totalMatches > 0);
    assert.ok(result.matches.some((m) => m.lineContent.includes('export class')));
  });

  await t.test('handles invalid regex syntax gracefully', async () => {
    await assert.rejects(
      async () => {
        await searchService.searchInFiles('([a-z+', true);
      },
      /Invalid search expression/
    );
  });

  await t.test('respects maxResults limit', async () => {
    const result = await searchService.searchInFiles('const', false, 5);
    assert.ok(result.matches.length <= 5);
  });

  await t.test('extracts AST/code symbols with token budgeting', async () => {
    const symbols = await searchService.findSymbols();
    assert.ok(symbols.length > 0);

    const foundClass = symbols.find((s) => s.kind === 'class');
    assert.ok(foundClass, 'Should identify classes');
    assert.ok(foundClass.name);
    assert.ok(foundClass.signature);
    assert.ok(foundClass.estimatedTokens > 0);
  });

  await t.test('filters symbols by query string', async () => {
    const symbols = await searchService.findSymbols('SearchService');
    assert.ok(symbols.length > 0);
    assert.ok(symbols.some((s) => s.name === 'SearchService'));
  });
});

