// Sources available in the browser. All reading happens on the user's device.
//   - the Local Program's read-only workspace (http://127.0.0.1:4317/workspace/)
//   - a folder picked in the browser (File System Access API, or the webkitdirectory fallback)
// spec.md > Sources

import { safeRelPath } from './engine/paths.mjs';
import { bytesToText } from './engine/hash.mjs';

function childrenFromPaths(paths, dir) {
  const prefix = dir ? `${safeRelPath(dir)}/` : '';
  const seen = new Map();
  for (const p of paths) {
    if (!p.startsWith(prefix)) continue;
    const [name, ...more] = p.slice(prefix.length).split('/');
    if (!name) continue;
    const kind = more.length ? 'dir' : 'file';
    if (!seen.has(name) || kind === 'dir') seen.set(name, kind);
  }
  return [...seen].map(([name, kind]) => ({ name, kind })).sort((a, b) => a.name.localeCompare(b.name));
}

// The local program only ever runs on this computer, so the page asks for it only when it
// was itself opened from this computer (on the public demo there is nothing to ask).
export function servedFromThisComputer(loc = globalThis.location) {
  if (!loc || loc.protocol !== 'http:') return false;
  return ['127.0.0.1', 'localhost', '[::1]', '::1'].includes(loc.hostname);
}

export async function localProgramAvailable() {
  if (!servedFromThisComputer()) return false;
  try {
    const response = await fetch('/workspace/index.json', { cache: 'no-store' });
    return response.ok && (response.headers.get('content-type') || '').includes('json');
  } catch {
    return false;
  }
}

export function createHttpWorkspaceSource(base = '/workspace/') {
  let files = null;
  const source = {
    kind: 'local',
    label: 'local',
    writable: false,
    async refresh() {
      const response = await fetch(`${base}index.json`, { cache: 'no-store' });
      if (!response.ok) throw new Error('local program not available');
      files = (await response.json()).files || [];
    },
    async readBytes(path) {
      const clean = safeRelPath(path);
      if (!files) await source.refresh();
      // The index (re-read on every check) says which files exist, so missing files are
      // answered without a request.
      if (!files.includes(clean)) return null;
      const response = await fetch(base + clean.split('/').map(encodeURIComponent).join('/'), { cache: 'no-store' });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`cannot read ${clean} (${response.status})`);
      return new Uint8Array(await response.arrayBuffer());
    },
    async readText(path) {
      const bytes = await source.readBytes(path);
      return bytes == null ? null : bytesToText(bytes);
    },
    async list(dir = '') {
      if (!files) await source.refresh();
      return childrenFromPaths(files, dir);
    },
  };
  return source;
}

export function folderPickerSupport() {
  if (typeof window === 'undefined') return 'none';
  if (typeof window.showDirectoryPicker === 'function') return 'handle';
  const input = document.createElement('input');
  return 'webkitdirectory' in input ? 'input' : 'none';
}

// File System Access API: re-readable on every check.
export function createHandleSource(dirHandle) {
  async function walkTo(path, { file }) {
    const parts = safeRelPath(path).split('/');
    let dir = dirHandle;
    for (let i = 0; i < parts.length - (file ? 1 : 0); i += 1) dir = await dir.getDirectoryHandle(parts[i]);
    return file ? dir.getFileHandle(parts[parts.length - 1]) : dir;
  }
  const source = {
    kind: 'folder',
    label: dirHandle.name,
    writable: false,
    async refresh() {},
    async readBytes(path) {
      try {
        const handle = await walkTo(path, { file: true });
        const file = await handle.getFile();
        return new Uint8Array(await file.arrayBuffer());
      } catch (error) {
        if (error && (error.name === 'NotFoundError' || error.name === 'TypeMismatchError')) return null;
        throw error;
      }
    },
    async readText(path) {
      const bytes = await source.readBytes(path);
      return bytes == null ? null : bytesToText(bytes);
    },
    async list(dir = '') {
      let handle;
      try {
        handle = dir ? await walkTo(dir, { file: false }) : dirHandle;
      } catch {
        return [];
      }
      const out = [];
      for await (const [name, entry] of handle.entries()) {
        if (name.startsWith('.')) continue;
        out.push({ name, kind: entry.kind === 'directory' ? 'dir' : 'file' });
      }
      return out.sort((a, b) => a.name.localeCompare(b.name));
    },
  };
  return source;
}

// <input type="file" webkitdirectory>: a snapshot; pick again to see new files.
export function createFileListSource(fileList) {
  const files = new Map();
  let label = 'folder';
  for (const file of Array.from(fileList)) {
    const rel = file.webkitRelativePath || file.name;
    const parts = rel.split('/');
    if (parts.length > 1) label = parts[0];
    const inner = parts.length > 1 ? parts.slice(1).join('/') : parts[0];
    if (inner.split('/').some((p) => p.startsWith('.'))) continue;
    files.set(inner, file);
  }
  const source = {
    kind: 'folder',
    label,
    writable: false,
    snapshot: true,
    async refresh() {},
    async readBytes(path) {
      const file = files.get(safeRelPath(path));
      return file ? new Uint8Array(await file.arrayBuffer()) : null;
    },
    async readText(path) {
      const bytes = await source.readBytes(path);
      return bytes == null ? null : bytesToText(bytes);
    },
    async list(dir = '') {
      return childrenFromPaths([...files.keys()], dir);
    },
  };
  return source;
}
