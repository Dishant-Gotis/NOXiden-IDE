const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { WorkspaceService } = require('../dist/main/workspace-service.js');

test('WorkspaceService - enforces workspace boundary and sandboxing', async (t) => {
  const service = new WorkspaceService();
  const testWorkspaceDir = path.resolve(__dirname, 'fixtures', 'test-workspace');

  // Setup test dir
  fs.mkdirSync(testWorkspaceDir, { recursive: true });
  const testFile = path.join(testWorkspaceDir, 'sample.txt');
  fs.writeFileSync(testFile, 'Hello NOXiden!', 'utf-8');

  await t.test('accepts valid workspace root', () => {
    const success = service.setWorkspaceRoot(testWorkspaceDir);
    assert.strictEqual(success, true);
    assert.strictEqual(service.getWorkspaceRoot(), testWorkspaceDir);
  });

  await t.test('allows reading files inside workspace', async () => {
    const content = await service.readFile(testFile);
    assert.strictEqual(content, 'Hello NOXiden!');
  });

  await t.test('blocks reading files outside workspace (path traversal)', async () => {
    const outsidePath = path.resolve(testWorkspaceDir, '..', '..', 'package.json');
    await assert.rejects(
      async () => {
        await service.readFile(outsidePath);
      },
      /Security Exception/
    );
  });

  await t.test('allows writing files inside workspace', async () => {
    const newFile = path.join(testWorkspaceDir, 'output.txt');
    await service.writeFile(newFile, 'Updated content');
    const readBack = fs.readFileSync(newFile, 'utf-8');
    assert.strictEqual(readBack, 'Updated content');
  });

  await t.test('blocks writing files outside workspace', async () => {
    const maliciousPath = path.resolve(testWorkspaceDir, '..', 'malicious.txt');
    await assert.rejects(
      async () => {
        await service.writeFile(maliciousPath, 'evil');
      },
      /Security Exception/
    );
  });

  // Cleanup
  fs.rmSync(path.resolve(__dirname, 'fixtures'), { recursive: true, force: true });
});

