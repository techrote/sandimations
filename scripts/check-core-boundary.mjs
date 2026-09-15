import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const coreRoot = new URL('../src/core/', import.meta.url);
const forbidden = [
  ['DOM document', /\bdocument\b/],
  ['DOM window', /\bwindow\b/],
  ['animation frame', /\brequestAnimationFrame\b|\bcancelAnimationFrame\b/],
  ['hidden randomness', /\bMath\.random\s*\(/],
  ['wall clock', /\bDate\.now\s*\(|\bperformance\.now\s*\(/],
  ['timer scheduling', /\bsetTimeout\s*\(|\bsetInterval\s*\(/],
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

const rootPath = fileURLToPath(coreRoot);
await stat(rootPath);
const files = await collectFiles(rootPath);
const violations = [];

for (const file of files) {
  const source = await readFile(file, 'utf8');

  for (const [label, pattern] of forbidden) {
    if (pattern.test(source)) {
      violations.push(`${relative(rootPath, file)}: ${label}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Deterministic-core boundary violations detected:');
  for (const violation of violations) console.error(`- ${violation}`);
  process.exitCode = 1;
} else {
  console.log(
    `Core boundary check passed (${files.length} TypeScript file${files.length === 1 ? '' : 's'}).`,
  );
}
