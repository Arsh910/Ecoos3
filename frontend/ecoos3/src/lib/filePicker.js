import { hasOpenPicker, hasDirectoryPicker } from './capabilities';

export async function pickFiles({ multiple = false } = {}) {
  if (!hasOpenPicker) return [];
  try {
    return await window.showOpenFilePicker({ multiple });
  } catch (err) {
    if (err.name === 'AbortError') return [];
    throw err;
  }
}

// Asking for readwrite up front is what makes one gesture cover the whole batch:
// files created inside the folder inherit the grant, so createWritable never re-prompts.
export async function pickDirectory() {
  if (!hasDirectoryPicker) return null;
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' });
  } catch (err) {
    if (err.name === 'AbortError') return null;
    throw err;
  }
}

const exists = async (dir, name) => {
  try {
    await dir.getFileHandle(name);
    return true;
  } catch {
    return false;
  }
};

// Never write over something already sitting in the folder the user picked.
export async function uniqueFileName(dir, name, taken) {
  const dot = name.lastIndexOf('.');
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : '';

  for (let i = 0; i < 100; i += 1) {
    const candidate = i === 0 ? name : `${stem} (${i})${ext}`;
    if (!taken.has(candidate) && !(await exists(dir, candidate))) return candidate;
  }
  return `${stem} (${Date.now()})${ext}`;
}

export async function ensureReadPermission(handle) {
  const opts = { mode: 'read' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

export const isHandle = (source) => source != null && typeof source.getFile === 'function';
