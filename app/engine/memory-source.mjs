// An in-memory folder: used for the built-in sample missions, the in-page sample
// agent and the tests. It behaves like a real folder: paths, listing, reading,
// writing and appending.

import { safeRelPath } from './paths.mjs';
import { toBytes, bytesToText } from './hash.mjs';

export function createMemorySource(files = {}, { label = 'memory', writable = true } = {}) {
  const store = new Map();
  for (const [path, data] of Object.entries(files)) store.set(safeRelPath(path), toBytes(data).slice());

  const source = {
    kind: 'memory',
    label,
    writable,
    async readBytes(path) {
      const key = safeRelPath(path);
      return store.has(key) ? store.get(key).slice() : null;
    },
    async readText(path) {
      const bytes = await source.readBytes(path);
      return bytes == null ? null : bytesToText(bytes);
    },
    async list(dir = '') {
      const prefix = dir ? `${safeRelPath(dir)}/` : '';
      const seen = new Map();
      for (const key of store.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const [name, ...more] = rest.split('/');
        if (!name) continue;
        const kind = more.length ? 'dir' : 'file';
        if (!seen.has(name) || kind === 'dir') seen.set(name, kind);
      }
      return [...seen].map(([name, kind]) => ({ name, kind })).sort((a, b) => a.name.localeCompare(b.name));
    },
    async write(path, data) {
      if (!writable) throw new Error('this source is read-only');
      store.set(safeRelPath(path), toBytes(data).slice());
    },
    async append(path, text) {
      if (!writable) throw new Error('this source is read-only');
      const key = safeRelPath(path);
      const before = store.has(key) ? bytesToText(store.get(key)) : '';
      store.set(key, toBytes(before + text));
    },
    async remove(path) {
      if (!writable) throw new Error('this source is read-only');
      store.delete(safeRelPath(path));
    },
    paths() {
      return [...store.keys()].sort();
    },
  };
  return source;
}
