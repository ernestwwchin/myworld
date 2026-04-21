import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

export function repoPath(...segments: string[]): string {
  const rel = path.join(...segments);
  // data/ was moved to public/data/ during TS migration
  if (rel.startsWith('data' + path.sep) || rel.startsWith('data/')) {
    return path.join(repoRoot, 'public', rel);
  }
  return path.join(repoRoot, rel);
}

export function loadYaml(relPath: string): unknown {
  return yaml.load(fs.readFileSync(repoPath(relPath), 'utf8'));
}

export function exists(relPath: string): boolean {
  return fs.existsSync(repoPath(relPath));
}

export function loadCoreTestMeta() {
  return loadYaml('data/00_core_test/meta.yaml');
}
