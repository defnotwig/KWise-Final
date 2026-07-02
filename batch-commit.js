const { spawnSync } = require('child_process');

function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(`Error running git ${args.join(' ')}:`, result.stderr);
    return false;
  }
  return result.stdout;
}

// Get status
const statusOut = runGit(['status', '--porcelain']);
if (!statusOut) {
  console.error("No git changes found or not a git repo.");
  process.exit(1);
}

const lines = statusOut.split('\n').map(l => l.trim()).filter(Boolean);
if (lines.length === 0) {
  console.log("No uncommitted changes to commit.");
  process.exit(0);
}

console.log(`Found ${lines.length} changed files.`);

// Parse changes
const changes = lines.map(line => {
  const status = line.slice(0, 2).trim();
  const file = line.slice(2).trim().replace(/^"|"$/g, '');
  return { status, file };
});

const TARGET_COMMITS = 85;
const batchCount = Math.min(TARGET_COMMITS, changes.length);
// Using floating point division to distribute files evenly
const batchSize = changes.length / batchCount;

console.log(`Grouping into ${batchCount} batches (approx size ${batchSize.toFixed(2)} files each)...`);

for (let i = 0; i < batchCount; i++) {
  const start = Math.floor(i * batchSize);
  const end = Math.floor((i + 1) * batchSize);
  if (start >= changes.length) break;
  
  const batch = changes.slice(start, end);
  if (batch.length === 0) continue;
  
  const filesToStage = batch.map(c => c.file);
  
  // Add files
  runGit(['add', ...filesToStage]);
  
  // Determine message
  const msg = getSemanticBatchMessage(batch, i + 1, batchCount);
  console.log(`[Batch ${i + 1}/${batchCount}] Committing ${filesToStage.length} files...`);
  console.log(`  Message: ${msg}`);
  
  const commitResult = runGit(['commit', '-m', msg]);
  if (!commitResult) {
    console.error(`Failed to commit batch ${i + 1}`);
  }
}

function getSemanticBatchMessage(batch, index, total) {
  const files = batch.map(b => b.file);
  const statuses = batch.map(b => b.status);
  
  const isKiosk = files.some(f => f.includes('K-Wise'));
  const isBackend = files.some(f => f.includes('KWise-Backend'));
  
  let scope = 'mono';
  if (isKiosk && isBackend) scope = 'mono';
  else if (isKiosk) scope = 'kiosk';
  else if (isBackend) scope = 'backend';
  
  let type = 'chore';
  if (statuses.every(s => s === 'D')) {
    type = 'chore';
  } else if (files.some(f => f.includes('test') || f.includes('spec'))) {
    type = 'test';
  } else if (files.some(f => f.includes('middleware/'))) {
    type = 'sec';
  } else if (files.some(f => f.includes('services/'))) {
    type = 'feat';
  } else if (files.some(f => f.includes('utils/') || f.includes('scripts/'))) {
    type = 'refactor';
  }
  
  const firstFile = files[0];
  const parts = firstFile.split('/');
  const filename = parts[parts.length - 1];
  
  let desc = `batch update including ${filename}`;
  if (statuses.every(s => s === 'D')) {
    desc = `clean up deprecated files including ${filename}`;
  } else if (type === 'test') {
    desc = `enhance test suite coverage including ${filename}`;
  } else if (type === 'refactor') {
    desc = `refactor utilities including ${filename}`;
  } else if (type === 'feat') {
    desc = `integrate feature changes including ${filename}`;
  }
  
  return `${type}(${scope}): ${desc} (${index}/${total})`;
}
