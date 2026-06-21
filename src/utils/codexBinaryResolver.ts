import { accessSync, constants as fsConstants } from 'fs';
import { homedir } from 'os';
import { join, delimiter } from 'path';

let cached: string | undefined;

function isExecutableFile(p: string): boolean {
  try {
    accessSync(p, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Known Codex.app (desktop app) bundled CLI locations, per platform. Best-effort on win/linux. */
function bundledCodexCandidates(): string[] {
  const home = homedir();
  switch (process.platform) {
    case 'darwin':
      return [
        '/Applications/Codex.app/Contents/Resources/codex',
        join(home, 'Applications', 'Codex.app', 'Contents', 'Resources', 'codex'),
      ];
    case 'win32': {
      const out: string[] = [];
      if (process.env.LOCALAPPDATA)
        out.push(join(process.env.LOCALAPPDATA, 'Programs', 'Codex', 'resources', 'codex.exe'));
      if (process.env.ProgramFiles)
        out.push(join(process.env.ProgramFiles, 'Codex', 'resources', 'codex.exe'));
      return out;
    }
    default:
      return [
        '/opt/Codex/resources/codex',
        join(home, '.local', 'share', 'Codex', 'resources', 'codex'),
      ];
  }
}

/** Is a plain `codex` resolvable on PATH? */
function codexOnPath(): boolean {
  const exts =
    process.platform === 'win32'
      ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
      : [''];
  for (const dir of (process.env.PATH || '').split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      if (isExecutableFile(join(dir, 'codex' + ext))) return true;
    }
  }
  return false;
}

/**
 * Resolve the Codex CLI binary. Priority:
 *   1. CODEX_EXECUTABLE / CODEX_BIN env var (explicit override)
 *   2. Codex.app bundled CLI (this project targets the desktop app's CLI)
 *   3. `codex` on PATH
 *   4. literal 'codex' (spawn will surface a clear "not found" error)
 */
export function resolveCodexBinary(): string {
  if (cached) return cached;
  const override = process.env.CODEX_EXECUTABLE || process.env.CODEX_BIN;
  if (override && override.trim()) {
    cached = override.trim();
    return cached;
  }
  for (const candidate of bundledCodexCandidates()) {
    if (isExecutableFile(candidate)) {
      cached = candidate;
      return cached;
    }
  }
  if (codexOnPath()) {
    cached = 'codex';
    return cached;
  }
  cached = 'codex';
  return cached;
}

/** Test helper: clear the cached resolution. */
export function _resetCodexBinaryCache(): void {
  cached = undefined;
}
