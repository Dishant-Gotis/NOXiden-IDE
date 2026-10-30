import * as fs from 'fs';
import * as path from 'path';
import { WorkspaceFile } from '../shared/types';

export class WorkspaceService {
  private currentWorkspaceRoot: string | null = null;

  public setWorkspaceRoot(rootPath: string): boolean {
    const resolved = path.resolve(rootPath);
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      return false;
    }
    this.currentWorkspaceRoot = resolved;
    return true;
  }

  public getWorkspaceRoot(): string | null {
    return this.currentWorkspaceRoot;
  }

  public isPathWithinWorkspace(targetPath: string): boolean {
    if (!this.currentWorkspaceRoot) return false;
    const resolvedTarget = path.resolve(targetPath);
    const resolvedRoot = path.resolve(this.currentWorkspaceRoot);
    
    // Check if target path starts with root path
    return resolvedTarget === resolvedRoot || resolvedTarget.startsWith(resolvedRoot + path.sep);
  }

  public async getDirectoryTree(
    dirPath: string,
    depth = 0,
    maxDepth = 5
  ): Promise<WorkspaceFile[]> {
    const resolved = path.resolve(dirPath);
    if (!this.isPathWithinWorkspace(resolved)) {
      throw new Error(`Access denied: Path is outside current workspace`);
    }

    if (depth > maxDepth) {
      return [];
    }

    const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
    const results: WorkspaceFile[] = [];

    // Filter out hidden / ignored system items
    const ignoredNames = new Set([
      'node_modules',
      '.git',
      'target',
      'dist',
      'build',
      '.system_generated',
      '.next',
      '.turbo'
    ]);

    for (const entry of entries) {
      if (ignoredNames.has(entry.name)) {
        continue;
      }

      const fullPath = path.join(resolved, entry.name);
      const relativePath = path.relative(this.currentWorkspaceRoot!, fullPath);
      const isDirectory = entry.isDirectory();

      const item: WorkspaceFile = {
        name: entry.name,
        path: fullPath,
        relativePath: relativePath.replace(/\\/g, '/'),
        isDirectory
      };

      if (isDirectory && depth < maxDepth) {
        item.children = await this.getDirectoryTree(fullPath, depth + 1, maxDepth);
      } else if (!isDirectory) {
        try {
          const stat = await fs.promises.stat(fullPath);
          item.size = stat.size;
        } catch {
          // ignore stat errors
        }
      }

      results.push(item);
    }

    // Sort directories first, then alphabetically
    return results.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public async readFile(filePath: string): Promise<string> {
    const resolved = path.resolve(filePath);
    if (!this.isPathWithinWorkspace(resolved)) {
      throw new Error(`Security Exception: Cannot read file outside active workspace (${resolved})`);
    }

    return await fs.promises.readFile(resolved, 'utf-8');
  }

  public async writeFile(filePath: string, content: string): Promise<void> {
    const resolved = path.resolve(filePath);
    if (!this.isPathWithinWorkspace(resolved)) {
      throw new Error(`Security Exception: Cannot write file outside active workspace (${resolved})`);
    }

    // Ensure parent directory exists
    const dir = path.dirname(resolved);
    await fs.promises.mkdir(dir, { recursive: true });

    await fs.promises.writeFile(resolved, content, 'utf-8');
  }
}

