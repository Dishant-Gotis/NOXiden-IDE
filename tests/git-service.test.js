const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { GitService } = require('../dist/main/git-service');
const { WorkspaceService } = require('../dist/main/workspace-service');

test('GitService - Repository Status & HEAD Diff Extraction', async (t) => {
  const workspaceService = new WorkspaceService();
  const gitService = new GitService(workspaceService);

  await t.test('returns uninitialized repo status when no workspace is active', async () => {
    const status = await gitService.getStatus();
    assert.strictEqual(status.isRepo, false);
    assert.strictEqual(status.branch, null);
    assert.deepStrictEqual(status.files, []);
  });

  await t.test('detects active repository root, branch, and status', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    workspaceService.setWorkspaceRoot(repoRoot);

    const status = await gitService.getStatus();
    assert.strictEqual(status.isRepo, true);
    assert.ok(typeof status.branch === 'string' && status.branch.length > 0);
    assert.ok(Array.isArray(status.files));
  });

  await t.test('fetches HEAD content for existing tracked repository file', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    workspaceService.setWorkspaceRoot(repoRoot);

    const packageJsonPath = path.resolve(repoRoot, 'package.json');
    const headContent = await gitService.getFileHeadContent(packageJsonPath);
    assert.ok(typeof headContent === 'string');
    assert.ok(headContent.includes('noxiden-ide'));
  });

  await t.test('gracefully returns empty string for untracked or non-existent file', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    workspaceService.setWorkspaceRoot(repoRoot);

    const nonExistentPath = path.resolve(repoRoot, 'non-existent-sample-file-12345.xyz');
    const headContent = await gitService.getFileHeadContent(nonExistentPath);
    assert.strictEqual(headContent, '');
  });

  await t.test('rejects empty commit message', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    workspaceService.setWorkspaceRoot(repoRoot);

    const res = await gitService.commit('   ');
    assert.strictEqual(res.success, false);
    assert.ok(res.error && res.error.includes('empty'));
  });

  await t.test('fetches staged diff string', async () => {
    const repoRoot = path.resolve(__dirname, '..');
    workspaceService.setWorkspaceRoot(repoRoot);

    const diff = await gitService.getStagedDiff();
    assert.strictEqual(typeof diff, 'string');
  });
});
