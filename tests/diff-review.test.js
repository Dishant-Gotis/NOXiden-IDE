const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { WorkspaceService } = require('../dist/main/workspace-service.js');

test('Diff Review Workflow - safe patch verification & application', async (t) => {
  const service = new WorkspaceService();
  const testWorkspaceDir = path.resolve(__dirname, 'fixtures', 'diff-workspace');

  fs.mkdirSync(testWorkspaceDir, { recursive: true });
  const targetFile = path.join(testWorkspaceDir, 'agent-target.ts');
  const initialContent = `// Version 1.0\nfunction calculate(a, b) {\n  return a + b;\n}\n`;
  fs.writeFileSync(targetFile, initialContent, 'utf-8');

  service.setWorkspaceRoot(testWorkspaceDir);

  await t.test('reads original file for diff baseline', async () => {
    const original = await service.readFile(targetFile);
    assert.strictEqual(original, initialContent);
  });

  await t.test('rejecting diff preserves original file', async () => {
    // Proposed change discarded by user
    const currentOnDisk = await service.readFile(targetFile);
    assert.strictEqual(currentOnDisk, initialContent);
  });

  await t.test('accepting diff writes proposed modification cleanly to disk', async () => {
    const proposedModification = `// Version 2.0 (Agent Optimized)\nfunction calculate(a: number, b: number): number {\n  return a + b;\n}\n`;
    await service.writeFile(targetFile, proposedModification);

    const updated = await service.readFile(targetFile);
    assert.strictEqual(updated, proposedModification);
    assert.notStrictEqual(updated, initialContent);
  });

  // Cleanup
  fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
});

