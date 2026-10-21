#!/usr/bin/env node
// Local Program: shows the page and lets it read the missions folder on this computer.
// Read-only, listens only on 127.0.0.1, GET/HEAD only, never leaves its folders.
//   node tools/server.mjs [--port 4317] [--workspace missions] [--open]
// spec.md > Local Program

import http from 'node:http';
import path from 'node:path';
import { promises as fs, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { safeRelPath } from '../app/engine/paths.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_INDEX_FILES = 5000;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jsonl': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.eml': 'text/plain; charset=utf-8',
};

function typeFor(file) {
  return TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function inside(root, rel) {
  const clean = safeRelPath(rel);
  if (clean.split('/').some((part) => part.startsWith('.'))) throw new Error('hidden path');
  const full = path.resolve(root, ...clean.split('/'));
  if (!full.startsWith(root + path.sep)) throw new Error('outside');
  return full;
}

async function listFiles(root) {
  const files = [];
  async function walk(dir, prefix) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') || files.length >= MAX_INDEX_FILES) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel);
      else if (entry.isFile()) files.push(rel);
    }
  }
  await walk(root, '');
  return files.sort();
}

// Only requests addressed to this computer: a web page elsewhere cannot point its own
// domain at 127.0.0.1 and read the missions folder through this program (DNS rebinding).
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]']);
export function isLocalHost(hostHeader) {
  const host = String(hostHeader || '').trim().toLowerCase().replace(/:\d+$/, '');
  return LOCAL_HOSTS.has(host);
}

// The real file (links followed) must still be inside its folder.
async function realInside(root, file) {
  const [realRoot, realFile] = await Promise.all([fs.realpath(root).catch(() => root), fs.realpath(file)]);
  return realFile === realRoot || realFile.startsWith(realRoot + path.sep) ? realFile : null;
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers,
  });
  res.end(body);
}

export function createServer({ workspace = path.join(ROOT, 'missions'), appRoot = ROOT } = {}) {
  const workspaceRoot = path.resolve(workspace);
  const siteRoot = path.resolve(appRoot);
  return http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'read-only', { Allow: 'GET, HEAD' });
      if (!isLocalHost(req.headers.host)) return send(res, 403, 'forbidden host');
      const url = new URL(req.url, 'http://127.0.0.1');
      let pathname;
      try {
        pathname = decodeURIComponent(url.pathname);
      } catch {
        return send(res, 400, 'bad path');
      }
      if (pathname === '/workspace/index.json') {
        const files = await listFiles(workspaceRoot);
        const body = JSON.stringify({ workspace: path.basename(workspaceRoot), files });
        return send(res, 200, req.method === 'HEAD' ? undefined : body, { 'Content-Type': TYPES['.json'] });
      }
      let file;
      try {
        if (pathname.startsWith('/workspace/')) file = inside(workspaceRoot, pathname.slice('/workspace/'.length));
        else if (pathname === '/' || pathname === '') file = path.join(siteRoot, 'index.html');
        else if (pathname === '/app' || pathname === '/app/') file = path.join(siteRoot, 'app', 'index.html');
        else if (pathname.startsWith('/app/') || pathname.startsWith('/devpost/') || pathname === '/index.html') {
          file = inside(siteRoot, pathname.slice(1));
        } else return send(res, 404, 'not found');
      } catch {
        return send(res, 403, 'forbidden');
      }
      let data;
      try {
        const stat = await fs.stat(file);
        if (stat.isDirectory()) file = path.join(file, 'index.html');
        const real = await realInside(pathname.startsWith('/workspace/') ? workspaceRoot : siteRoot, file);
        if (!real) return send(res, 403, 'forbidden');
        data = await fs.readFile(real);
      } catch {
        return send(res, 404, 'not found');
      }
      return send(res, 200, req.method === 'HEAD' ? undefined : data, { 'Content-Type': typeFor(file) });
    } catch (error) {
      return send(res, 500, 'error');
    }
  });
}

function parseArgs(argv) {
  const args = { port: 4317, workspace: path.join(ROOT, 'missions'), open: false, ownWorkspace: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--port') args.port = Number(argv[(i += 1)]);
    else if (argv[i] === '--workspace') {
      args.workspace = argv[(i += 1)];
      args.ownWorkspace = true;
    }
    else if (argv[i] === '--open') args.open = true;
  }
  return args;
}

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    const child = spawn(command, args, { stdio: 'ignore', detached: true });
    child.on('error', () => {}); // no browser opener on this system: the address is printed anyway
    child.unref();
  } catch {
    // opening the browser is a convenience only
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
async function main() {
  const args = parseArgs(process.argv.slice(2));
  // First start with the default folder: put the sample missions there, so the page has something to show.
  if (!args.ownWorkspace && !existsSync(args.workspace)) {
    const { demoReset } = await import('./mission-rescue.mjs');
    await demoReset(args.workspace);
    console.log(`Sample missions written to ${args.workspace}`);
  }
  const server = createServer({ workspace: args.workspace });
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${args.port} is busy. Start with another port, for example: node tools/server.mjs --port ${args.port + 1}`);
      console.error(`Port ${args.port} jest zajęty. Uruchom na innym, np.: node tools/server.mjs --port ${args.port + 1}`);
    } else {
      console.error(error.message);
    }
    process.exitCode = 1;
  });
  server.listen(args.port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${args.port}/app/`;
    console.log(`Mission Rescue: ${url}`);
    console.log(`Missions folder (read-only): ${path.resolve(args.workspace)}`);
    console.log('Stop: Ctrl+C');
    if (args.open) openBrowser(url);
  });
}

if (isMain) main();
