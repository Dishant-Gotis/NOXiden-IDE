import { exec } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { GitFileStatus, GitWorkspaceStatus } from '../shared/types';
import { WorkspaceService } from './workspace-service';

const execAsync = promisify(exec);

export class GitService {
  private workspaceService: WorkspaceService;

  constructor(workspaceService: WorkspaceService) {
    this.workspaceService = workspaceService;
  }

  private getRoot(): string | null {
    return this.workspaceService.getWorkspaceRoot();
  }

  public async getStatus(): Promise<GitWorkspaceStatus> {
    const root = this.getRoot();
    if (!root) {
      return { isRepo: false, branch: null, files: [] };
    }

    try {
      // Check if git repo
      await execAsync('git rev-parse --is-inside-work-tree', { cwd: root });

      // Get branch
      let branch: string | null = null;
      try {
        const { stdout: branchOut } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: root });
        branch = branchOut.trim();
      } catch {
        branch = 'detached';
      }

      // Get porcelain status
      const { stdout: statusOut } = await execAsync('git status --porcelain -uall', { cwd: root });
      const files: GitFileStatus[] = [];

      const lines = statusOut.split('\n');
      for (const line of lines) {
        if (!line || line.length < 4) continue;

        const indexStatus = line[0];
        const workTreeStatus = line[1];
        const rawPath = line.slice(3).trim();

        const fullPath = path.resolve(root, rawPath);
        const relativePath = rawPath.replace(/\\/g, '/');

        const isStaged = indexStatus !== ' ' && indexStatus !== '?';
        const code = indexStatus !== ' ' ? indexStatus : workTreeStatus;

        files.push({
          path: fullPath,
          relativePath,
          statusCode: code,
          isStaged
        });
      }

      return {
        isRepo: true,
        branch,
        files
      };
    } catch {
      return { isRepo: false, branch: null, files: [] };
    }
  }

  public async getFileHeadContent(filePath: string): Promise<string> {
    const root = this.getRoot();
    if (!root) {
      throw new Error('No active workspace');
    }

    const resolved = path.resolve(filePath);
    const rel = path.relative(root, resolved).replace(/\\/g, '/');

    try {
      const { stdout } = await execAsync(`git show HEAD:"${rel}"`, {
        cwd: root,
        maxBuffer: 10 * 1024 * 1024
      });
      return stdout;
    } catch {
      // File might be untracked or newly created
      return '';
    }
  }

  public async stageFile(filePath: string): Promise<void> {
    const root = this.getRoot();
    if (!root) throw new Error('No active workspace');
    const resolved = path.resolve(filePath);
    const rel = path.relative(root, resolved).replace(/\\/g, '/');
    await execAsync(`git add "${rel}"`, { cwd: root });
  }

  public async unstageFile(filePath: string): Promise<void> {
    const root = this.getRoot();
    if (!root) throw new Error('No active workspace');
    const resolved = path.resolve(filePath);
    const rel = path.relative(root, resolved).replace(/\\/g, '/');
    await execAsync(`git reset HEAD "${rel}"`, { cwd: root });
  }

  public async getStagedDiff(): Promise<string> {
    const root = this.getRoot();
    if (!root) return '';
    try {
      const { stdout } = await execAsync('git diff --cached', { cwd: root, maxBuffer: 10 * 1024 * 1024 });
      return stdout;
    } catch {
      return '';
    }
  }

  public async commit(message: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    const root = this.getRoot();
    if (!root) return { success: false, error: 'No active workspace' };
    const cleanMsg = message.trim();
    if (!cleanMsg) return { success: false, error: 'Commit message cannot be empty' };

    try {
      const escaped = cleanMsg.replace(/"/g, '\\"');
      const { stdout } = await execAsync(`git commit -m "${escaped}"`, { cwd: root });
      const hashMatch = stdout.match(/\[[^\s]+ ([a-f0-9]+)\]/);
      return {
        success: true,
        hash: hashMatch ? hashMatch[1] : undefined
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }
}
