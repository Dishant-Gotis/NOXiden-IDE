import * as fs from 'fs';
import * as path from 'path';
import { SearchMatch, SearchResult, SymbolDefinition } from '../shared/types';
import { WorkspaceService } from './workspace-service';

export class SearchService {
  private workspaceService: WorkspaceService;

  private ignoredDirs = new Set([
    '.git',
    'node_modules',
    'dist',
    'build',
    'target',
    '.agents',
    '.next',
    '.cache',
    'coverage',
    '.vscode'
  ]);

  private ignoredExtensions = new Set([
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.ico',
    '.svg',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
    '.bin',
    '.zip',
    '.tar',
    '.gz',
    '.wasm',
    '.node',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.mp4',
    '.mp3',
    '.pdf'
  ]);

  constructor(workspaceService: WorkspaceService) {
    this.workspaceService = workspaceService;
  }

  public async searchInFiles(
    query: string,
    isRegex = false,
    maxResults = 100
  ): Promise<SearchResult> {
    const startTime = Date.now();
    const root = this.workspaceService.getWorkspaceRoot();
    if (!root || !query) {
      return { query, totalMatches: 0, durationMs: 0, matches: [] };
    }

    let regex: RegExp;
    try {
      regex = isRegex ? new RegExp(query, 'gi') : new RegExp(this.escapeRegex(query), 'gi');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Invalid search expression: ${msg}`);
    }

    const matches: SearchMatch[] = [];
    const files = await this.collectFiles(root);

    for (const filePath of files) {
      if (matches.length >= maxResults) break;

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
          if (matches.length >= maxResults) break;

          const line = lines[i];
          regex.lastIndex = 0;
          const match = regex.exec(line);

          if (match) {
            const relPath = path.relative(root, filePath).replace(/\\/g, '/');
            matches.push({
              filePath,
              relativePath: relPath,
              lineNumber: i + 1,
              column: match.index + 1,
              lineContent: line.trim()
            });
          }
        }
      } catch {
        // Skip unreadable / binary files
      }
    }

    return {
      query,
      totalMatches: matches.length,
      durationMs: Date.now() - startTime,
      matches
    };
  }

  public async findSymbols(filterQuery?: string): Promise<SymbolDefinition[]> {
    const root = this.workspaceService.getWorkspaceRoot();
    if (!root) return [];

    const files = await this.collectFiles(root);
    const supportedExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.rs', '.py', '.go']);
    const symbols: SymbolDefinition[] = [];

    const normalizedFilter = filterQuery ? filterQuery.toLowerCase().trim() : '';

    for (const filePath of files) {
      const ext = path.extname(filePath).toLowerCase();
      if (!supportedExts.has(ext)) continue;

      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileSymbols = this.extractSymbolsFromFile(filePath, root, content, ext);

        for (const sym of fileSymbols) {
          if (!normalizedFilter || sym.name.toLowerCase().includes(normalizedFilter)) {
            symbols.push(sym);
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return symbols;
  }

  private extractSymbolsFromFile(
    filePath: string,
    root: string,
    content: string,
    ext: string
  ): SymbolDefinition[] {
    const relPath = path.relative(root, filePath).replace(/\\/g, '/');
    const symbols: SymbolDefinition[] = [];
    const lines = content.split('\n');

    const patterns: Array<{ kind: SymbolDefinition['kind']; regex: RegExp }> = [];

    if (ext === '.rs') {
      patterns.push(
        { kind: 'struct', regex: /pub\s+struct\s+([A-Za-z0-9_]+)/ },
        { kind: 'enum', regex: /pub\s+enum\s+([A-Za-z0-9_]+)/ },
        { kind: 'function', regex: /(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_]+)/ },
        { kind: 'interface', regex: /pub\s+trait\s+([A-Za-z0-9_]+)/ }
      );
    } else if (ext === '.py') {
      patterns.push(
        { kind: 'class', regex: /class\s+([A-Za-z0-9_]+)/ },
        { kind: 'function', regex: /(?:async\s+)?def\s+([A-Za-z0-9_]+)/ }
      );
    } else {
      // TypeScript / JavaScript
      patterns.push(
        { kind: 'class', regex: /(?:export\s+)?class\s+([A-Za-z0-9_]+)/ },
        { kind: 'interface', regex: /(?:export\s+)?interface\s+([A-Za-z0-9_]+)/ },
        { kind: 'type', regex: /(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*=/ },
        { kind: 'function', regex: /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)/ },
        { kind: 'function', regex: /(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/ }
      );
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      for (const p of patterns) {
        const match = p.regex.exec(line);
        if (match && match[1]) {
          const sig = line.slice(0, 100);
          symbols.push({
            name: match[1],
            kind: p.kind,
            filePath,
            relativePath: relPath,
            lineNumber: i + 1,
            signature: sig,
            estimatedTokens: Math.max(1, Math.ceil(sig.length / 4))
          });
          break;
        }
      }
    }

    return symbols;
  }

  private async collectFiles(dir: string): Promise<string[]> {
    const results: string[] = [];

    const walk = (currentDir: string) => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          if (!this.ignoredDirs.has(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (!this.ignoredExtensions.has(ext)) {
            results.push(fullPath);
          }
        }
      }
    };

    walk(dir);
    return results;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

