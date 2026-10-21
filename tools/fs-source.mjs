// A folder on disk as a Mission Rescue source (Node.js). Read-only unless asked otherwise;
// every path is checked to stay inside the folder.
// spec.md > Sources

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { safeRelPath } from '../app/engine/paths.mjs';
import { toBytes, bytesToText } from '../app/engine/hash.mjs';

export function createFsSource(rootDir, { writable = false, label } = {}) {
  const root = path.resolve(rootDir);

  function resolveInside(rel) {
    const clean = rel === '' ? '' : safeRelPath(rel);
    const full = path.resolve(root, ...clean.split('/').filter(Boolean));
    if (full !== root && !full.startsWith(root + path.sep)) throw new Error(`path leaves the folder: ${rel}`);
    return full;
  }

  const source = {
    kind: 'disk',
    label: label || root,
    root,
    writable,
    async readBytes(rel) {
      try {
        const full = resolveInside(rel);
        // Links are followed only if their target is still inside the folder.
        const [realRoot, realFile] = await Promise.all([fs.realpath(root).catch(() => root), fs.realpath(full)]);
        if (realFile !== realRoot && !realFile.startsWith(realRoot + path.sep)) return null;
        const buf = await fs.readFile(realFile);
        return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      } catch (error) {
        if (error && (error.code === 'ENOENT' || error.code === 'EISDIR' || error.code === 'ENOTDIR')) return null;
        throw error;
      }
    },
    async readText(rel) {
      const bytes = await source.readBytes(rel);
      return bytes == null ? null : bytesToText(bytes);
    },
    async list(rel = '') {
      let entries;
      try {
        entries = await fs.readdir(resolveInside(rel), { withFileTypes: true });
      } catch (error) {
        if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) return [];
        throw error;
      }
      return entries
        .filter((e) => !e.name.startsWith('.') && (e.isDirectory() || e.isFile()))
        .map((e) => ({ name: e.name, kind: e.isDirectory() ? 'dir' : 'file' }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  };

  if (writable) {
    source.write = async (rel, data) => {
      const full = resolveInside(rel);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, toBytes(data));
    };
    source.append = async (rel, text) => {
      const full = resolveInside(rel);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.appendFile(full, toBytes(text));
    };
  }
  return source;
}
