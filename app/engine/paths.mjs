// Safe relative paths inside a source (a mission folder or a workspace).
// Every path the engine reads or writes goes through safeRelPath, so a mission
// file can never point outside its own folder.

export class PathError extends Error {
  constructor(message, path) {
    super(message);
    this.name = 'PathError';
    this.path = path;
  }
}

export function safeRelPath(path) {
  if (typeof path !== 'string') throw new PathError('path must be text', path);
  const unified = path.replace(/\\/g, '/').trim();
  if (!unified) throw new PathError('path is empty', path);
  if (unified.startsWith('/') || /^[a-zA-Z]:/.test(unified)) {
    throw new PathError('absolute paths are not allowed', path);
  }
  const parts = [];
  for (const segment of unified.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') throw new PathError('path leaves the folder', path);
    parts.push(segment);
  }
  if (!parts.length) throw new PathError('path is empty', path);
  return parts.join('/');
}

export function isSafeRelPath(path) {
  try {
    safeRelPath(path);
    return true;
  } catch {
    return false;
  }
}

export function joinRel(dir, path) {
  const rel = safeRelPath(path);
  if (!dir) return rel;
  return `${safeRelPath(dir)}/${rel}`;
}

// A view of a source rooted at one of its folders.
export function subSource(source, dir) {
  if (!dir || dir === '.') return source;
  const base = safeRelPath(dir);
  const view = {
    kind: source.kind,
    label: `${source.label}/${base}`,
    writable: Boolean(source.writable),
    readBytes: (path) => source.readBytes(joinRel(base, path)),
    readText: (path) => source.readText(joinRel(base, path)),
    list: (path = '') => source.list(path ? joinRel(base, path) : base),
  };
  if (source.writable) {
    view.write = (path, data) => source.write(joinRel(base, path), data);
    view.append = (path, text) => source.append(joinRel(base, path), text);
  }
  return view;
}
