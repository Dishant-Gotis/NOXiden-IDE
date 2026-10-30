const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { TerminalExecutor } = require('../dist/main/terminal-executor.js');
const { WorkspaceService } = require('../dist/main/workspace-service.js');

test('TerminalExecutor - Risk Assessment & Guarded Approval Gate', async (t) => {
  const workspaceService = new WorkspaceService();
  const executor = new TerminalExecutor(workspaceService);

  await t.test('accurately categorizes command risk levels', () => {
    assert.strictEqual(executor.assessRisk('rm -rf /'), 'high_risk');
    assert.strictEqual(executor.assessRisk('git reset --hard HEAD~1'), 'high_risk');
    assert.strictEqual(executor.assessRisk('git push origin main --force'), 'high_risk');
    assert.strictEqual(executor.assessRisk('del /f /s /q node_modules'), 'high_risk');

    assert.strictEqual(executor.assessRisk('git status'), 'safe');
    assert.strictEqual(executor.assessRisk('git diff'), 'safe');
    assert.strictEqual(executor.assessRisk('echo "hello"'), 'safe');

    assert.strictEqual(executor.assessRisk('npm test'), 'standard');
    assert.strictEqual(executor.assessRisk('cargo build'), 'standard');
    assert.strictEqual(executor.assessRisk('npm run build'), 'standard');
  });

  await t.test('creates proposal in pending state', () => {
    const proposal = executor.proposeCommand('echo "test"', undefined, 'Test echo');
    assert.ok(proposal.id);
    assert.strictEqual(proposal.status, 'pending');
    assert.strictEqual(proposal.riskLevel, 'safe');
  });

  await t.test('blocks unapproved execution or non-existent proposal', async () => {
    await assert.rejects(
      async () => {
        await executor.approveAndExecute('non-existent-id');
      },
      /Execution Denied/
    );
  });

  await t.test('rejecting proposal blocks execution', async () => {
    const proposal = executor.proposeCommand('echo "will reject"');
    const rejected = executor.rejectCommand(proposal.id, 'User refused');
    assert.strictEqual(rejected.success, true);

    await assert.rejects(
      async () => {
        await executor.approveAndExecute(proposal.id);
      },
      /Execution Denied: Command proposal .* is not in pending state/
    );
  });

  await t.test('approved execution runs real command and captures stdout', async () => {
    const proposal = executor.proposeCommand('node -e "console.log(\'NOXIDEN_EXEC_OK\')"');
    const result = await executor.approveAndExecute(proposal.id);

    assert.strictEqual(result.exitCode, 0);
    assert.ok(result.stdout.includes('NOXIDEN_EXEC_OK'));
    assert.strictEqual(result.timedOut, false);
  });

  await t.test('enforces timeout on long-running commands', async () => {
    // 500ms timeout on a script that waits 3s
    const proposal = executor.proposeCommand('node -e "setTimeout(() => {}, 3000)"');
    const result = await executor.approveAndExecute(proposal.id, 500);

    assert.strictEqual(result.timedOut, true);
  });
});
