import { spawn } from 'child_process';
import { CommandExecutionResult, CommandProposal, CommandRiskLevel } from '../shared/types';
import { WorkspaceService } from './workspace-service';

export class TerminalExecutor {
  private proposals: Map<string, CommandProposal> = new Map();
  private workspaceService: WorkspaceService;

  constructor(workspaceService: WorkspaceService) {
    this.workspaceService = workspaceService;
  }

  public assessRisk(command: string): CommandRiskLevel {
    const cmd = command.trim().toLowerCase();

    // High-risk destructive commands
    const highRiskPatterns = [
      /\brm\s+-[rf]{1,2}\b/,
      /\bdel\s+\/[fsq]{1,3}\b/,
      /\brmdir\s+\/s\b/,
      /\bgit\s+reset\s+--hard\b/,
      /\bgit\s+clean\s+-[xfd]{1,3}\b/,
      /\bgit\s+push\s+.*--force\b/,
      /\bformat\b/,
      /\bmkfs\b/,
      /\bdd\s+if=\b/,
      /\bchmod\s+-R\s+777\b/,
      /\b(sudo|runas)\b/,
      />\s*\/dev\/(sda|nvme|null)/
    ];

    for (const pattern of highRiskPatterns) {
      if (pattern.test(cmd)) {
        return 'high_risk';
      }
    }

    // Safe read-only inspection commands
    const safePatterns = [
      /^(git\s+(status|diff|log|branch|show|rev-parse))/,
      /^(ls|dir|pwd|echo|cat|type)\b/,
      /^(cargo|node|npm|python|git|rustc|tsc)\s+(--version|-v)\b/
    ];

    for (const pattern of safePatterns) {
      if (pattern.test(cmd)) {
        return 'safe';
      }
    }

    // All normal builds, tests, package commands
    return 'standard';
  }

  public proposeCommand(
    command: string,
    cwd?: string,
    explanation?: string
  ): CommandProposal {
    const trimmed = command.trim();
    if (!trimmed) {
      throw new Error('Command cannot be empty');
    }

    const id = `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const riskLevel = this.assessRisk(trimmed);
    const resolvedCwd = cwd || this.workspaceService.getWorkspaceRoot() || process.cwd();

    const proposal: CommandProposal = {
      id,
      command: trimmed,
      cwd: resolvedCwd,
      riskLevel,
      explanation,
      status: 'pending',
      createdAt: Date.now()
    };

    this.proposals.set(id, proposal);
    return proposal;
  }

  public getProposal(proposalId: string): CommandProposal | undefined {
    return this.proposals.get(proposalId);
  }

  public rejectCommand(proposalId: string, reason?: string): { success: boolean } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return { success: false };
    }
    proposal.status = 'rejected';
    if (reason && proposal.explanation) {
      proposal.explanation += ` [Rejected: ${reason}]`;
    }
    return { success: true };
  }

  public async approveAndExecute(
    proposalId: string,
    timeoutMs = 30000,
    maxBufferBytes = 512 * 1024
  ): Promise<CommandExecutionResult> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Execution Denied: Command proposal "${proposalId}" not found`);
    }

    if (proposal.status !== 'pending') {
      throw new Error(
        `Execution Denied: Command proposal "${proposalId}" is not in pending state (status: ${proposal.status})`
      );
    }

    // Mark as approved and running
    proposal.status = 'running';

    const result = await this.spawnProcess(
      proposal.command,
      proposal.cwd || process.cwd(),
      timeoutMs,
      maxBufferBytes
    );

    proposal.status = result.timedOut
      ? 'timed_out'
      : result.exitCode === 0
      ? 'completed'
      : 'failed';

    return {
      proposalId,
      ...result
    };
  }

  public async executeManual(
    command: string,
    cwd?: string,
    timeoutMs = 30000,
    maxBufferBytes = 512 * 1024
  ): Promise<CommandExecutionResult> {
    const resolvedCwd = cwd || this.workspaceService.getWorkspaceRoot() || process.cwd();
    const result = await this.spawnProcess(command, resolvedCwd, timeoutMs, maxBufferBytes);
    return {
      proposalId: 'manual',
      ...result
    };
  }

  private spawnProcess(
    command: string,
    cwd: string,
    timeoutMs: number,
    maxBufferBytes: number
  ): Promise<Omit<CommandExecutionResult, 'proposalId'>> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let totalBytes = 0;

      const isWin = process.platform === 'win32';
      const shellExecutable = isWin ? 'powershell.exe' : '/bin/sh';
      const shellArgs = isWin
        ? ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', command]
        : ['-c', command];

      const child = spawn(shellExecutable, shellArgs, {
        cwd,
        env: { ...process.env, NOXIDEN_TERMINAL: '1' }
      });

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill(isWin ? undefined : 'SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill(isWin ? undefined : 'SIGKILL');
          }
        }, 2000);
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        if (totalBytes < maxBufferBytes) {
          stdout += chunk.toString('utf-8');
          totalBytes += chunk.length;
        } else if (!stdout.endsWith('\n[Output truncated due to buffer limit]')) {
          stdout += '\n[Output truncated due to buffer limit]';
        }
      });

      child.stderr.on('data', (chunk: Buffer) => {
        if (totalBytes < maxBufferBytes) {
          stderr += chunk.toString('utf-8');
          totalBytes += chunk.length;
        } else if (!stderr.endsWith('\n[Error output truncated]')) {
          stderr += '\n[Error output truncated]';
        }
      });

      child.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          command,
          exitCode: 1,
          stdout,
          stderr: `${stderr}\nExecution Error: ${err.message}`,
          durationMs: Date.now() - startTime,
          timedOut
        });
      });

      child.on('close', (code) => {
        clearTimeout(timer);
        resolve({
          command,
          exitCode: code,
          stdout,
          stderr,
          durationMs: Date.now() - startTime,
          timedOut
        });
      });
    });
  }
}

