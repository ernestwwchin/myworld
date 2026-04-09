const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const repoRoot = path.resolve(__dirname, '../../..');

function repoPath(...segments) {
  return path.join(repoRoot, ...segments);
}

function readText(relPath) {
  return fs.readFileSync(repoPath(relPath), 'utf8');
}

function loadYaml(relPath) {
  return yaml.load(readText(relPath));
}

function exists(relPath) {
  return fs.existsSync(repoPath(relPath));
}

function loadCoreTestMeta() {
  return loadYaml('data/00_core_test/meta.yaml');
}

module.exports = {
  repoRoot,
  repoPath,
  readText,
  loadYaml,
  exists,
  loadCoreTestMeta,
};
