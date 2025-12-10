#!/usr/bin/env node
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

async function getJsFiles(dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (e) => {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return getJsFiles(full);
    if (e.isFile() && /\.(js|jsx|ts|tsx)$/.test(e.name)) return [full];
    return [];
  }));
  return files.flat();
}

async function updateImports() {
  const root = path.resolve(__dirname, '..');
  const srcDir = path.join(root, 'src');

  const files = await getJsFiles(srcDir);
  const importRegex = /(\bimport\b[^;]*?\bfrom\s*)(["'])(\.\/assets\/[^"]+?)(\.png)(\2)/gmi;

  let changedFiles = 0;

  for (const file of files) {
    let content = await fsp.readFile(file, 'utf8');
    let changed = false;
    content = content.replace(importRegex, (match, p1, quote, relNoExt, ext, q2) => {
      // Resolve the potential .webp file path relative to the file
      const absWebp = path.resolve(path.dirname(file), relNoExt + '.webp');
      if (fs.existsSync(absWebp)) {
        changed = true;
        return `${p1}${quote}${relNoExt}.webp${q2}`;
      }
      return match;
    });

    if (changed) {
      await fsp.writeFile(file, content, 'utf8');
      changedFiles++;
      console.log(`Updated imports in: ${path.relative(root, file)}`);
    }
  }

  console.log(`Done. Updated ${changedFiles} file(s).`);
}

updateImports().catch((err) => {
  console.error(err);
  process.exit(1);
});
